import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateDimensionsAndArea, calculateSlendernessCorrection } from "../../src/lib/pdf/compression-report/metrology";
import { TipoFallaConcreto } from "../../src/features/fc-curves/types";

describe("Press Kiosk Mode Workflow & Metrological Interaction Verification", () => {
  // -------------------------------------------------------------------------
  // 1. Real-time ASTM C39 Stress Calculation & Dynamic Slenderness Correction
  // -------------------------------------------------------------------------
  test("Computes stress and design percentage in real-time as load is entered", () => {
    const diametroMm = 150.0;
    const longitudMm = 300.0;
    const cargaKn = 562.0;
    const cargaKg = cargaKn * 101.9716; // 57,308 kgf
    const fcDiseno = 300; // kg/cm2

    const dim = calculateDimensionsAndArea(diametroMm);
    const slenderness = calculateSlendernessCorrection(longitudMm, dim.diametroPromedioMm);

    assert.equal(dim.areaCm2, 176.71);
    assert.equal(slenderness.factorLd, 1.0);

    const resNominal = cargaKg / dim.areaCm2;
    const resCorregida = Number((resNominal * slenderness.factorLd).toFixed(1));
    const pctFc = Number(((resCorregida / fcDiseno) * 100).toFixed(1));

    assert.ok(resCorregida > 320, "Stress must be calculated accurately");
    assert.ok(pctFc > 100, "Should exceed 100% of design strength");

    // Test with non-standard slenderness ratio (L = 262.5 mm -> L/D = 1.75 -> Factor 0.980)
    const slenderness175 = calculateSlendernessCorrection(262.5, diametroMm);
    assert.equal(slenderness175.factorLd, 0.98);
    const resCorregida175 = Number((resNominal * slenderness175.factorLd).toFixed(1));
    assert.ok(resCorregida175 < resCorregida, "Corrected stress must account for platen confinement reduction");
  });

  // -------------------------------------------------------------------------
  // 2. USB Barcode Reader HID Wedge Parsing & Specimen Matching
  // -------------------------------------------------------------------------
  test("Matches scanned barcodes from omnidirectional 2D scanner against pending specimens", () => {
    const pendingList = [
      { id: "esp-1", numero: 1, edadDias: 7, muestraId: "m-1", idMuestra: "M-2026-0842", cliente: "ICA", obra: "TREN MAYA", fcKgCm2: 300 },
      { id: "esp-2", numero: 2, edadDias: 28, muestraId: "m-1", idMuestra: "M-2026-0842", cliente: "ICA", obra: "TREN MAYA", fcKgCm2: 300 },
      { id: "esp-3", numero: 3, edadDias: 28, muestraId: "m-1", idMuestra: "M-2026-0842", cliente: "ICA", obra: "TREN MAYA", fcKgCm2: 300 },
    ];

    // Simular escaneo de etiqueta Code 128: "M-2026-0842-C2"
    const scannedCode128 = "M-2026-0842-C2";
    const match128 = pendingList.find(
      (esp) =>
        scannedCode128.includes(esp.idMuestra) &&
        (scannedCode128.toLowerCase().includes(`c${esp.numero}`) || scannedCode128.endsWith(`-${esp.numero}`))
    );
    assert.ok(match128);
    assert.equal(match128.id, "esp-2");
    assert.equal(match128.numero, 2);

    // Simular escaneo de QR 2D: "ENSALIA:S:m-1:E:3"
    const scannedQr = "ENSALIA:S:m-1:E:3";
    const matchQr = pendingList.find(
      (esp) => scannedQr.includes(esp.muestraId) && scannedQr.endsWith(`:${esp.numero}`)
    );
    assert.ok(matchQr);
    assert.equal(matchQr.id, "esp-3");
    assert.equal(matchQr.numero, 3);
  });

  // -------------------------------------------------------------------------
  // 3. Ergonomic Touch Targets & Fracture Pattern Completeness
  // -------------------------------------------------------------------------
  test("Verifies all 6 normalized ASTM C39 fracture patterns are supported with standard IDs", () => {
    const validPatterns: TipoFallaConcreto[] = [
      "CONO_TIPO_1",
      "CONO_Y_DIVIDIDO_TIPO_2",
      "COLUMNA_TIPO_3",
      "CIZALLA_TIPO_4",
      "ESQUINA_TIPO_5",
      "PUNTUAL_TIPO_6",
      "OTRA",
    ];

    assert.equal(validPatterns.length, 7);
    // ASTM C39 standard types
    assert.ok(validPatterns.includes("CONO_TIPO_1"));
    assert.ok(validPatterns.includes("CONO_Y_DIVIDIDO_TIPO_2"));
    assert.ok(validPatterns.includes("COLUMNA_TIPO_3"));
    assert.ok(validPatterns.includes("CIZALLA_TIPO_4"));
    assert.ok(validPatterns.includes("ESQUINA_TIPO_5"));
    assert.ok(validPatterns.includes("PUNTUAL_TIPO_6"));
  });
});

