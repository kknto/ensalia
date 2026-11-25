import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { muestraSchema, validateRanges } from "@/lib/validation";
import { serialize } from "@/lib/serialize";
import { errorResponse, parseJson } from "@/lib/api";

const include = {
  especimenes: { orderBy: { numero: "asc" as const } },
  creador: true,
  revisor: true,
  cerrador: true,
  auditorias: { orderBy: { creadoEn: "desc" as const }, include: { operador: true } },
  asignacionesEquipo: { where: { estado: "ASIGNADA" as const }, include: { equipo: { include: { tipo: true } }, especimen: true } },
  colado: { select: { estado: true, esSintetico: true } },
};
type Context = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const sample = await prisma.muestra.findUnique({ where: { id }, include });
    return sample ? Response.json(serialize(sample)) : Response.json({ error: "Muestra no encontrada" }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}

function comparable(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_, item) => item?.constructor?.name === "Decimal" ? Number(item) : item));
}

function buildDiff(current: Record<string, unknown>, next: Record<string, unknown>) {
  const ignored = new Set(["id", "idMuestra", "creadoEn", "actualizadoEn", "creadorId", "revisorId", "cerradorId", "revisadoEn", "cerradoEn", "creador", "revisor", "cerrador", "auditorias", "asignacionesEquipo"]);
  return Object.fromEntries(Object.keys(next).filter((key) => !ignored.has(key)).flatMap((key) => {
    const before = comparable(current[key]); const after = comparable(next[key]);
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [[key, { antes: before, despues: after }]];
  }));
}

export async function PATCH(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  const parsed = muestraSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const errors = validateRanges(parsed.data); if (errors.length) return Response.json({ error: errors.join(" ") }, { status: 400 });
  const d = parsed.data; const { especimenes, ...sampleData } = d;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.muestra.findUnique({ where: { id }, include });
      if (!current) return { status: 404 as const, error: "Muestra no encontrada" };
      if (current.colado && current.colado.estado !== "ABIERTO") return { status: 409 as const, error: "El colado está cerrado o anulado y sus muestras ya no pueden modificarse." };
      if (current.estatusBitacora === "CERRADA" || current.estatusBitacora === "ANULADA") return { status: 409 as const, error: "Una muestra cerrada o anulada no puede editarse." };
      if (current.asignacionesEquipo.length) return { status: 409 as const, error: "Devuelva los equipos asignados antes de editar la muestra." };
      const currentSpecimenIds = new Set(current.especimenes.map((item) => item.id));
      const incomingIds = new Set(especimenes.flatMap((item) => item.id ? [item.id] : []));
      if ([...incomingIds].some((specimenId) => !currentSpecimenIds.has(specimenId))) return { status: 400 as const, error: "Uno de los especímenes no pertenece a esta muestra." };
      const removedIds = [...currentSpecimenIds].filter((specimenId) => !incomingIds.has(specimenId));
      if (removedIds.length) {
        const historicalAssignments = await tx.asignacionEquipo.count({ where: { especimenId: { in: removedIds } } });
        if (historicalAssignments) return { status: 409 as const, error: "No se puede eliminar un espécimen con historial de moldes. Registre la incidencia sin borrar su identidad." };
      }
      const changed = await tx.muestra.updateMany({ where: { id, estatusBitacora: current.estatusBitacora, version: current.version }, data: {
        ...sampleData, fechaMuestreo: new Date(d.fechaMuestreo), salidaPlanta: d.salidaPlanta ? new Date(d.salidaPlanta) : null,
        llegadaObra: d.llegadaObra ? new Date(d.llegadaObra) : null, inicioDescarga: d.inicioDescarga ? new Date(d.inicioDescarga) : null,
        finDescarga: d.finDescarga ? new Date(d.finDescarga) : null,
        elaboracionMuestra: d.elaboracionMuestra ? new Date(d.elaboracionMuestra) : null,
        version: { increment: 1 },
        ...(current.estatusBitacora === "REVISADA" ? { estatusBitacora: "BORRADOR", revisadoEn: null, revisorId: null } : {}),
      } });
      if (changed.count !== 1) return { status: 409 as const, error: "La muestra cambió mientras se editaba. Recargue e intente de nuevo." };
      // Libera temporalmente los ordinales para permitir reordenar sin destruir
      // las identidades que después usarán inventario, custodia y etiquetas QR.
      for (const [index, specimenId] of [...incomingIds].entries()) {
        await tx.especimen.update({ where: { id: specimenId }, data: { numero: -(index + 1) } });
      }
      if (removedIds.length) await tx.especimen.deleteMany({ where: { id: { in: removedIds }, muestraId: id } });
      for (const specimen of especimenes) {
        const { id: specimenId, ...values } = specimen;
        const data = { ...values, fechaEnsaye: values.fechaEnsaye ? new Date(values.fechaEnsaye) : null };
        if (specimenId) await tx.especimen.update({ where: { id: specimenId }, data });
        else await tx.especimen.create({ data: { ...data, muestraId: id } });
      }
      const row = await tx.muestra.findUniqueOrThrow({ where: { id }, include });
      await tx.auditoria.create({ data: {
        muestraId: id, operadorId: operator.id, accion: current.estatusBitacora === "REVISADA" ? "EDITADA_Y_REABIERTA" : "EDITADA",
        estadoAntes: current.estatusBitacora, estadoDespues: row.estatusBitacora,
        motivo: current.estatusBitacora === "REVISADA" ? "La edición invalidó la revisión anterior." : null,
        cambiosJson: buildDiff(current as unknown as Record<string, unknown>, row as unknown as Record<string, unknown>) as Prisma.InputJsonValue,
      } });
      return { status: 200 as const, row };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(serialize(result.row));
  } catch (error) { return errorResponse(error); }
}
