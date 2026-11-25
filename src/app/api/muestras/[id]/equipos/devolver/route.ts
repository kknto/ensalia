import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { devolverEquiposSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };
class InventoryConflict extends Error {}
export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = devolverEquiposSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const muestra = await tx.muestra.findUnique({ where: { id } });
      if (!muestra) return { status: 404 as const, error: "Muestra no encontrada" };
      if (muestra.version !== parsed.data.versionMuestra) return { status: 409 as const, error: "La muestra cambió. Recargue e intente nuevamente." };
      const rows = await tx.asignacionEquipo.findMany({ where: { id: { in: parsed.data.asignacionIds }, muestraId: id, estado: "ASIGNADA" }, include: { equipo: true } });
      if (rows.length !== new Set(parsed.data.asignacionIds).size) return { status: 409 as const, error: "Una o más asignaciones ya no están activas." };
      const now = new Date();
      for (const row of rows) {
        const changed = await tx.equipo.updateMany({ where: { id: row.equipoId, version: row.equipo.version, estado: "ASIGNADO" }, data: { estado: parsed.data.estadoFinal, version: { increment: 1 } } });
        if (changed.count !== 1) throw new InventoryConflict("Un equipo cambió durante la devolución.");
        await tx.asignacionEquipo.update({ where: { id: row.id }, data: { estado: "DEVUELTA", devueltoEn: now, devueltoPorId: operator.id, observacionesDevolucion: parsed.data.observaciones } });
        await tx.movimientoEquipo.create({ data: { equipoId: row.equipoId, muestraId: id, operadorId: operator.id, tipo: "DEVOLUCION", estadoAntes: "ASIGNADO", estadoDespues: parsed.data.estadoFinal, detalleJson: { asignacionId: row.id, observaciones: parsed.data.observaciones ?? null } } });
      }
      const changed = await tx.muestra.updateMany({ where: { id, version: parsed.data.versionMuestra }, data: { version: { increment: 1 } } });
      if (changed.count !== 1) throw new InventoryConflict("La muestra cambió durante la devolución.");
      await tx.auditoria.create({ data: { muestraId: id, operadorId: operator.id, accion: "EQUIPOS_DEVUELTOS", estadoAntes: muestra.estatusBitacora, estadoDespues: muestra.estatusBitacora, cambiosJson: { asignacionIds: parsed.data.asignacionIds, estadoFinal: parsed.data.estadoFinal } } });
      return { status: 200 as const, count: rows.length };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ devueltos: result.count });
  } catch (error) {
    if (error instanceof InventoryConflict) return Response.json({ error: error.message }, { status: 409 });
    return errorResponse(error);
  }
}
