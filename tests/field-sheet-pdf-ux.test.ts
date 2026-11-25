import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderFieldSheetPdf } from "../src/lib/documents/pdf/renderer";

const rendererUrl = new URL("../src/lib/documents/pdf/renderer.ts", import.meta.url);

test("el PDF conserva el QR y una identidad manual verificable", async () => {
  const bytes = await renderFieldSheetPdf({
    numeroControl: "2026-00001-HC-R01",
    revision: 1,
    tokenQr: "a".repeat(43),
    emitidaEn: new Date("2026-10-21T15:00:00-05:00"),
    identidad: { nombreComercial: "Ensalia" },
    muestra: {
      idMuestra: "LAB-20261021-001",
      fechaMuestreo: "2026-10-21T12:00:00-05:00",
      cliente: "Cliente de prueba",
      obra: "Obra de prueba",
      noMuestra: "M-001",
      tipoConcreto: "Convencional",
    },
  });

  assert.equal(Buffer.from(bytes.subarray(0, 5)).toString(), "%PDF-");
  assert.ok(bytes.byteLength > 5_000, "el PDF debe contener la hoja y el QR");
});

test("el QR tiene instrucciones humanas y alternativa manual", async () => {
  const source = await readFile(rendererUrl, "utf8");

  assert.match(
    source,
    /escanea(?:r)?[\s\S]{0,120}(?:abrir|consultar|validar|identificar)[\s\S]{0,120}(?:muestra|documento)/i,
    "junto al QR debe explicarse con un verbo de acción qué ocurrirá al escanearlo",
  );
  assert.match(
    source,
    /(?:si no (?:puedes|es posible) escanear|alternativa manual|busca(?:r)? manualmente)[\s\S]{0,180}(?:folio|numero de control|número de control)/i,
    "el PDF debe indicar cómo localizar la muestra sin usar el QR",
  );
});

test("las etiquetas principales usan lenguaje comprensible para campo", async () => {
  const source = await readFile(rendererUrl, "utf8");

  for (const [description, pattern] of [
    ["folio", /folio de muestra/i],
    ["fecha", /fecha de muestreo/i],
    ["mediciones", /(?:datos|mediciones) en campo/i],
    ["especímenes", /especimenes y moldes/i],
    ["molde", /codigo del molde/i],
    ["observaciones", /observaciones e incidencias/i],
    ["firma del técnico", /tecnico de campo/i],
  ] as const) {
    assert.match(source, pattern, `falta la etiqueta operativa: ${description}`);
  }
});

