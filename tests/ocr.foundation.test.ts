import assert from "node:assert/strict";
import test from "node:test";
import { ManualReviewEngine, chooseOcrEngine } from "../src/lib/ocr/engine";
import { MAX_OCR_FILE_BYTES, OcrFileError, validateOcrUpload } from "../src/lib/ocr/files";
import { evaluateImageQuality } from "../src/lib/ocr/quality";
import { confirmReview, createReviewSession, OcrReviewError, reviewField } from "../src/lib/ocr/review";
import type { OcrTemplate } from "../src/lib/ocr/types";

const png = (width = 1600, height = 2200) => {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
};

const template: OcrTemplate = {
  key: "campo-v1", version: 1, pageCount: 1,
  regions: [{ key: "temperatura", label: "Temperatura", valueType: "NUMBER", required: true, box: { x: 0.1, y: 0.2, width: 0.2, height: 0.1, page: 1 } }],
};

test("valida firma real, MIME, nombre seguro y hash", () => {
  const file = validateOcrUpload(png(), "image/png", "../captura\u0000.png");
  assert.equal(file.mime, "image/png");
  assert.equal(file.originalName, "captura.png");
  assert.deepEqual(file.dimensions, { width: 1600, height: 2200 });
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => validateOcrUpload(png(), "image/jpeg", "foto.jpg"), OcrFileError);
});

test("rechaza archivos vacíos, sobredimensionados y PDF activo", () => {
  assert.throws(() => validateOcrUpload(new Uint8Array(), "image/png", "x.png"), /vacío/);
  assert.throws(() => validateOcrUpload(new Uint8Array(MAX_OCR_FILE_BYTES + 1), "", "x.bin"), (error: unknown) => error instanceof OcrFileError && error.status === 413);
  const activePdf = new TextEncoder().encode("%PDF-1.7\n/Type /Page\n/OpenAction 1 0 R\n%%EOF");
  assert.throws(() => validateOcrUpload(activePdf, "application/pdf", "x.pdf"), /no permitidas/);
});

test("quality gate rechaza capturas deficientes y no inventa métricas", () => {
  assert.equal(evaluateImageQuality({ width: 800, height: 1000 }).verdict, "REJECTED");
  const unknown = evaluateImageQuality({ templateLocated: false });
  assert.equal(unknown.verdict, "REVIEW_REQUIRED");
  assert.ok(unknown.issues.some((issue) => issue.code === "METRICS_UNAVAILABLE"));
});

test("fallback exige revisión manual y nunca inventa valores", async () => {
  const engine = await chooseOcrEngine([]);
  assert.ok(engine instanceof ManualReviewEngine);
  const result = await engine.analyze({ bytes: png(), mime: "image/png", sha256: "a".repeat(64), template });
  assert.equal(result.status, "MANUAL_REQUIRED");
  assert.equal(result.fields[0].proposedValue, null);
});

test("confirmación exige revisión de todos los campos y controla concurrencia", async () => {
  const result = await new ManualReviewEngine().analyze({ bytes: png(), mime: "image/png", sha256: "a".repeat(64), template });
  const session = createReviewSession("doc-1", template, result);
  assert.throws(() => confirmReview(session, 1), /Revise todos/);
  const reviewed = reviewField(session, "temperatura", 24.5, "operador-1", 1);
  assert.throws(() => reviewField(reviewed, "temperatura", 25, "operador-1", 1), (error: unknown) => error instanceof OcrReviewError && error.status === 409);
  const confirmed = confirmReview(reviewed, 2);
  assert.equal(confirmed.state, "CONFIRMADO");
});
