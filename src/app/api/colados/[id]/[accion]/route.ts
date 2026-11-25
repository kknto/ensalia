import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { coladoInclude } from "@/lib/colados";

type Context = { params: Promise<{ id: string; accion: string }> };
const bodySchema = z.object({ version: z.number().int().min(0), motivo: z.string().trim().max(1000).optional() });

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id, accion } = await context.params;
  if (accion !== "cerrar" && accion !== "anular") return Response.json({ error: "Acción no válida" }, { status: 400 });
  const parsed = bodySchema.safeParse(await parseJson(request) ?? {});
  if (!parsed.success || (accion === "anular" && !parsed.data.motivo)) return Response.json({ error: accion === "anular" ? "El motivo es obligatorio." : "Datos inválidos", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.colado.findUnique({ where: { id }, include: { muestras: { select: { estatusBitacora: true } } } });
      if (!current) return { status: 404 as const, error: "Colado no encontrado" };
      if (current.estado !== "ABIERTO") return { status: 409 as const, error: "El colado ya no está abierto." };
      if (accion === "cerrar" && (current.muestras.length !== current.numeroTomas || current.muestras.some((m) => !["CERRADA", "ANULADA"].includes(m.estatusBitacora)))) return { status: 409 as const, error: "Para cerrar, todas las tomas planificadas deben existir y sus muestras estar cerradas o anuladas." };
      if (accion === "anular" && current.muestras.some((m) => m.estatusBitacora !== "ANULADA")) return { status: 409 as const, error: "Anule primero todas las muestras vinculadas." };
      const next = accion === "cerrar" ? "CERRADO" : "ANULADO";
      const changed = await tx.colado.updateMany({ where: { id, version: parsed.data.version, estado: "ABIERTO" }, data: { estado: next, version: { increment: 1 }, ...(next === "CERRADO" ? { cerradoEn: new Date() } : { anuladoEn: new Date() }) } });
      if (changed.count !== 1) return { status: 409 as const, error: "El colado cambió. Recargue e intente nuevamente." };
      await tx.auditoria.create({ data: { coladoId: id, operadorId: operator.id, accion: next === "CERRADO" ? "COLADO_CERRADO" : "COLADO_ANULADO", estadoAntes: "ABIERTO", estadoDespues: next, motivo: parsed.data.motivo } });
      return { status: 200 as const, row: await tx.colado.findUniqueOrThrow({ where: { id }, include: coladoInclude }) };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.row);
  } catch (error) { return errorResponse(error); }
}
