import { addCivilDays } from "@/lib/civil-date";

export type View =
  | "inicio"
  | "colados"
  | "nueva"
  | "registros"
  | "pendientes"
  | "salidas"
  | "curvas"
  | "ensayos"
  | "inventario"
  | "personalizacion"
  | "configuracion";

export type Status = "BORRADOR" | "REVISADA" | "CERRADA" | "ANULADA";

export interface Specimen {
  id?: string;
  numero: number;
  edadDias: number | null;
  tipo: string;
  fechaEnsaye: string | null;
  numeroMolde?: string | null;
}

export interface Sample {
  id?: string;
  idMuestra?: string;
  version?: number;
  fechaMuestreo: string;
  cliente: string;
  obra: string;
  ciudad?: string;
  coordenadasColado?: string;
  direccion?: string;
  sistema?: string;
  noMuestra: string;
  tipoConcreto: string;
  estatusBitacora?: Status;
  estatusRecoleccion: string;
  especimenes: Specimen[];
  numeroEspecimenes: number;
  localizacion?: string;
  procedencia?: string;
  elemento?: string;
  concretera?: string;
  cemento?: string;
  remision?: string;
  camion?: string;
  ubicacion?: string;
  revenimientoCm?: string | number | null;
  toleranciaRevenimiento?: string;
  fcKgCm2?: string | number | null;
  edadCilindro?: string | number | null;
  tmaMm?: string | number | null;
  volumenM3?: string | number | null;
  revenimientoObtenido?: string | number | null;
  revenimientoObtenido2?: string | number | null;
  tempAmbienteC?: string | number | null;
  tempConcretoC?: string | number | null;
  contenidoAirePct?: string | number | null;
  salidaPlanta?: string | null;
  llegadaObra?: string | null;
  inicioDescarga?: string | null;
  finDescarga?: string | null;
  elaboracionMuestra?: string | null;
  observaciones?: string;
  laboratoristaCampo?: string;
  residenteObra?: string;
  placaRevenimiento?: boolean;
  conoRevenimiento?: boolean;
  varilla?: boolean;
  cucharon?: boolean;
  termometro?: boolean;
  carretilla?: boolean;
  equipoContenidoAire?: boolean;
  cilindro15x30?: boolean;
  e15x30?: boolean;
  cilindro10x20?: boolean;
  e10x20?: boolean;
  viga50x15x15?: boolean;
  v50?: boolean;
  [key: string]: unknown;
}

export const textFields = [
  ["cliente", "Cliente *"],
  ["obra", "Obra *"],
  ["ciudad", "Ciudad"],
  ["coordenadasColado", "Coordenadas del colado"],
  ["direccion", "Dirección"],
  ["localizacion", "Localización"],
  ["procedencia", "Procedencia"],
  ["elemento", "Elemento"],
  ["tipoConcreto", "Tipo de concreto *"],
  ["concretera", "Concretera"],
  ["sistema", "# Sistema (Planta)"],
  ["cemento", "Cemento"],
  ["noMuestra", "No. muestra *"],
  ["remision", "Remisión"],
  ["camion", "Camión"],
  ["ubicacion", "Ubicación"],
] as const;

export const numberFields = [
  ["revenimientoCm", "Revenimiento de diseño (cm)"],
  ["fcKgCm2", "f'c (kg/cm²)"],
  ["edadCilindro", "Edad cilindro (días)"],
  ["tmaMm", "TMA (mm)"],
  ["volumenM3", "Volumen (m³)"],
  ["revenimientoObtenido", "Revenimiento obtenido 1 (cm)"],
  ["revenimientoObtenido2", "Revenimiento obtenido 2 (cm)"],
  ["tempAmbienteC", "Temp. ambiente (°C)"],
  ["contenidoAirePct", "Contenido aire (%)"],
  ["tempConcretoC", "Temp. concreto (°C)"],
] as const;

export const dateTimeFields = [
  ["salidaPlanta", "Salida planta"],
  ["llegadaObra", "Llegada obra"],
  ["elaboracionMuestra", "Elaboración de muestra"],
  ["inicioDescarga", "Inicio descarga"],
  ["finDescarga", "Fin descarga"],
] as const;

export const states = [
  ["", "Todos los estados"],
  ["BORRADOR", "Borrador"],
  ["REVISADA", "Revisada"],
  ["CERRADA", "Cerrada"],
  ["ANULADA", "Anulada"],
] as const;

export function localDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Cancun",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function emptySample(): Sample {
  return {
    fechaMuestreo: localDate(),
    cliente: "",
    obra: "",
    ciudad: "",
    coordenadasColado: "",
    direccion: "",
    sistema: "",
    localizacion: "",
    procedencia: "",
    elemento: "",
    revenimientoCm: "",
    toleranciaRevenimiento: "± 3.5",
    fcKgCm2: "",
    edadCilindro: "",
    tipoConcreto: "",
    concretera: "",
    tmaMm: "",
    cemento: "",
    noMuestra: "",
    remision: "",
    camion: "",
    volumenM3: "",
    salidaPlanta: "",
    llegadaObra: "",
    inicioDescarga: "",
    finDescarga: "",
    elaboracionMuestra: "",
    revenimientoObtenido: "",
    revenimientoObtenido2: "",
    tempAmbienteC: "",
    observaciones: "",
    contenidoAirePct: "",
    tempConcretoC: "",
    ubicacion: "",
    numeroEspecimenes: 0,
    laboratoristaCampo: "",
    residenteObra: "",
    estatusRecoleccion: "PENDIENTE",
    especimenes: [],
    placaRevenimiento: false,
    conoRevenimiento: false,
    varilla: false,
    cucharon: false,
    termometro: false,
    carretilla: false,
    equipoContenidoAire: false,
    cilindro15x30: false,
    e15x30: false,
    cilindro10x20: false,
    e10x20: false,
    viga50x15x15: false,
    v50: false,
  };
}

export const dateOnly = (value: unknown) =>
  value ? `${String(value).slice(0, 10)}T00:00:00-05:00` : null;

export const dateTime = (value: unknown) =>
  value ? new Date(String(value)).toISOString() : null;

export const inputDateTime = (value: unknown) =>
  value
    ? new Date(String(value))
        .toLocaleString("sv-SE", { timeZone: "America/Cancun" })
        .replace(" ", "T")
        .slice(0, 16)
    : "";

export const statusLabel = (value?: string): string =>
  ({
    BORRADOR: "Borrador",
    REVISADA: "Revisada",
    CERRADA: "Cerrada",
    ANULADA: "Anulada",
  }[value || ""] ||
  value ||
  "Sin estado");

export function prepareForForm(data: Sample): Sample {
  const next: Sample = {
    ...emptySample(),
    ...data,
    fechaMuestreo: String(data.fechaMuestreo || "").slice(0, 10),
    especimenes: (data.especimenes || []).map((item) => ({
      ...item,
      fechaEnsaye: item.fechaEnsaye ? String(item.fechaEnsaye).slice(0, 10) : null,
    })),
  };
  for (const [key] of dateTimeFields) {
    next[key] = inputDateTime(data[key]);
  }
  next.numeroEspecimenes = next.especimenes.length;
  return next;
}

