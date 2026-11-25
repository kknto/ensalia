import assert from "node:assert/strict";
import test from "node:test";
import {
  FIELD_SHEET_QR_PREFIX,
  hashFieldSheetQrToken,
  isFieldSheetVerificationAuthorized,
  parseFieldSheetQrPayload,
} from "../src/lib/documents/qr-verification";

const TOKEN = "a".repeat(43);

test("parsea exclusivamente el contrato QR ENSALIA HC version 1", () => {
  assert.deepEqual(parseFieldSheetQrPayload(`${FIELD_SHEET_QR_PREFIX}${TOKEN}`), { version: 1, token: TOKEN });
  assert.equal(parseFieldSheetQrPayload(`ENSALIA-HC:${TOKEN}:1`), null);
  assert.equal(parseFieldSheetQrPayload(`ENSALIA:HC:2:${TOKEN}`), null);
  assert.equal(parseFieldSheetQrPayload("ENSALIA:HC:1:token corto"), null);
  assert.equal(parseFieldSheetQrPayload(null), null);
});

test("genera el hash determinista del token sin exponer el token", () => {
  const hash = hashFieldSheetQrToken(TOKEN);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, hashFieldSheetQrToken(TOKEN));
  assert.notEqual(hash, hashFieldSheetQrToken(`${TOKEN}x`));
  assert.equal(hash.includes(TOKEN), false);
});

test("la verificacion exige codigo solo cuando la instalacion lo configura", () => {
  assert.equal(isFieldSheetVerificationAuthorized({ required: false }), true);
  assert.equal(isFieldSheetVerificationAuthorized({ required: true }), true);
  assert.equal(isFieldSheetVerificationAuthorized({ required: true, expectedCode: "secreto", suppliedCode: null }), false);
  assert.equal(isFieldSheetVerificationAuthorized({ required: true, expectedCode: "secreto", suppliedCode: "incorrecto" }), false);
  assert.equal(isFieldSheetVerificationAuthorized({ required: true, expectedCode: "secreto", suppliedCode: "secreto" }), true);
});

test("el endpoint selecciona y devuelve una superficie sin PII ni evidencia sensible", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile(
    new URL("../src/app/api/hojas-campo/verificar/route.ts", import.meta.url),
    "utf8",
  ));
  const selected = source.match(/select:\s*\{([\s\S]*?)\n\s*\},\n\s*\}\);/)?.[1];
  assert.ok(selected, "El endpoint debe limitar explicitamente la consulta con select");
  for (const forbidden of ["cliente:", "obra:", "rutaPdf:", "pdfSha256:", "tokenQrHash:", "datosSnapshotJson:"]) {
    assert.equal(selected.includes(forbidden), false, `La respuesta no debe seleccionar ${forbidden}`);
  }
});

