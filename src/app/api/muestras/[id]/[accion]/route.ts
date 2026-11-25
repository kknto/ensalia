import { NextRequest } from "next/server";
import { EstadoBitacora, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { transitionBodySchema } from "@/lib/validation";
import { errorResponse, parseJson } from "@/lib/api";
import { equipmentRuleError, readProfileConfiguration, validateConfiguredFields } from "@/lib/config/operational";

type Context = { params: Promise<{ id: string; accion: string }> };
const transitions: Record<string, { from: EstadoBitacora[]; to: EstadoBitacora; action: string }> = {
  revisar: { from: ["BORRADOR"], to: "REVISADA", action: "REVISADA" },
  cerrar: { from: ["REVISADA"], to: "CERRADA", action: "CERRADA" },
  anular: { from: ["BORRADOR", "REVISADA"], to: "ANULADA", action: "ANULADA" },
};

const requiredEquipmentFlags: [keyof Pick<import("@prisma/client").Muestra, "placaRevenimiento" | "conoRevenimiento" | "varilla" | "cucharon" | "termometro" | "carretilla" | "equipoContenidoAire">, string][] = [
  ["placaRevenimiento", "PLACA_REVENIMIENTO"], ["conoRevenimiento", "CONO_REVENIMIENTO"], ["varilla", "VARILLA"],
  ["cucharon", "CUCHARON"], ["termometro", "TERMOMETRO"], ["carretilla", "CARRETILLA"], ["equipoContenidoAire", "EQUIPO_AIRE"],
];

async function reviewInventory(tx: Prisma.TransactionClient, muestraId: string) {
  const muestra = await tx.muestra.findUniqueOrThrow({ where: { id: muestraId }, include: { versionPerfil: true, especimenes: true, asignacionesEquipo: { where: { estado: "ASIGNADA" }, include: { equipo: { include: { tipo: true } }, especimen: true } } } });
  const now = new Date();
  if (muestra.inventarioGestionado) {
  const invalid = muestra.asignacionesEquipo.find((a) => a.equipo.estado !== "ASIGNADO" || !a.equipo.tipo.activo || (a.equipo.tipo.requiereCalibracion && (!a.equipo.calibracionVigenteHasta || a.equipo.calibracionVigenteHasta < now)));
  if (invalid) return `El equipo ${invalid.equipo.codigoInterno} no está disponible operativamente o tiene calibración vencida.`;
  const mandatoryTypes = await tx.tipoEquipo.findMany({ where: { activo: true, obligatorioEnMuestra: true } });
  const missingMandatory = mandatoryTypes.find((tipo) => !muestra.asignacionesEquipo.some((a) => a.equipo.tipoId === tipo.id));
  if (missingMandatory) return `Falta asignar un equipo obligatorio: ${missingMandatory.nombre}.`;
  for (const [flag, code] of requiredEquipmentFlags) if (muestra[flag] && !muestra.asignacionesEquipo.some((a) => a.equipo.tipo.codigo === code)) return `Falta asignar el equipo requerido: ${code}.`;
  for (const specimen of muestra.especimenes) {
    const mold = muestra.asignacionesEquipo.find((a) => a.especimenId === specimen.id && a.equipo.tipo.esMolde);
    if (!mold) return `Falta asignar un molde al espécimen ${specimen.numero}.`;
  }
  }
  const configuration = readProfileConfiguration(muestra.configuracionSnapshotJson) ?? readProfileConfiguration(muestra.versionPerfil?.configuracionJson);
  if (configuration) {
    const missingFields = validateConfiguredFields(configuration, muestra as unknown as Record<string, unknown>);
    if (missingFields.length) return `Faltan campos obligatorios del perfil: ${missingFields.join(", ")}.`;
    const ruleError = equipmentRuleError(configuration, muestra.asignacionesEquipo.map((assignment) => ({
      tipoCodigo: assignment.equipo.tipo.codigo,
      especimenId: assignment.especimenId,
      calibracionValida: !assignment.equipo.tipo.requiereCalibracion || Boolean(assignment.equipo.calibracionVigenteHasta && assignment.equipo.calibracionVigenteHasta >= now),
    })), muestra.especimenes.map((specimen) => ({ id: specimen.id, tipo: specimen.tipo })));
    if (ruleError) return ruleError;
  }
  return null;
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id, accion } = await context.params; const transition = transitions[accion];
  if (!transition) return Response.json({ error: "Acción no válida" }, { status: 400 });
  const body = transitionBodySchema.safeParse(await parseJson(request) ?? {});
  if (!body.success) return Response.json({ error: "Datos inválidos", details: body.error.flatten() }, { status: 400 });
  if (accion === "anular" && !body.data.motivo) return Response.json({ error: "El motivo de anulación es obligatorio." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.muestra.findUnique({ where: { id }, include: { colado: { select: { estado: true, esSintetico: true } } } });
      if (!current) return { status: 404 as const, error: "Muestra no encontrada" };
      if (current.colado && current.colado.estado !== "ABIERTO") return { status: 409 as const, error: "El colado está cerrado o anulado y sus muestras ya no pueden cambiar de estado." };
      if (!transition.from.includes(current.estatusBitacora)) return { status: 409 as const, error: `No se puede ${accion} desde ${current.estatusBitacora}.` };
      if (accion === "anular" && await tx.asignacionEquipo.count({ where: { muestraId: id, estado: "ASIGNADA" } })) return { status: 409 as const, error: "Devuelva los equipos asignados antes de anular la muestra." };
      if (accion === "revisar") {
        const inventoryError = await reviewInventory(tx, id);
        if (inventoryError) return { status: 409 as const, error: inventoryError };
      }
      const changed = await tx.muestra.updateMany({ where: { id, estatusBitacora: current.estatusBitacora, version: current.version }, data: {
        estatusBitacora: transition.to,
        version: { increment: 1 },
        ...(transition.to === "REVISADA" ? { revisadoEn: new Date(), revisorId: operator.id } : {}),
        ...(transition.to === "CERRADA" ? { cerradoEn: new Date(), cerradorId: operator.id } : {}),
      } });
      if (changed.count !== 1) return { status: 409 as const, error: "La muestra cambió durante la operación. Recargue e intente de nuevo." };
      await tx.auditoria.create({ data: { muestraId: id, operadorId: operator.id, accion: transition.action, estadoAntes: current.estatusBitacora, estadoDespues: transition.to, motivo: body.data.motivo } });
      if (current.coladoId && current.colado?.esSintetico && (transition.to === "CERRADA" || transition.to === "ANULADA")) {
        await tx.colado.update({ where: { id: current.coladoId }, data: { estado: transition.to === "CERRADA" ? "CERRADO" : "ANULADO", version: { increment: 1 }, ...(transition.to === "CERRADA" ? { cerradoEn: new Date() } : { anuladoEn: new Date() }) } });
      }
      return { status: 200 as const, row: await tx.muestra.findUniqueOrThrow({ where: { id }, include: { especimenes: { orderBy: { numero: "asc" } }, creador: true, revisor: true, cerrador: true } }) };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(serialize(result.row));
  } catch (error) { return errorResponse(error); }
}
