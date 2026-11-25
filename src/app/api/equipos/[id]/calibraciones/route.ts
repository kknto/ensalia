import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { calibracionEquipoSchema } from "@/lib/validation";
import { disabledModuleResponse } from "@/lib/config/modules";

type Context = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    return Response.json(
      await prisma.calibracionEquipo.findMany({
        where: { equipoId: id },
        include: { registradoPor: true, documento: true },
        orderBy: { fechaCalibracion: "desc" },
      })
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("inventario"); if (disabled) return disabled;
  const parsed = calibracionEquipoSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await tx.equipo.findUnique({ where: { id }, include: { tipo: true } });
      if (!equipo) return { status: 404 as const, error: "Equipo no encontrado" };
      if (equipo.estado === "ASIGNADO" || equipo.estado === "BAJA") return { status: 409 as const, error: "El equipo asignado o dado de baja no puede calibrarse." };
      const row = await tx.calibracionEquipo.create({ data: { equipoId: id, fechaCalibracion: new Date(parsed.data.fecha), vigenteHasta: parsed.data.venceEn ? new Date(parsed.data.venceEn) : null, resultado: parsed.data.resultado, certificado: parsed.data.certificado, proveedor: parsed.data.proveedor, observaciones: parsed.data.observaciones, registradoPorId: operator.id } });
      const nuevoEstado = parsed.data.resultado === "RECHAZADO" ? "FUERA_SERVICIO" : "DISPONIBLE";
      await tx.equipo.update({ where: { id }, data: { calibracionVigenteHasta: parsed.data.resultado === "APROBADO" ? row.vigenteHasta : null, estado: nuevoEstado, version: { increment: 1 } } });
      await tx.movimientoEquipo.create({ data: { equipoId: id, operadorId: operator.id, tipo: "CALIBRACION", estadoAntes: equipo.estado, estadoDespues: nuevoEstado, detalleJson: { calibracionId: row.id, resultado: row.resultado, vigenteHasta: row.vigenteHasta?.toISOString() ?? null, certificado: row.certificado } } });
      return { status: 201 as const, row };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.row, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
