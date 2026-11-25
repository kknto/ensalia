import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { asignarEquiposSchema } from "@/lib/validation";
import { readProfileConfiguration } from "@/lib/config/operational";

type Context = { params: Promise<{ id: string }> };
const specimenTypeByEquipment: Record<string, string> = { MOLDE_CILINDRO_15X30: "CILINDRO_15X30", MOLDE_CILINDRO_10X20: "CILINDRO_10X20", MOLDE_VIGA_50X15X15: "VIGA_50X15X15" };
const flagByEquipment: Record<string, string> = { PLACA_REVENIMIENTO: "placaRevenimiento", CONO_REVENIMIENTO: "conoRevenimiento", VARILLA: "varilla", CUCHARON: "cucharon", TERMOMETRO: "termometro", CARRETILLA: "carretilla", EQUIPO_AIRE: "equipoContenidoAire", MOLDE_CILINDRO_15X30: "cilindro15x30", MOLDE_CILINDRO_10X20: "cilindro10x20", MOLDE_VIGA_50X15X15: "viga50x15x15" };
class InventoryConflict extends Error {}

export async function GET(_: NextRequest, context: Context) {
  const { id } = await context.params;
  try { return Response.json(await prisma.asignacionEquipo.findMany({ where: { muestraId: id }, include: { equipo: { include: { tipo: true } }, especimen: true, asignadoPor: true, devueltoPor: true }, orderBy: { asignadoEn: "desc" } })); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = asignarEquiposSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const muestra = await tx.muestra.findUnique({ where: { id }, include: { versionPerfil: true, especimenes: true, colado: { select: { estado: true } } } });
      if (!muestra) return { status: 404 as const, error: "Muestra no encontrada" };
      if (muestra.colado && muestra.colado.estado !== "ABIERTO") return { status: 409 as const, error: "El colado está cerrado o anulado; no se puede modificar su equipo." };
      const configuration = readProfileConfiguration(muestra.configuracionSnapshotJson) ?? readProfileConfiguration(muestra.versionPerfil?.configuracionJson);
      if (configuration && !configuration.modulos.inventario) return { status: 403 as const, error: "El modulo de inventario esta deshabilitado para esta muestra." };
      if (muestra.estatusBitacora !== "BORRADOR") return { status: 409 as const, error: "Sólo se asignan equipos a muestras en borrador." };
      if (muestra.version !== parsed.data.versionMuestra) return { status: 409 as const, error: "La muestra cambió. Recargue e intente nuevamente." };
      const equipos = await tx.equipo.findMany({ where: { id: { in: parsed.data.equipos.map((item) => item.equipoId) } }, include: { tipo: true } });
      if (equipos.length !== parsed.data.equipos.length) return { status: 404 as const, error: "Uno o más equipos no existen." };
      const now = new Date(); const specimenMap = new Map(muestra.especimenes.map((item) => [item.id, item]));
      for (const item of parsed.data.equipos) {
        const equipo = equipos.find((row) => row.id === item.equipoId)!;
        if (equipo.estado !== "DISPONIBLE" || !equipo.tipo.activo) return { status: 409 as const, error: `${equipo.codigoInterno} no está disponible.` };
        if (equipo.tipo.requiereCalibracion && (!equipo.calibracionVigenteHasta || equipo.calibracionVigenteHasta < now)) return { status: 409 as const, error: `${equipo.codigoInterno} no tiene calibración vigente.` };
        if (equipo.tipo.esMolde) {
          const specimen = item.especimenId ? specimenMap.get(item.especimenId) : undefined;
          if (!specimen) return { status: 400 as const, error: `El molde ${equipo.codigoInterno} requiere un espécimen de esta muestra.` };
          if (specimenTypeByEquipment[equipo.tipo.codigo] !== specimen.tipo) return { status: 409 as const, error: `El molde ${equipo.codigoInterno} no corresponde al tipo del espécimen.` };
        } else if (item.especimenId) return { status: 400 as const, error: `${equipo.codigoInterno} no es un molde y no debe vincularse a un espécimen.` };
      }
      const flagData: Record<string, boolean> = {};
      for (const item of parsed.data.equipos) {
        const equipo = equipos.find((row) => row.id === item.equipoId)!;
        const changed = await tx.equipo.updateMany({ where: { id: equipo.id, version: equipo.version, estado: "DISPONIBLE" }, data: { estado: "ASIGNADO", version: { increment: 1 } } });
        if (changed.count !== 1) throw new InventoryConflict(`${equipo.codigoInterno} fue asignado por otra operación.`);
        const assignment = await tx.asignacionEquipo.create({ data: { muestraId: id, equipoId: equipo.id, especimenId: item.especimenId, asignadoPorId: operator.id, observacionesEntrega: parsed.data.observaciones, tipoCodigoSnapshot: equipo.tipo.codigo, tipoNombreSnapshot: equipo.tipo.nombre, codigoInternoSnapshot: equipo.codigoInterno, numeroSerieSnapshot: equipo.numeroSerie } });
        await tx.movimientoEquipo.create({ data: { equipoId: equipo.id, muestraId: id, operadorId: operator.id, tipo: "ASIGNACION", estadoAntes: "DISPONIBLE", estadoDespues: "ASIGNADO", detalleJson: { asignacionId: assignment.id, idMuestra: muestra.idMuestra, tipo: equipo.tipo.codigo, codigoInterno: equipo.codigoInterno, numeroSerie: equipo.numeroSerie, especimenId: item.especimenId ?? null } } });
        if (flagByEquipment[equipo.tipo.codigo]) flagData[flagByEquipment[equipo.tipo.codigo]] = true;
      }
      const sampleChange = await tx.muestra.updateMany({ where: { id, version: parsed.data.versionMuestra, estatusBitacora: "BORRADOR" }, data: { ...flagData, inventarioGestionado: true, version: { increment: 1 } } });
      if (sampleChange.count !== 1) throw new InventoryConflict("La muestra cambió durante la asignación.");
      await tx.auditoria.create({ data: { muestraId: id, operadorId: operator.id, accion: "EQUIPOS_ASIGNADOS", estadoAntes: "BORRADOR", estadoDespues: "BORRADOR", cambiosJson: { equipos: equipos.map((e) => ({ id: e.id, codigoInterno: e.codigoInterno, numeroSerie: e.numeroSerie, tipo: e.tipo.codigo })) } } });
      return { status: 201 as const, rows: await tx.asignacionEquipo.findMany({ where: { muestraId: id, estado: "ASIGNADA" }, include: { equipo: { include: { tipo: true } }, especimen: true } }) };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ asignaciones: result.rows }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryConflict) return Response.json({ error: error.message }, { status: 409 });
    return errorResponse(error);
  }
}
