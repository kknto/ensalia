import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { cambioEstadoEquipoSchema } from "@/lib/validation";
import { disabledModuleResponse } from "@/lib/config/modules";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("inventario"); if (disabled) return disabled;
  const parsed = cambioEstadoEquipoSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.equipo.findUnique({ where: { id } });
      if (!current) return { status: 404 as const, error: "Equipo no encontrado" };
      if (current.estado === "ASIGNADO") return { status: 409 as const, error: "Devuelva el equipo antes de cambiar su estado." };
      const changed = await tx.equipo.updateMany({ where: { id, version: parsed.data.version, estado: current.estado }, data: { estado: parsed.data.estado, version: { increment: 1 }, ...(parsed.data.estado === "BAJA" ? { fechaBaja: new Date(), motivoBaja: parsed.data.motivo } : {}) } });
      if (changed.count !== 1) return { status: 409 as const, error: "El equipo cambió. Recargue e intente nuevamente." };
      await tx.movimientoEquipo.create({ data: { equipoId: id, operadorId: operator.id, tipo: parsed.data.estado === "BAJA" ? "BAJA" : "CAMBIO_ESTADO", estadoAntes: current.estado, estadoDespues: parsed.data.estado, detalleJson: { motivo: parsed.data.motivo } } });
      return { status: 200 as const, row: await tx.equipo.findUniqueOrThrow({ where: { id }, include: { tipo: true } }) };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.row);
  } catch (error) { return errorResponse(error); }
}
