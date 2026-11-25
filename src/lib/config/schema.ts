import { z } from "zod";

const color = z.string().regex(/^#[0-9A-F]{6}$/i, "Debe ser un color hexadecimal");
const field = z.object({
  visible: z.boolean(), obligatorio: z.boolean(), etiqueta: z.string().trim().min(1).max(100),
  ayuda: z.string().trim().max(300).optional(), orden: z.number().int().min(0).max(1000),
});
const LOCKED_CAPTURE_FORM = Object.freeze({
  campos: Object.freeze({
    cliente: Object.freeze({ visible: true, obligatorio: true, etiqueta: "Cliente", orden: 10 }),
    obra: Object.freeze({ visible: true, obligatorio: true, etiqueta: "Obra", orden: 20 }),
    tipoConcreto: Object.freeze({ visible: true, obligatorio: true, etiqueta: "Tipo de concreto", orden: 30 }),
    observaciones: Object.freeze({ visible: true, obligatorio: false, etiqueta: "Observaciones", orden: 900 }),
  }),
});
const equipmentRule = z.object({
  tipoEquipoCodigo: z.string().trim().min(1).max(60).regex(/^[A-Z0-9_-]+$/i),
  cantidadMinima: z.number().int().min(0).max(100).default(1),
  cantidadMaxima: z.number().int().min(1).max(100).nullable().default(null),
  porEspecimen: z.boolean().default(false),
  tiposEspecimen: z.array(z.enum(["CILINDRO_15X30", "CILINDRO_10X20", "VIGA_50X15X15"])).max(3).default([]),
  requiereCalibracion: z.boolean().default(false),
}).refine((item) => item.cantidadMaxima == null || item.cantidadMinima <= item.cantidadMaxima, { message: "La cantidad minima no puede superar la maxima." });
const testProgramDocument = z.object({
  titulo: z.string().trim().min(1).max(120).default("Programa diario de retiro y ensaye"),
  codigo: z.string().trim().min(1).max(40).regex(/^[A-Z0-9._/-]+$/i).default("FO-LAB-PE"),
  revision: z.string().trim().min(1).max(20).default("00"),
  firmas: z.array(z.string().trim().min(1).max(60)).min(1).max(3).default(["Preparo", "Tecnico responsable", "Reviso"]),
  mostrarCamposManuales: z.boolean().default(true),
}).default({ titulo: "Programa diario de retiro y ensaye", codigo: "FO-LAB-PE", revision: "00", firmas: ["Preparo", "Tecnico responsable", "Reviso"], mostrarCamposManuales: true });
export const EXPORTABLE_COLUMN_KEYS = ["idMuestra", "fechaMuestreo", "cliente", "obra", "localizacion", "procedencia", "elemento", "revenimientoCm", "fcKgCm2", "tipoConcreto", "noMuestra", "observaciones", "estatusBitacora", "estatusRecoleccion", "numeroEspecimenes", "especimenes", "equipos"] as const;

export const profileConfigurationSchema = z.object({
  esquema: z.literal(1),
  identidad: z.object({
    nombreComercial: z.string().trim().min(1).max(120),
    razonSocial: z.string().trim().max(200).default(""),
    colorPrimario: color,
    colorSecundario: color,
    contacto: z.string().trim().max(200).default(""),
    domicilio: z.string().trim().max(500).default(""),
    leyendaDocumental: z.string().trim().max(500).default(""),
  }),
  modulos: z.object({
    captura: z.boolean(), inventario: z.boolean(), personalizacion: z.boolean(),
    reportes: z.boolean().default(true), programacionEnsayos: z.boolean().default(true),
  }),
  // La plantilla publicada es parte del contrato del producto. Se normaliza
  // también en servidor para que una llamada directa a la API no pueda
  // renombrar, ocultar ni reordenar sus campos.
  formulario: z.preprocess(() => LOCKED_CAPTURE_FORM, z.object({ campos: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/), field) })),
  operacion: z.object({
    formatoFolio: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_{}:\-]+$/i),
    unidades: z.object({ temperatura: z.literal("C"), longitud: z.enum(["CM", "MM"]), resistencia: z.literal("KG_CM2") }),
  }),
  documentos: z.object({ programaEnsayos: testProgramDocument }).default({ programaEnsayos: testProgramDocument.parse({}) }),
  reglas: z.object({
    tiposEspecimenHabilitados: z.array(z.enum(["CILINDRO_15X30", "CILINDRO_10X20", "VIGA_50X15X15"])).min(1).max(3),
    especimenesObjetivoPorMuestra: z.preprocess(() => 4, z.literal(4)).default(4),
    especimenesMaximosPorMuestra: z.preprocess(() => 4, z.literal(4)).default(4),
    equipos: z.array(equipmentRule).max(100),
  }).default({ tiposEspecimenHabilitados: ["CILINDRO_15X30", "CILINDRO_10X20", "VIGA_50X15X15"], especimenesObjetivoPorMuestra: 4, especimenesMaximosPorMuestra: 4, equipos: [] }),
  exportaciones: z.array(z.object({
    clave: z.string().trim().regex(/^[A-Z0-9_-]+$/i), nombre: z.string().trim().min(1).max(100),
    columnas: z.array(z.string().trim().min(1).max(100)).min(1).max(EXPORTABLE_COLUMN_KEYS.length), activo: z.boolean(),
  })).max(20),
}).strict().superRefine((value, context) => {
  const exportKeys = value.exportaciones.map((item) => item.clave.toUpperCase());
  if (new Set(exportKeys).size !== exportKeys.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["exportaciones"], message: "Las claves de exportacion no pueden repetirse." });
  const allowedColumns = new Set<string>(EXPORTABLE_COLUMN_KEYS);
  value.exportaciones.forEach((profile, index) => profile.columnas.forEach((column) => { if (!allowedColumns.has(column)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["exportaciones", index, "columnas"], message: `Columna no exportable: ${column}.` }); }));
  const ruleKeys = value.reglas.equipos.map((item) => item.tipoEquipoCodigo.toUpperCase());
  if (new Set(ruleKeys).size !== ruleKeys.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["reglas", "equipos"], message: "Cada tipo de equipo debe tener una sola regla." });
  if (value.reglas.especimenesObjetivoPorMuestra > value.reglas.especimenesMaximosPorMuestra) context.addIssue({ code: z.ZodIssueCode.custom, path: ["reglas", "especimenesObjetivoPorMuestra"], message: "El objetivo no puede superar el maximo por muestra." });
  for (const [key, item] of Object.entries(value.formulario.campos)) if (item.obligatorio && !item.visible) context.addIssue({ code: z.ZodIssueCode.custom, path: ["formulario", "campos", key], message: "Un campo obligatorio debe permanecer visible." });
  const tokens = [...value.operacion.formatoFolio.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  if (!tokens.some((token) => /^SEQ:[1-9]$/.test(token))) context.addIssue({ code: z.ZodIssueCode.custom, path: ["operacion", "formatoFolio"], message: "El formato debe incluir un consecutivo {SEQ:n}." });
  for (const token of tokens) if (token !== "YYYY" && token !== "YY" && !/^SEQ:[1-9]$/.test(token)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["operacion", "formatoFolio"], message: `Token de folio no permitido: {${token}}.` });
});

