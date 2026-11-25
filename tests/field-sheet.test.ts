import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { fieldSheetQrPayload, renderFieldSheetPdf, renderPourFieldSheetPackage } from "../src/lib/documents/pdf/renderer";
import { resolveDocumentPath } from "../src/lib/documents/storage";
import { cancelFieldSheetSchema, issueFieldSheetSchema } from "../src/lib/documents/schema";

test("genera una hoja Carta PDF local con QR y datos de la muestra", async () => {
  const bytes = await renderFieldSheetPdf({
    numeroControl: "2026-00001-HC-R01", revision: 1, tokenQr: "A".repeat(43),
    emitidaEn: new Date("2026-10-20T18:00:00.000Z"), identidad: { nombreComercial: "Ensalia", razonSocial: "Laboratorio demostrativo" },
    muestra: { idMuestra: "2026-00001", fechaMuestreo: "2026-10-20T12:00:00.000Z", cliente: "Cliente", obra: "Obra", noMuestra: "EXT-01", tipoConcreto: "Convencional", especimenes: [{ numero: 1, tipo: "CILINDRO_15X30", edadDias: 28 }] },
  });
  assert.equal(Buffer.from(bytes.subarray(0, 5)).toString(), "%PDF-");
  assert.ok(bytes.byteLength > 5_000);
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
});

test("el QR usa el contrato versionado y exige un token de 256 bits base64url", () => {
  const token = "Abcdefghijklmnopqrstuvwxyz0123456789_-ABCDE";
  assert.equal(token.length, 43);
  assert.equal(fieldSheetQrPayload(token), `ENSALIA:HC:1:${token}`);
  assert.throws(() => fieldSheetQrPayload("token-corto"), /no valido/i);
});

test("pagina los especimenes sin mezclar la tabla con firmas", async () => {
  const bytes = await renderFieldSheetPdf({
    numeroControl: "2026-00002-HC-R01", revision: 1, tokenQr: "B".repeat(43), emitidaEn: new Date("2026-10-20T18:00:00.000Z"), identidad: { nombreComercial: "Ensalia" },
    muestra: { idMuestra: "2026-00002", fechaMuestreo: "2026-10-20", cliente: "Cliente", obra: "Obra", noMuestra: "EXT-02", especimenes: Array.from({ length: 13 }, (_, index) => ({ id: `e-${index}`, numero: index + 1, tipo: "CILINDRO_15X30", edadDias: 28 })) },
  });
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 2);
});

test("compone un paquete de colado con una pagina autosuficiente por muestra normal", async () => {
  const common = { fechaMuestreo: "2026-10-21", cliente: "Cliente comun", obra: "Obra comun", tipoConcreto: "Convencional" };
  const samples = [1, 2].map((number) => ({
    numeroControl: `COL-01-M${number}-R01`, revision: 1, tokenQr: String(number).repeat(43), emitidaEn: new Date("2026-10-21T18:00:00.000Z"), identidad: { nombreComercial: "Ensalia" }, filasEspecimenObjetivo: 4,
    muestra: { idMuestra: `M-${number}`, fechaMuestreo: "2026-10-21", cliente: "", obra: "", noMuestra: `EXT-${number}`, especimenes: Array.from({ length: 4 }, (_, index) => ({ numero: index + 1, tipo: "CILINDRO_15X30", edadDias: 28 })) },
  }));
  const bytes = await renderPourFieldSheetPackage({ folioColado: "COL-01", datosComunes: common, muestras: samples });
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 2);
});

test("valida emision, anulacion y rutas documentales administradas", () => {
  assert.equal(issueFieldSheetSchema.safeParse({ versionMuestra: 0 }).success, true);
  assert.equal(issueFieldSheetSchema.safeParse({ versionMuestra: -1 }).success, false);
  assert.equal(cancelFieldSheetSchema.safeParse({ motivo: "no" }).success, false);
  assert.throws(() => resolveDocumentPath("../fuera.pdf"), /no permitida/i);
  assert.match(resolveDocumentPath("field-sheets/emision-1/original.pdf"), /field-sheets[\\/]emision-1[\\/]original\.pdf$/);
  assert.match(resolveDocumentPath("field-sheets/emision-1/scans/captura-1.jpg"), /field-sheets[\\/]emision-1[\\/]scans[\\/]captura-1\.jpg$/);
  assert.throws(() => resolveDocumentPath("field-sheets/emision-1/scans/../../fuera.jpg"), /no permitida/i);
});
