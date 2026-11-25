import { z } from "zod";

const optionalNumber = z.number().finite().nullable().optional();
const optionalString = z.string().trim().max(2000).nullable().optional();
const optionalDate = z.string().datetime({ offset: true }).nullable().optional();

export const specimenSchema = z.object({
  id: z.string().cuid().optional(),
  numero: z.number().int().min(1).max(4),
  edadDias: z.number().int().min(0).max(365).nullable().optional(),
  tipo: z.enum(["CILINDRO_15X30", "CILINDRO_10X20", "VIGA_50X15X15"]),
  numeroMolde: optionalString,
  fechaEnsaye: optionalDate,
});

export const muestraSchema = z.object({
  fechaMuestreo: z.string().datetime({ offset: true }),
  cliente: z.string().trim().min(1).max(200),
  obra: z.string().trim().min(1).max(200),
  ciudad: optionalString,
  coordenadasColado: optionalString,
  direccion: optionalString,
  sistema: optionalString,
  localizacion: optionalString, procedencia: optionalString, elemento: optionalString,
  revenimientoCm: optionalNumber, toleranciaRevenimiento: optionalString, fcKgCm2: optionalNumber, edadCilindro: z.number().int().min(0).max(365).nullable().optional(),
  tipoConcreto: z.string().trim().min(1).max(200), concretera: optionalString, tmaMm: optionalNumber, cemento: optionalString,
  noMuestra: z.string().trim().min(1).max(100), remision: optionalString, camion: optionalString, volumenM3: optionalNumber,
  salidaPlanta: optionalDate, llegadaObra: optionalDate, inicioDescarga: optionalDate, finDescarga: optionalDate, elaboracionMuestra: optionalDate,
  revenimientoObtenido: optionalNumber, revenimientoObtenido2: optionalNumber, tempAmbienteC: optionalNumber, observaciones: optionalString, contenidoAirePct: optionalNumber,
  placaRevenimiento: z.boolean().default(false), conoRevenimiento: z.boolean().default(false), varilla: z.boolean().default(false),
  cucharon: z.boolean().default(false), termometro: z.boolean().default(false), carretilla: z.boolean().default(false), equipoContenidoAire: z.boolean().default(false),
  cilindro15x30: z.boolean().default(false), e15x30: z.boolean().default(false), cilindro10x20: z.boolean().default(false), e10x20: z.boolean().default(false), viga50x15x15: z.boolean().default(false), v50: z.boolean().default(false),
  numeroEspecimenes: z.number().int().min(0).max(4).nullable().optional(), laboratoristaCampo: optionalString, residenteObra: optionalString,
  tempConcretoC: optionalNumber, ubicacion: optionalString, estatusRecoleccion: z.enum(["PENDIENTE", "RECOLECTADA", "NO_RECOLECTADA"]).default("PENDIENTE"),
  especimenes: z.array(specimenSchema).max(4).default([]),
}).superRefine((value, context) => {
  const ordered = [value.salidaPlanta, value.llegadaObra, value.inicioDescarga, value.finDescarga]
    .filter((date): date is string => Boolean(date)).map((date) => new Date(date).getTime());
  if (ordered.some((date, index) => index > 0 && date < ordered[index - 1])) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["salidaPlanta"], message: "Los horarios de transporte deben conservar su orden cronológico." });
  }
  const specimenNumbers = value.especimenes.map((item) => item.numero);
  if (new Set(specimenNumbers).size !== specimenNumbers.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["especimenes"], message: "Los números de espécimen no pueden repetirse." });
  }
});

export const transitionBodySchema = z.object({ motivo: z.string().trim().max(1000).optional() });

const shortText = z.string().trim().max(200);
const optionalShortText = shortText.nullable().optional();

export const tipoEquipoSchema = z.object({
  codigo: z.string().trim().min(1).max(60).regex(/^[A-Z0-9_-]+$/i),
  nombre: z.string().trim().min(1).max(200),
  requiereSerie: z.boolean().default(true),
  requiereCalibracion: z.boolean().default(false),
  esMolde: z.boolean().default(false),
  obligatorioEnMuestra: z.boolean().default(false),
  activo: z.boolean().default(true),
});