export const catalogValueSchema = z.object({
  tipo: z.string().trim().min(1).max(60).regex(/^[A-Z0-9_-]+$/i),
  clave: z.string().trim().min(1).max(80).regex(/^[A-Z0-9_-]+$/i),
  nombre: z.string().trim().min(1).max(200),
  orden: z.number().int().min(0).max(10000).default(0),
  activo: z.boolean().default(true),
  metadata: z.record(z.string(), z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()])).optional(),
});

export type ProfileConfiguration = z.infer<typeof profileConfigurationSchema>;

export const createProfileSchema = z.object({
  clave: z.string().trim().min(2).max(50).regex(/^[A-Z0-9_-]+$/i),
  nombreInterno: z.string().trim().min(2).max(120),
  configuracion: profileConfigurationSchema.optional(),
  notas: z.string().trim().max(1000).optional(),
});

export const createVersionSchema = z.object({
  configuracion: profileConfigurationSchema,
  basadaEnId: z.string().cuid().nullable().optional(),
  notas: z.string().trim().max(1000).nullable().optional(),
});

export const importProfileSchema = z.object({
  formato: z.literal("ENSALIA_PROFILE"), versionFormato: z.literal(1),
  perfil: z.object({ clave: z.string(), nombreInterno: z.string() }),
  configuracion: profileConfigurationSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
});
