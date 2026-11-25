import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionFieldDocument,
  ocrEvidenceRequiresReview,
  reprintLabel,
  validateFieldCorrection,
  validateFieldDocumentIdentity,
  validateOcrEvidence,
} from "../src/lib/field-document-control";

test("un documento emitido sigue una cadena de custodia controlada", () => {
  assert.equal(canTransitionFieldDocument("EMITIDA", "ENTREGADA"), true);
  assert.equal(canTransitionFieldDocument("ENTREGADA", "DEVUELTA"), true);
  assert.equal(canTransitionFieldDocument("DEVUELTA", "VERIFICADA"), false);
  assert.equal(canTransitionFieldDocument("CERRADA", "ESCANEADA"), false);
});

test("la identidad exige folio, revision, paginacion y hash verificable", () => {
  const valid = validateFieldDocumentIdentity({
    folio: "HC-2026-00001",
    formatCode: "FOR-TEC-001",
    formatRevision: "03",
    issuedAt: "2026-10-20T15:30:00-05:00",
    sampleId: "muestra-1",
    page: 1,
    pageCount: 2,
    pdfSha256: "a".repeat(64),
  });
  assert.deepEqual(valid, []);

  const invalid = validateFieldDocumentIdentity({
    folio: " ",
    formatCode: "",
    formatRevision: "",
    issuedAt: "sin-fecha",
    sampleId: "",
    page: 2,
    pageCount: 1,
    pdfSha256: "no-es-un-hash",
  });
  assert.equal(invalid.length, 7);
});

test("una correccion conserva valor anterior, motivo, autor y fecha", () => {
  assert.deepEqual(validateFieldCorrection({
    previousValue: "12.0",
    correctedValue: "12.8",
    reason: "Error de transcripcion",
    correctedBy: "tecnico-1",
    correctedAt: "2026-10-20T16:00:00-05:00",
  }), []);

  assert.equal(validateFieldCorrection({
    previousValue: "",
    correctedValue: "12.8",
    reason: "",
    correctedBy: "",
    correctedAt: "ayer",
  }).length, 4);
});

test("todo dato OCR requiere confirmacion y los campos criticos nunca se autopublican", () => {
  assert.equal(ocrEvidenceRequiresReview({ fieldId: "temperatura", rawValue: "23", confidence: 0.99, critical: true }), true);
  assert.equal(ocrEvidenceRequiresReview({
    fieldId: "temperatura",
    rawValue: "23",
    confidence: 0.99,
    critical: true,
    confirmedBy: "revisor-1",
    confirmedAt: "2026-10-20T17:00:00-05:00",
  }), false);
  assert.equal(ocrEvidenceRequiresReview({
    fieldId: "observaciones",
    rawValue: "Sin novedad",
    confidence: 0.7,
    critical: false,
    confirmedBy: "revisor-1",
    confirmedAt: "2026-10-20T17:00:00-05:00",
  }), true);
});

test("la evidencia OCR rechaza confianza fuera de rango y confirmacion anonima", () => {
  assert.equal(validateOcrEvidence({ fieldId: "revenimiento", rawValue: "10", confidence: 1.1, critical: true }).length, 1);
  assert.equal(validateOcrEvidence({
    fieldId: "revenimiento",
    rawValue: "10",
    confidence: 0.95,
    critical: true,
    confirmedAt: "2026-10-20T17:00:00-05:00",
  }).length, 1);
});

test("la reimpresion siempre queda identificada", () => {
  assert.equal(reprintLabel(2), "REIMPRESION 2");
  assert.throws(() => reprintLabel(0));
});
