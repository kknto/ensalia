import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { muestraSchema, validateRanges } from "@/lib/validation";
import { serialize } from "@/lib/serialize";
import { errorResponse, parseJson, sampleFilters } from "@/lib/api";
import { resolveActiveProfile, configurationSnapshot } from "@/lib/config/service";
import { profileConfigurationSchema } from "@/lib/config/schema";
import { Prisma } from "@prisma/client";
import { nextSampleFolio, validateSpecimenRules } from "@/lib/config/operational";
import { createSyntheticColado } from "@/lib/colados";

const include = { especimenes: { orderBy: { numero: "asc" as const } }, creador: true, revisor: true, cerrador: true };

export async function GET(request: NextRequest) {
  const where = sampleFilters(new URL(request.url));
  if ("error" in where) return Response.json({ error: where.error }, { status: 400 });
  try {
    const rows = await prisma.muestra.findMany({ where, include, orderBy: { fechaMuestreo: "desc" }, take: 500 });
    return Response.json(serialize(rows));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();
  const parsed = muestraSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const rangeErrors = validateRanges(parsed.data);
  if (rangeErrors.length) return Response.json({ error: rangeErrors.join(" ") }, { status: 400 });
  const data = parsed.data;
  const { especimenes, ...sampleData } = data;
  try {
    const profile = await resolveActiveProfile(operator);
    const profileVersion = profile.versionPublicada;
    if (!profileVersion) return Response.json({ error: "No existe una configuracion publicada." }, { status: 409 });
    const configuration = profileConfigurationSchema.parse(profileVersion.configuracionJson);
    if (!configuration.modulos.captura) return Response.json({ error: "El modulo de captura esta deshabilitado en el perfil activo." }, { status: 403 });
    const disallowedSpecimen = validateSpecimenRules(configuration, especimenes);
    if (disallowedSpecimen) return Response.json({ error: `El tipo de especimen ${disallowedSpecimen} no esta habilitado en el perfil activo.` }, { status: 400 });
    const sample = await prisma.$transaction(async (tx) => {
    const idMuestra = await nextSampleFolio(tx, profile.id, configuration.operacion.formatoFolio);
    const snapshot = configurationSnapshot(configuration) as Prisma.InputJsonValue;
    const colado = await createSyntheticColado(tx, data, operator.id, { id: profile.id, versionId: profileVersion.id, snapshot });
    const created = await tx.muestra.create({ data: {
      ...sampleData, fechaMuestreo: new Date(data.fechaMuestreo),
      salidaPlanta: data.salidaPlanta ? new Date(data.salidaPlanta) : null,
      llegadaObra: data.llegadaObra ? new Date(data.llegadaObra) : null,
      inicioDescarga: data.inicioDescarga ? new Date(data.inicioDescarga) : null,
      finDescarga: data.finDescarga ? new Date(data.finDescarga) : null,
      elaboracionMuestra: data.elaboracionMuestra ? new Date(data.elaboracionMuestra) : null,
      idMuestra,
      coladoId: colado.id, numeroDentroColado: 1,
      creadorId: operator.id, perfilClienteId: profile.id, versionPerfilId: profileVersion.id,
      configuracionSnapshotJson: snapshot,
      especimenes: { create: especimenes.map(({ id: _id, ...e }) => ({ ...e, fechaEnsaye: e.fechaEnsaye ? new Date(e.fechaEnsaye) : null })) },
    }, include });
    await tx.auditoria.create({ data: { muestraId: created.id, coladoId: colado.id, operadorId: operator.id, accion: "CREADA", estadoDespues: "BORRADOR", cambiosJson: { coladoFolio: colado.folio, numeroDentroColado: 1, origen: "API_MUESTRAS_LEGACY" } } });
    return created;
  });
    return Response.json(serialize(sample), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
