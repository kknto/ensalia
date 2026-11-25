import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value || null);
export const bulkInventoryRowSchema = z.object({
  codigoInterno: z.string().trim().min(1).max(200)
    .regex(/^[A-Z0-9][A-Z0-9._/-]*$/i, "Use letras, numeros, punto, guion, diagonal o guion bajo.")
    .transform((value) => value.toUpperCase()),
  numeroSerie: nullableText(120),
  marca: nullableText(200),
  modelo: nullableText(200),
  descripcion: nullableText(2000),
  ubicacion: nullableText(200),
  notas: nullableText(2000),
});

export const bulkInventorySchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
  tipoId: z.string().cuid(),
  metodo: z.enum(["RANGO", "PEGADO", "CSV"]),
  items: z.array(bulkInventoryRowSchema).min(1).max(500),
});

export type BulkInventoryInput = z.infer<typeof bulkInventorySchema>;
export type BulkInventoryError = { fila: number; campo: string; mensaje: string };
type InventoryClient = Pick<Prisma.TransactionClient, "tipoEquipo" | "equipo">;

export function bulkInventoryHash(input: BulkInventoryInput) {
  return createHash("sha256").update(JSON.stringify({ tipoId: input.tipoId, metodo: input.metodo, items: input.items })).digest("hex");
}

export async function validateBulkInventory(client: InventoryClient, input: BulkInventoryInput) {
  const errors: BulkInventoryError[] = [];
  const type = await client.tipoEquipo.findFirst({ where: { id: input.tipoId, activo: true } });
  if (!type) return { valido: false, filas: input.items, errores: [{ fila: 0, campo: "tipoId", mensaje: "El tipo de equipo no existe o está inactivo." }], resumen: { total: input.items.length, validas: 0, errores: 1 }, checksum: bulkInventoryHash(input) };

  const seen = new Map<string, number>();
  input.items.forEach((item, index) => {
    const normalized = item.codigoInterno.toUpperCase();
    const previous = seen.get(normalized);
    if (previous != null) errors.push({ fila: index + 1, campo: "codigoInterno", mensaje: `El código se repite en la fila ${previous}.` });
    else seen.set(normalized, index + 1);
    if (type.requiereSerie && !item.numeroSerie) errors.push({ fila: index + 1, campo: "numeroSerie", mensaje: "Este tipo de equipo requiere serie del fabricante." });
  });

  const existing = await client.equipo.findMany({ select: { codigoInterno: true } });
  const existingCodes = new Set(existing.map((item) => item.codigoInterno.trim().toUpperCase()));
  input.items.forEach((item, index) => {
    if (existingCodes.has(item.codigoInterno.toUpperCase())) errors.push({ fila: index + 1, campo: "codigoInterno", mensaje: "El código ya existe en Inventario." });
  });

  const rowsWithErrors = new Set(errors.filter((item) => item.fila > 0).map((item) => item.fila));
  return {
    valido: errors.length === 0,
    filas: input.items,
    errores: errors,
    resumen: { total: input.items.length, validas: input.items.length - rowsWithErrors.size, errores: rowsWithErrors.size || errors.length },
    checksum: bulkInventoryHash(input),
    tipo: { id: type.id, codigo: type.codigo, nombre: type.nombre, requiereSerie: type.requiereSerie, requiereCalibracion: type.requiereCalibracion },
  };
}
