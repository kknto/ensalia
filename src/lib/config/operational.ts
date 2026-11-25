import { Prisma } from "@prisma/client";
import { profileConfigurationSchema, type ProfileConfiguration } from "./schema";

const KNOWN_FIELDS = new Set([
  "cliente", "obra", "localizacion", "procedencia", "elemento", "revenimientoCm", "fcKgCm2", "edadCilindro",
  "tipoConcreto", "concretera", "tmaMm", "cemento", "noMuestra", "remision", "camion", "volumenM3",
  "salidaPlanta", "llegadaObra", "inicioDescarga", "finDescarga", "revenimientoObtenido", "tempAmbienteC",
  "observaciones", "contenidoAirePct", "laboratoristaCampo", "residenteObra", "tempConcretoC", "ubicacion",
]);

export function readProfileConfiguration(value: unknown): ProfileConfiguration | null {
  const parsed = profileConfigurationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function validateConfiguredFields(configuration: ProfileConfiguration, record: Record<string, unknown>) {
  const missing: string[] = [];
  for (const [key, definition] of Object.entries(configuration.formulario.campos)) {
    if (!definition.visible || !definition.obligatorio || !KNOWN_FIELDS.has(key)) continue;
    const value = record[key];
    if (value == null || (typeof value === "string" && !value.trim())) missing.push(definition.etiqueta);
  }
  return missing;
}

export function validateSpecimenRules(configuration: ProfileConfiguration, specimens: Array<{ tipo: string }>) {
  const allowed = new Set<string>(configuration.reglas.tiposEspecimenHabilitados);
  return specimens.find((item) => !allowed.has(item.tipo))?.tipo ?? null;
}

export async function nextSampleFolio(tx: Prisma.TransactionClient, profileId: string, format: string, now = new Date()) {
  const year = now.getFullYear();
  const sequence = await tx.secuenciaFolio.upsert({
    where: { perfilId_clave_anio: { perfilId: profileId, clave: "MUESTRA", anio: year } },
    create: { perfilId: profileId, clave: "MUESTRA", anio: year, ultimoNumero: 1 },
    update: { ultimoNumero: { increment: 1 } },
  });
  return format.replaceAll("{YYYY}", String(year)).replaceAll("{YY}", String(year).slice(-2)).replace(/\{SEQ:([1-9])\}/g, (_, width: string) => String(sequence.ultimoNumero).padStart(Number(width), "0"));
}

export function equipmentRuleError(configuration: ProfileConfiguration, assignments: Array<{ tipoCodigo: string; especimenId: string | null; calibracionValida: boolean }>, specimens: Array<{ id: string; tipo: string }>) {
  for (const rule of configuration.reglas.equipos) {
    const applicableTypes = new Set<string>(rule.tiposEspecimen);
    const targetSpecimens = rule.tiposEspecimen.length ? specimens.filter((item) => applicableTypes.has(item.tipo)) : specimens;
    if (rule.tiposEspecimen.length && !targetSpecimens.length) continue;
    const matches = assignments.filter((item) => item.tipoCodigo === rule.tipoEquipoCodigo.toUpperCase());
    const required = rule.porEspecimen ? targetSpecimens.length : rule.cantidadMinima;
    if (matches.length < required) return `Faltan equipos ${rule.tipoEquipoCodigo}: se requieren ${required} y hay ${matches.length}.`;
    if (rule.cantidadMaxima != null && matches.length > rule.cantidadMaxima) return `Se excedio la cantidad maxima de ${rule.tipoEquipoCodigo}.`;
    if (rule.porEspecimen && targetSpecimens.some((specimen) => !matches.some((item) => item.especimenId === specimen.id))) return `Cada especimen requiere un equipo ${rule.tipoEquipoCodigo}.`;
    if (rule.requiereCalibracion && matches.some((item) => !item.calibracionValida)) return `El equipo ${rule.tipoEquipoCodigo} requiere calibracion vigente.`;
  }
  return null;
}

export const EXPORTABLE_SAMPLE_COLUMNS = Object.freeze({
  idMuestra: "ID Muestra", fechaMuestreo: "Fecha de muestreo", cliente: "Cliente", obra: "Obra",
  localizacion: "Localizacion", procedencia: "Procedencia", elemento: "Elemento", revenimientoCm: "Revenimiento (cm)",
  fcKgCm2: "fc (Kg/cm2)", tipoConcreto: "Tipo de concreto", noMuestra: "No. muestra", observaciones: "Observaciones",
  estatusBitacora: "Estatus bitacora", estatusRecoleccion: "Estatus recoleccion", numeroEspecimenes: "Numero de especimenes",
  especimenes: "Especimenes", equipos: "Equipos y series",
});

export type ExportableColumn = keyof typeof EXPORTABLE_SAMPLE_COLUMNS;
