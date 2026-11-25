import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { vincularMuestraColadoSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };
class LinkConflict extends Error {}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = vincularMuestraColadoSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const row = await prisma.$transaction(async (tx) => {
      const target = await tx.colado.findUnique({ where: { id }, include: { muestras: { select: { numeroDentroColado: true } } } });
      if (!target) throw new LinkConflict("Colado no encontrado");
      if (target.estado !== "ABIERTO" || target.version !== parsed.data.versionColado) throw new LinkConflict("El colado cambió o ya no está abierto.");
      if (target.muestras.length >= target.numeroTomas) throw new LinkConflict("El colado ya tiene todas sus tomas planificadas.");
      const muestra = await tx.muestra.findUnique({ where: { id: parsed.data.muestraId }, include: { colado: { include: { _count: { select: { muestras: true } } } } } });
      if (!muestra) throw new LinkConflict("Muestra no encontrada");
      if (muestra.version !== parsed.data.versionMuestra || muestra.estatusBitacora !== "BORRADOR") throw new LinkConflict("La muestra cambió o ya no está en borrador.");
      if (!muestra.colado?.esSintetico || muestra.colado._count.muestras !== 1) throw new LinkConflict("Sólo pueden vincularse muestras procedentes de un colado sintético individual.");
      const numero = Math.max(0, ...target.muestras.map((m) => m.numeroDentroColado ?? 0)) + 1;
      const moved = await tx.muestra.updateMany({ where: { id: muestra.id, version: muestra.version, estatusBitacora: "BORRADOR" }, data: { coladoId: id, numeroDentroColado: numero, version: { increment: 1 } } });
      if (moved.count !== 1) throw new LinkConflict("La muestra cambió durante la vinculación.");
      const targetChanged = await tx.colado.updateMany({ where: { id, version: target.version, estado: "ABIERTO" }, data: { version: { increment: 1 } } });
      if (targetChanged.count !== 1) throw new LinkConflict("El colado cambió durante la vinculación.");
      await tx.colado.update({ where: { id: muestra.colado.id }, data: { estado: "ANULADO", anuladoEn: new Date(), version: { increment: 1 } } });
      await tx.auditoria.create({ data: { muestraId: muestra.id, coladoId: id, operadorId: operator.id, accion: "MUESTRA_VINCULADA_A_COLADO", estadoAntes: "BORRADOR", estadoDespues: "BORRADOR", cambiosJson: { coladoAnteriorId: muestra.colado.id, coladoNuevoId: id, numeroDentroColado: numero } } });
      return tx.muestra.findUniqueOrThrow({ where: { id: muestra.id }, include: { colado: true, especimenes: true } });
    });
    return Response.json(row);
  } catch (error) {
    if (error instanceof LinkConflict) return Response.json({ error: error.message }, { status: error.message.endsWith("no encontrado") ? 404 : 409 });
    return errorResponse(error);
  }
}
