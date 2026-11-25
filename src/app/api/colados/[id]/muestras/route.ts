import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { crearMuestrasColadoSchema } from "@/lib/validation";
import { nextSampleFolio } from "@/lib/config/operational";
import { profileConfigurationSchema } from "@/lib/config/schema";

type Context = { params: Promise<{ id: string }> };
class ColadoConflict extends Error {}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const exists = await prisma.colado.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return Response.json({ error: "Colado no encontrado" }, { status: 404 });
    const muestras = await prisma.muestra.findMany({
      where: { coladoId: id },
      include: { especimenes: { orderBy: { numero: "asc" } } },
      orderBy: [{ numeroDentroColado: "asc" }, { creadoEn: "asc" }],
    });
    return Response.json({ muestras });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = crearMuestrasColadoSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const rows = await prisma.$transaction(async (tx) => {
      const colado = await tx.colado.findUnique({ where: { id }, include: { muestras: { select: { numeroDentroColado: true } }, perfilCliente: { include: { versionPublicada: true } } } });
      if (!colado) throw new ColadoConflict("Colado no encontrado");
      if (colado.estado !== "ABIERTO") throw new ColadoConflict("Sólo se agregan muestras a un colado abierto.");
      if (parsed.data.versionColado != null && parsed.data.versionColado !== colado.version) throw new ColadoConflict("El colado cambió. Recargue e intente nuevamente.");
      if (colado.muestras.length + parsed.data.cantidad > colado.numeroTomas) throw new ColadoConflict("La cantidad excede el número de tomas planificadas.");
      if (!colado.perfilClienteId || !colado.versionPerfilId) throw new ColadoConflict("El colado no tiene una configuración operativa válida.");
      const configuration = profileConfigurationSchema.safeParse(colado.configuracionSnapshotJson);
      if (!configuration.success) throw new ColadoConflict("La configuración guardada del colado no es válida.");
      const start = Math.max(0, ...colado.muestras.map((m) => m.numeroDentroColado ?? 0)) + 1;
      const created = [];
      for (let index = 0; index < parsed.data.cantidad; index++) {
        const numero = start + index;
        const idMuestra = await nextSampleFolio(tx, colado.perfilClienteId, configuration.data.operacion.formatoFolio, colado.fechaColado);
        const specimenTarget = configuration.data.reglas.especimenesObjetivoPorMuestra;
        const row = await tx.muestra.create({ data: {
          idMuestra, coladoId: id, numeroDentroColado: numero, fechaMuestreo: colado.fechaColado,
          cliente: colado.cliente, obra: colado.obra, localizacion: colado.localizacion, procedencia: colado.procedencia,
          elemento: colado.elemento, volumenM3: colado.volumenM3, fcKgCm2: colado.fcKgCm2,
          tipoConcreto: colado.tipoConcreto || "Por definir", concretera: colado.concretera,
          tmaMm: colado.tmaMm, cemento: colado.cemento, observaciones: colado.observaciones,
          noMuestra: `${colado.folio}-${numero}`, creadorId: operator.id, perfilClienteId: colado.perfilClienteId,
          versionPerfilId: colado.versionPerfilId, configuracionSnapshotJson: colado.configuracionSnapshotJson as Prisma.InputJsonValue,
          numeroEspecimenes: specimenTarget,
          especimenes: { create: Array.from({ length: specimenTarget }, (_, specimenIndex) => ({ numero: specimenIndex + 1, tipo: "CILINDRO_15X30" as const })) },
        }, include: { especimenes: true } });
        await tx.auditoria.create({ data: { muestraId: row.id, coladoId: id, operadorId: operator.id, accion: "MUESTRA_CREADA_EN_COLADO", estadoDespues: "BORRADOR", cambiosJson: { coladoFolio: colado.folio, numeroDentroColado: numero } } });
        created.push(row);
      }
      const changed = await tx.colado.updateMany({ where: { id, version: colado.version, estado: "ABIERTO" }, data: { version: { increment: 1 } } });
      if (changed.count !== 1) throw new ColadoConflict("El colado cambió durante la creación de muestras.");
      await tx.auditoria.create({ data: { coladoId: id, operadorId: operator.id, accion: "MUESTRAS_AGREGADAS", estadoAntes: "ABIERTO", estadoDespues: "ABIERTO", cambiosJson: { cantidad: created.length, numeros: created.map((m) => m.numeroDentroColado) } } });
      return created;
    });
    return Response.json({ muestras: rows }, { status: 201 });
  } catch (error) {
    if (error instanceof ColadoConflict) return Response.json({ error: error.message }, { status: error.message === "Colado no encontrado" ? 404 : 409 });
    return errorResponse(error);
  }
}
