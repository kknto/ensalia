import { TipoFallaConcreto } from "@prisma/client";

export type { TipoFallaConcreto };

export interface MetrologiaEspecimenInput {
  numero: number;
  fechaColado: Date;
  fechaEnsaye: Date;
  edadProgramadaDias: number;
  diametro1Mm: number;
  diametro2Mm?: number;
  longitudMm: number;
  masaG?: number | null;
  cargaMaximaKn?: number;
  cargaMaximaKg?: number;
  tipoFalla?: TipoFallaConcreto;
  condicionHumedad?: "HUMEDO_SATURADO" | "SUPERFICIALMENTE_SECO" | "SECO_AIRE";
  fotoRoturaBytes?: Uint8Array;
  fotoRoturaMimeType?: "image/jpeg" | "image/png" | "image/webp";
}

export interface EspecimenCalculado {
  numero: number;
  fechaColado: Date;
  fechaEnsaye: Date;
  edadRealDias: number;
  edadProgramadaDias: number;
  enToleranciaEdad: boolean;
  alertaEdad?: string;
  diametro1Mm: number;
  diametro2Mm: number;
  diametroPromedioMm: number;
  excentricidadPct: number;
  excentricidadValida: boolean;
  alertaExcentricidad?: string;
  longitudMm: number;
  relacionLd: number;
  factorLd: number;
  especimenRechazadoLd: boolean;
  alertaLd?: string;
  areaCm2: number;
  masaG?: number | null;
  densidadKgM3?: number | null;
  cargaMaximaKn: number;
  cargaMaximaKg: number;
  resistenciaNominalKgCm2: number;
  resistenciaCorregidaKgCm2: number;
  porcentajeFc?: number | null;
  cumpleEspecificacion: boolean;
  tipoFalla: TipoFallaConcreto;
  condicionHumedad: string;
  fotoRoturaBytes?: Uint8Array;
  fotoRoturaMimeType?: "image/jpeg" | "image/png" | "image/webp";
}

export interface CompressionReportData {
  folio: string;
  fechaEmision: Date;
  laboratorio: {
    nombre: string;
    razonSocial?: string;
    acreditacionEma?: string;
    numeroRegistro?: string;
    domicilio?: string;
    telefono?: string;
    email?: string;
    logoBytes?: Uint8Array;
    logoMimeType?: "image/png" | "image/jpeg";
  };
  proyecto: {
    cliente: string;
    obra: string;
    ubicacion?: string;
    contratista?: string;
    elemento: string;
  };
  mezcla: {
    fcDisenoKgCm2: number;
    edadGarantiaDias: number;
    revenimientoNominalCm?: number;
    tmaMm?: number;
    tipoConcreto?: string;
    tipoCemento?: string;
    concretera?: string;
    numeroRemision?: string;
    numeroCamion?: string;
    volumenM3?: number;
  };
  muestreo: {
    idMuestra: string;
    fechaHoraMuestreo: Date;
    revenimientoObtenidoCm?: number;
    temperaturaAmbienteC?: number;
    temperaturaConcretoC?: number;
    contenidoAirePct?: number;
    regimenCurado?: string;
    metodoCabeceo?: string;
  };
  especimenes: EspecimenCalculado[];
  estadisticasAci?: {
    promedioResistenciaKgCm2: number;
    desviacionEstandarKgCm2: number;
    coeficienteVariacionPct: number;
    variacionDentroDelEnsayoPct?: number;
    resistenciaRequeridaFcr?: number;
    calificacionControl: "EXCELENTE" | "MUY_BUENO" | "BUENO" | "DEFICIENTE" | "INSUFICIENTE_DATOS";
    cumpleCriterioAci318: boolean;
  };
  firmas: {
    operadorNombre: string;
    operadorCargo?: string;
    operadorCedula?: string;
    operadorFirmaPng?: Uint8Array;
    signatarioNombre: string;
    signatarioCargo?: string;
    signatarioCedula?: string;
    signatarioFirmaPng?: Uint8Array;
  };
  metadatos?: {
    prensaCodigoInterno?: string;
    observaciones?: string;
    urlVerificacionBase?: string;
  };
}

export interface CanonicalCompressionPayload {
  folio: string;
  idMuestra: string;
  cliente: string;
  obra: string;
  elemento: string;
  fechaColadoUtc: string;
  fcDisenoKgCm2: number;
  edadGarantiaDias: number;
  fechaEmisionUtc: string;
  especimenes: Array<{
    numero: number;
    edadRealDias: number;
    cargaMaximaKg: number;
    resistenciaKgCm2: number;
    porcentajeFc: number | null;
    tipoFalla: string;
    factorLd: number;
  }>;
  prensaCodigoInterno: string;
  operadorNombre: string;
  signatarioNombre: string;
}

