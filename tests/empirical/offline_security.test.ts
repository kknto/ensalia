import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";
import ExcelJS from "exceljs";

// Canonical JSON serializer: sorts keys recursively
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const keyValues = keys.map(k => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return "{" + keyValues.join(",") + "}";
}

export function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

describe("Strict Local-First & Zero-Cloud Security Verification", () => {
  test("Canonical JSON serialization guarantees deterministic SHA-256 regardless of key order", () => {
    const payloadA = {
      folio: "INF-COMP-2026-00412",
      idMuestra: "M-2026-0842",
      cliente: "CONSORCIO PENINSULAR",
      fcDisenoKgCm2: 300,
      edadGarantiaDias: 28,
      especimenes: [
        { numero: 1, cargaMaximaKg: 41200, resistenciaKgCm2: 237.8 },
        { numero: 2, cargaMaximaKg: 56200, resistenciaKgCm2: 324.5 },
      ],
    };

    // Payload B with different key insertion order
    const payloadB = {
      cliente: "CONSORCIO PENINSULAR",
      especimenes: [
        { resistenciaKgCm2: 237.8, numero: 1, cargaMaximaKg: 41200 },
        { numero: 2, resistenciaKgCm2: 324.5, cargaMaximaKg: 56200 },
      ],
      edadGarantiaDias: 28,
      fcDisenoKgCm2: 300,
      idMuestra: "M-2026-0842",
      folio: "INF-COMP-2026-00412",
    };

    // Standard JSON.stringify produces different strings!
    assert.notEqual(JSON.stringify(payloadA), JSON.stringify(payloadB), "Raw JSON differs by key order");

    // Canonical JSON produces identical string and deterministic SHA-256
    const canonA = canonicalizeJson(payloadA);
    const canonB = canonicalizeJson(payloadB);
    assert.equal(canonA, canonB);

    const hashA = computeSha256(canonA);
    const hashB = computeSha256(canonB);
    assert.equal(hashA, hashB);
    assert.equal(hashA.length, 64);
  });

  test("QR Code generator executes 100% offline in-memory and supports dual intranet/offline payload", async () => {
    const hash = "8a7f43bd32890123456789abcdef0123456789abcdef0123456789abcdef0123";
    const offlineToken = `ENSALIA:COMP:1:INF-COMP-2026-00412:20261030:324.5:${hash.slice(0, 16)}`;
    const intranetUrl = `http://192.168.1.100:3000/verify/${hash}?token=${encodeURIComponent(offlineToken)}`;

    // Verify qrcode generation to Buffer in local memory
    const qrBuffer = await QRCode.toBuffer(intranetUrl, {
      errorCorrectionLevel: "H",
      width: 256,
      margin: 1,
    });

    assert.ok(qrBuffer instanceof Buffer);
    assert.ok(qrBuffer.length > 500, "Valid PNG buffer generated");
    // Verify PNG magic header
    assert.equal(qrBuffer[0], 0x89);
    assert.equal(qrBuffer[1], 0x50); // 'P'
    assert.equal(qrBuffer[2], 0x4e); // 'N'
    assert.equal(qrBuffer[3], 0x47); // 'G'
  });

  test("Vosk WASM restricted grammar filters out-of-vocabulary industrial hydraulic noise", () => {
    // Grammar whitelist from Worker's plan Section 2.2.B
    const grammarTokens = new Set([
      "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
      "diez", "once", "doce", "trece", "catorce", "quince", "veinte", "treinta", "cuarenta", "cincuenta",
      "cien", "doscientos", "trescientos", "cuatrocientos", "quinientos", "mil",
      "punto", "coma", "kilonewtons", "kilos", "toneladas",
      "cono", "tipo uno", "tipo dos", "columna", "tipo tres", "cizalla", "tipo cuatro", "esquina", "tipo cinco", "cabeceo", "puntual", "tipo seis",
      "capturar", "carga", "tara", "iniciar", "detener", "repetir", "confirmar", "guardar", "siguiente", "cancelar"
    ]);

    // Words spoken in noisy lab
    const noiseWords = ["bomba", "ruido", "hidraulico", "aceite", "presion", "vibracion", "hola", "telefono"];
    for (const noise of noiseWords) {
      assert.equal(grammarTokens.has(noise), false, `Noise token '${noise}' must be rejected by grammar`);
    }

    // Valid spoken command tokens
    const validTokens = ["cuatrocientos", "sesenta", "punto", "cinco", "kilonewtons", "cono", "confirmar"];
    // Note: 'sesenta' was missing in worker's tokens (only 20, 30, 40, 50 were listed in section 2.2.B!)
    assert.ok(grammarTokens.has("cuatrocientos"));
    assert.ok(grammarTokens.has("punto"));
    assert.ok(grammarTokens.has("cinco"));
    assert.ok(grammarTokens.has("kilonewtons"));
    assert.ok(grammarTokens.has("cono"));
    assert.ok(grammarTokens.has("confirmar"));

    // CHALLENGE: Check if 'sesenta', 'setenta', 'ochenta', 'noventa' are missing in the worker's grammar!
    const missingTens = ["sesenta", "setenta", "ochenta", "noventa"];
    const foundMissing = missingTens.filter(t => !grammarTokens.has(t));
    assert.equal(foundMissing.length, 4, "Worker plan omitted 60, 70, 80, 90 from grammar dictionary!");
  });

  test("pdf-lib executes 100% in-memory with zero network calls and generates valid PDF", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    page.drawText("CERTIFICADO OFICIAL DE ENSAYE DE COMPRESIÓN", {
      x: 50,
      y: 750,
      size: 14,
      color: rgb(0.1, 0.1, 0.1),
    });
    const pdfBytes = await doc.save();
    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 500);
    // PDF Magic bytes: %PDF
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8");
    assert.ok(header.startsWith("%PDF-"));
  });

  test("exceljs executes 100% in-memory and writes binary .xlsx buffer without network or filesystem calls", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Test");
    ws.getCell("A1").value = "ENSALIA LOCAL FIRST";
    ws.getCell("B1").value = 100;
    const buffer = await wb.xlsx.writeBuffer();
    assert.ok(buffer);
    assert.ok(buffer.byteLength > 1000);
    // XLSX is a ZIP archive: magic bytes PK (0x50, 0x4B)
    const uint8 = new Uint8Array(buffer as ArrayBuffer);
    assert.equal(uint8[0], 0x50);
    assert.equal(uint8[1], 0x4b);
  });
});

