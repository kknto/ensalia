export const OCR_DOCUMENT_STATES = [
  "CARGADO",
  "PROCESANDO",
  "EN_REVISION",
  "CONFIRMADO",
  "RECHAZADO",
] as const;

export type OcrDocumentState = (typeof OCR_DOCUMENT_STATES)[number];
export type OcrFieldState = "PENDIENTE" | "ACEPTADO" | "CORREGIDO" | "OMITIDO";
export type OcrValueType = "TEXT" | "NUMBER" | "DATE" | "TIME" | "BOOLEAN";

export type BoundingBox = { x: number; y: number; width: number; height: number; page: number };

export type OcrRegion = {
  key: string;
  label: string;
  valueType: OcrValueType;
  required: boolean;
  box: BoundingBox;
  allowedPattern?: string;
};

export type OcrTemplate = {
  key: string;
  version: number;
  pageCount: number;
  regions: OcrRegion[];
};

export type OcrFieldSuggestion = {
  key: string;
  rawText: string;
  proposedValue: string | number | boolean | null;
  confidence: number | null;
  box: BoundingBox;
  warnings: string[];
};

export type OcrEngineResult = {
  engine: string;
  engineVersion: string;
  status: "COMPLETED" | "MANUAL_REQUIRED" | "FAILED";
  fields: OcrFieldSuggestion[];
  warnings: string[];
};

export type ReviewField = OcrFieldSuggestion & {
  required: boolean;
  state: OcrFieldState;
  finalValue: string | number | boolean | null;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type ReviewSession = {
  documentId: string;
  version: number;
  state: OcrDocumentState;
  fields: ReviewField[];
};
