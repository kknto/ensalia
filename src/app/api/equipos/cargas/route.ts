import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { disabledModuleResponse } from "@/lib/config/modules";
import { errorResponse, parseJson } from "@/lib/api";
import { bulkInventorySchema, bulkInventoryHash, validateBulkInventory } from "@/lib/inventory/bulk";

class BulkValidationError extends Error {}

function response(row: { id: string; cantidadCreada: number; creadoEn: Date; estado: string; equipos: Array<{ id: string; codigoInterno: string; numeroSerie: string | null }> }) {
  return { lote: { id: row.id, cantidadCreada: row.cantidadCreada, creadoEn: row.creadoEn, estado: row.estado }, equipos: row.equipos, cantidadCreada: row.cantidadCreada };
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("inventario"); if (disabled) return disabled;
  const raw = await parseJson(request) as Record<string, unknown> | null;
  const headerKey = request.headers.get("x-idempotency-key")?.trim();
  const parsed = bulkInventorySchema.safeParse({ ...raw, idempotencyKey: raw?.idempotencyKey || headerKey });
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  if (headerKey && headerKey !== parsed.data.idempotencyKey) return Response.json({ error: "La clave de idempotencia no coincide." }, { status: 400 });
  try {
    const previous = await prisma.cargaInventario.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey }, include: { equipos: { select: { id: true, codigoInterno: true, numeroSerie: true } } } });
    if (previous) {
      if (previous.contenidoHash !== bulkInventoryHash(parsed.data)) return Response.json({ error: "La clave de idempotencia ya fue utilizada con otro contenido." }, { status: 409 });
      return Response.json(response(previous));
    }
    const created = await prisma.$transaction(async (tx) => {
      const validation = await validateBulkInventory(tx, parsed.data);
      if (!validation.valido) throw new BulkValidationError("Lote inválido");
      const batch = await tx.cargaInventario.create({ data: {
        idempotencyKey: parsed.data.idempotencyKey, operadorId: operator.id, tipoId: parsed.data.tipoId,
        metodo: parsed.data.metodo, estado: "PROCESANDO", cantidadSolicitada: parsed.data.items.length,
        contenidoHash: bulkInventoryHash(parsed.data), parametrosJson: { metodo: parsed.data.metodo } as Prisma.InputJsonValue,
      } });
      const equipments = [];
      for (const item of parsed.data.items) {
        const equipment = await tx.equipo.create({ data: { ...item, tipoId: parsed.data.tipoId, cargaInventarioId: batch.id }, select: { id: true, codigoInterno: true, numeroSerie: true } });
        await tx.movimientoEquipo.create({ data: { equipoId: equipment.id, cargaInventarioId: batch.id, operadorId: operator.id, tipo: "ALTA", estadoDespues: "DISPONIBLE", detalleJson: { codigoInterno: equipment.codigoInterno, numeroSerie: equipment.numeroSerie, origen: "CARGA_MASIVA", cargaInventarioId: batch.id } } });
        equipments.push(equipment);
      }
      const completed = await tx.cargaInventario.update({ where: { id: batch.id }, data: { estado: "COMPLETADA", cantidadCreada: equipments.length, completadoEn: new Date(), resultadoJson: { codigos: equipments.map((item) => item.codigoInterno) } }, include: { equipos: { select: { id: true, codigoInterno: true, numeroSerie: true } } } });
      await tx.auditoria.create({ data: { operadorId: operator.id, accion: "CARGA_MASIVA_INVENTARIO", cambiosJson: { cargaInventarioId: batch.id, tipoId: parsed.data.tipoId, cantidad: equipments.length, metodo: parsed.data.metodo, checksum: bulkInventoryHash(parsed.data) } } });
      return completed;
    });
    return Response.json(response(created), { status: 201 });
  } catch (error) {
    if (error instanceof BulkValidationError) {
      const validation = await validateBulkInventory(prisma, parsed.data);
      return Response.json({ error: "El lote contiene errores. No se creó ninguna unidad.", validacion: validation }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const previous = await prisma.cargaInventario.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey }, include: { equipos: { select: { id: true, codigoInterno: true, numeroSerie: true } } } });
      if (previous && previous.contenidoHash === bulkInventoryHash(parsed.data)) return Response.json(response(previous));
      return Response.json({ error: "Otro lote utilizó la misma clave o uno de los códigos ya existe." }, { status: 409 });
    }
    return errorResponse(error);
  }
}
