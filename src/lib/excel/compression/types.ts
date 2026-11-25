import { TipoFallaConcreto } from "@prisma/client";

export interface ParsedSpecimen {
  numero: number;
  fechaColado?: Date;
  fechaEnsaye?: Date;
  edadDias: number;
  diametro1Mm?: number;
  diametro2Mm?: number;
  diametroMm: number;
  longitudMm: number;
  areaCm2: number;
  cargaMaximaKg: number;
  cargaMaximaKn: number;
  resistenciaCalculadaKgCm2: number;
  tipoFalla: TipoFallaConcreto;
  factorLd?: number;
  porcentajeFc?: number;
}

export interface IngestionDiagnostic {
  cell?: string;
  row?: number;
  message: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
}

export interface ParsedBlockResult {
  metadata: Record<string, string | number | Date>;
  specimens: ParsedSpecimen[];
  diagnostics: IngestionDiagnostic[];
  hashMuestra?: string;
}

export interface CorporateExcelSpecimenItem {
  numero: number;
  fechaColado?: Date | string;
  fechaEnsaye?: Date | string;
  edadDias: number;
  diametro1Mm: number;
  diametro2Mm: number;
  longitudMm: number;
  areaCm2: number;
  cargaMaximaKg: number;
  cargaMaximaKn: number;
  resistenciaKgCm2: number;
  factorLd?: number;
  porcentajeFc: number;
  tipoFalla?: string;
  cumple?: boolean;
}

export interface CorporateExcelDataset {
  folio: string;
  cliente: string;
  obra: string;
  elemento?: string;
  ubicacion?: string;
  fcDisenoKgCm2: number;
  edadGarantiaDias: number;
  tipoConcreto?: string;
  tipoCemento?: string;
  concretera?: string;
  remision?: string;
  fechaMuestreo?: Date | string;
  especimenes: CorporateExcelSpecimenItem[];
  promedio28d?: number;
}