export const equipoSchema = z.object({
  tipoId: z.string().cuid(),
  codigoInterno: z.string().trim().min(1).max(200)
    .regex(/^[A-Z0-9][A-Z0-9._/-]*$/i, "Use letras, numeros, punto, guion, diagonal o guion bajo.")
    .transform((value) => value.toUpperCase()),
  numeroSerie: z.string().trim().max(120).nullable().optional().transform((value) => value || null),
  marca: optionalShortText,
  modelo: optionalShortText,
  descripcion: optionalString,
  ubicacion: optionalShortText,
  notas: optionalString,
});

export const equipoPatchSchema = equipoSchema.partial().extend({ version: z.number().int().min(0) });
export const cambioEstadoEquipoSchema = z.object({
  estado: z.enum(["DISPONIBLE", "MANTENIMIENTO", "FUERA_SERVICIO", "BAJA", "EXTRAVIADO"]),
  motivo: z.string().trim().min(1).max(1000),
  version: z.number().int().min(0),
});
export const calibracionEquipoSchema = z.object({
  fecha: z.string().datetime({ offset: true }),
  venceEn: z.string().datetime({ offset: true }).nullable().optional(),
  resultado: z.enum(["APROBADO", "RECHAZADO", "LIMITADO"]).default("APROBADO"),
  certificado: optionalShortText,
  proveedor: optionalShortText,
  observaciones: optionalString,
}).refine((v) => !v.venceEn || new Date(v.venceEn) >= new Date(v.fecha), { path: ["venceEn"], message: "La vigencia no puede ser anterior a la calibración." });
export const asignarEquiposSchema = z.object({
  versionMuestra: z.number().int().min(0),
  observaciones: optionalString,
  equipos: z.array(z.object({ equipoId: z.string().cuid(), especimenId: z.string().cuid().nullable().optional() })).min(1).max(50),
}).superRefine((v, context) => {
  const ids = v.equipos.map((item) => item.equipoId);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["equipos"], message: "Un equipo no puede repetirse en la misma asignación." });
  const specimenIds = v.equipos.flatMap((item) => item.especimenId ? [item.especimenId] : []);
  if (new Set(specimenIds).size !== specimenIds.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["equipos"], message: "Un espécimen no puede recibir más de un molde activo." });
});
export const devolverEquiposSchema = z.object({
  versionMuestra: z.number().int().min(0),
  asignacionIds: z.array(z.string().cuid()).min(1).max(50),
  observaciones: optionalString,
  estadoFinal: z.enum(["DISPONIBLE", "MANTENIMIENTO", "FUERA_SERVICIO"]).default("DISPONIBLE"),
});

export const coladoSchema = z.object({
  fechaColado: z.string().datetime({ offset: true }),
  cliente: z.string().trim().min(1).max(200),
  obra: z.string().trim().min(1).max(200),
  localizacion: optionalString,
  procedencia: optionalString,
  elemento: optionalString,
  volumenM3: optionalNumber,
  fcKgCm2: optionalNumber,
  tipoConcreto: optionalShortText,
  concretera: optionalShortText,
  tmaMm: optionalNumber,
  cemento: optionalShortText,
  observaciones: optionalString,
  numeroTomas: z.number().int().min(1).max(100),
});

export const coladoPatchSchema = coladoSchema.partial().extend({ version: z.number().int().min(0) });
export const crearMuestrasColadoSchema = z.object({ cantidad: z.number().int().min(1).max(100), versionColado: z.number().int().min(0).optional() });
export const vincularMuestraColadoSchema = z.object({ muestraId: z.string().cuid(), versionColado: z.number().int().min(0), versionMuestra: z.number().int().min(0) });

export type MuestraInput = z.infer<typeof muestraSchema>;

export function validateRanges(input: MuestraInput) {
  const errors: string[] = [];
  if (input.revenimientoCm != null && (input.revenimientoCm < 0 || input.revenimientoCm > 40)) errors.push("El revenimiento debe estar entre 0 y 40 cm.");
  if (input.contenidoAirePct != null && (input.contenidoAirePct < 0 || input.contenidoAirePct > 100)) errors.push("El contenido de aire debe estar entre 0 y 100%.");
  for (const [label, value] of [["temperatura ambiente", input.tempAmbienteC], ["temperatura del concreto", input.tempConcretoC]] as const) {
    if (value != null && (value < -30 || value > 80)) errors.push(`La ${label} debe estar entre -30 y 80 °C.`);
  }
  if (input.numeroEspecimenes != null && input.numeroEspecimenes !== input.especimenes.length) errors.push("El número de especímenes debe coincidir con las filas capturadas.");
  return errors;
}
