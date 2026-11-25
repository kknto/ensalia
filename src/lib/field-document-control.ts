export const FIELD_DOCUMENT_STATES = [
  "EMITIDA",
  "ENTREGADA",
  "DEVUELTA",
  "ESCANEADA",
  "VERIFICADA",
  "CERRADA",
  "ANULADA",
] as const;

export type FieldDocumentState = (typeof FIELD_DOCUMENT_STATES)[number];

const ALLOWED_TRANSITIONS: Record<FieldDocumentState, readonly FieldDocumentState[]> = {
  EMITIDA: ["ENTREGADA", "ANULADA"],
  ENTREGADA: ["DEVUELTA", "ANULADA"],
  DEVUELTA: ["ESCANEADA", "ANULADA"],
  ESCANEADA: ["VERIFICADA", "ANULADA"],
  VERIFICADA: ["CERRADA", "ANULADA"],
  CERRADA: [],
  ANULADA: [],
};

export interface FieldDocumentIdentity {
  folio: string;
  formatCode: string;
  formatRevision: string;
  issuedAt: string;
  sampleId: string;
  page: number;
  pageCount: number;
  pdfSha256: string;
}

export interface FieldCorrection {
  previousValue: string;
  correctedValue: string;
  reason: string;
  correctedBy: string;
  correctedAt: string;
}

export interface OcrFieldEvidence {
  fieldId: string;
  rawValue: string;
  confidence: number;
  critical: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

export function canTransitionFieldDocument(from: FieldDocumentState, to: FieldDocumentState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function validateFieldDocumentIdentity(identity: FieldDocumentIdentity): string[] {
  const errors: string[] = [];
  if (!identity.folio.trim()) errors.push("El folio es obligatorio.");
  if (!identity.formatCode.trim()) errors.push("El codigo de formato es obligatorio.");
  if (!identity.formatRevision.trim()) errors.push("La revision del formato es obligatoria.");
  if (!identity.sampleId.trim()) errors.push("La muestra vinculada es obligatoria.");
  if (!Number.isInteger(identity.page) || identity.page < 1) errors.push("La pagina debe ser un entero positivo.");
  if (!Number.isInteger(identity.pageCount) || identity.pageCount < identity.page) {
    errors.push("El total de paginas debe ser igual o mayor que la pagina actual.");
  }
  if (!SHA256_PATTERN.test(identity.pdfSha256)) errors.push("El hash del PDF debe ser SHA-256 hexadecimal.");
  if (Number.isNaN(Date.parse(identity.issuedAt))) errors.push("La fecha de emision no es valida.");
  return errors;
}

export function validateFieldCorrection(correction: FieldCorrection): string[] {
  const errors: string[] = [];
  if (!correction.previousValue.trim()) errors.push("Debe conservarse el valor anterior legible.");
  if (!correction.correctedValue.trim()) errors.push("El valor corregido es obligatorio.");
  if (!correction.reason.trim()) errors.push("El motivo de correccion es obligatorio.");
  if (!correction.correctedBy.trim()) errors.push("La persona que corrige es obligatoria.");
  if (Number.isNaN(Date.parse(correction.correctedAt))) errors.push("La fecha de correccion no es valida.");
  return errors;
}

export function ocrEvidenceRequiresReview(evidence: OcrFieldEvidence, threshold = 0.9): boolean {
  if (evidence.critical) return !evidence.confirmedBy || !evidence.confirmedAt;
  return evidence.confidence < threshold || !evidence.confirmedBy || !evidence.confirmedAt;
}

export function validateOcrEvidence(evidence: OcrFieldEvidence): string[] {
  const errors: string[] = [];
  if (!evidence.fieldId.trim()) errors.push("El identificador de campo es obligatorio.");
  if (evidence.confidence < 0 || evidence.confidence > 1 || Number.isNaN(evidence.confidence)) {
    errors.push("La confianza OCR debe estar entre 0 y 1.");
  }
  if (evidence.confirmedAt && !evidence.confirmedBy) {
    errors.push("Una confirmacion fechada debe identificar a la persona verificadora.");
  }
  if (evidence.confirmedAt && Number.isNaN(Date.parse(evidence.confirmedAt))) {
    errors.push("La fecha de confirmacion OCR no es valida.");
  }
  return errors;
}

export function reprintLabel(reprintNumber: number): string {
  if (!Number.isInteger(reprintNumber) || reprintNumber < 1) {
    throw new Error("El numero de reimpresion debe ser un entero positivo.");
  }
  return `REIMPRESION ${reprintNumber}`;
}
