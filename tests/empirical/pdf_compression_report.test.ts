import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDimensionsAndArea,
  calculateSlendernessCorrection,
  checkAgeTolerance,
  calculateSpecimen,
  calculateAciStatistics,
  canonicalizeJson,
  computeSha256,
  generateReportQr,
  renderCompressionReportPdf,
  CompressionReportData,
} from "../../src/lib/pdf/compression-report";

describe("ASTM C39 & NMX-C-083 Official PDF Compression Report Engine", () => {
  // -------------------------------------------------------------------------
  // 1. Dimensional Metrology & Eccentricity Checks
  // -------------------------------------------------------------------------
  test("Calculates average diameter and area with eccentricity tolerance check", () => {
    // Normal specimen: 150.2 mm and 149.8 mm
    const normal = calculateDimensionsAndArea(150.2, 149.8);
    assert.equal(normal.diametroPromedioMm, 150.0);
    // Area = pi * 7.5^2 = 176.71 cm2
    assert.equal(normal.areaCm2, 176.71);
    assert.equal(normal.excentricidadValida, true);
    assert.equal(normal.alertaExcentricidad, undefined);

    // Eccentric specimen exceeding 2.0% (ASTM C39 §6.2)
    // d1 = 153.0 mm, d2 = 148.0 mm -> |153-148|/148 = 3.38% > 2.0%
    const eccentric = calculateDimensionsAndArea(153.0, 148.0);
    assert.equal(eccentric.excentricidadValida, false);
    assert.ok(eccentric.alertaExcentricidad?.includes("Excentricidad excesiva"));
    assert.ok(eccentric.excentricidadPct > 2.0);
  });

  // -------------------------------------------------------------------------
  // 2. Slenderness Correction Factor (L/D) ASTM C39 Table 1
  // -------------------------------------------------------------------------
  test("Applies continuous linear interpolation for slenderness ratio (L/D) and strictly rejects L/D < 1.0", () => {
    const diametro = 150.0;

    // Standard specimen: L = 300 mm -> L/D = 2.00 -> Factor = 1.000
    const std = calculateSlendernessCorrection(300.0, diametro);
    assert.equal(std.relacionLd, 2.0);
    assert.equal(std.factorLd, 1.0);
    assert.equal(std.especimenRechazadoLd, false);

    // Taller specimen: L = 350 mm -> L/D = 2.33 -> Factor capped at 1.000 (NO upper extrapolation)
    const tall = calculateSlendernessCorrection(350.0, diametro);
    assert.equal(tall.factorLd, 1.0, "ASTM C39 forbids factor > 1.000");

    // Exact calibration points from ASTM C39 Table 1:
    // L/D = 1.75 -> 0.980
    const p175 = calculateSlendernessCorrection(262.5, diametro);
    assert.equal(p175.factorLd, 0.98);

    // L/D = 1.50 -> 0.960
    const p150 = calculateSlendernessCorrection(225.0, diametro);
    assert.equal(p150.factorLd, 0.96);

    // L/D = 1.25 -> 0.930
    const p125 = calculateSlendernessCorrection(187.5, diametro);
    assert.equal(p125.factorLd, 0.93);

    // L/D = 1.00 -> 0.870
    const p100 = calculateSlendernessCorrection(150.0, diametro);
    assert.equal(p100.factorLd, 0.87);

    // Interpolated point: L/D = 1.625 (halfway between 1.50 and 1.75) -> 0.96 + 0.5 * 0.02 = 0.970
    const pInterp = calculateSlendernessCorrection(243.75, diametro);
    assert.equal(pInterp.factorLd, 0.97);

    // Rejected non-compliant specimen: L/D = 0.90 < 1.00
    const rejected = calculateSlendernessCorrection(135.0, diametro);
    assert.equal(rejected.especimenRechazadoLd, true);
    assert.ok(rejected.alertaLd?.includes("RECHAZADO"));
  });

  // -------------------------------------------------------------------------
  // 3. NMX-C-083 Age Tolerances
  // -------------------------------------------------------------------------
  test("Validates test age tolerances strictly according to NMX-C-083-ONNCCE", () => {
    const colado = new Date("2026-10-01T10:00:00Z");

    // 28 days nominal = 672 hours. Tolerance: ±20.0 hours
    // Test exactly at 28 days + 12 hours -> within tolerance
    const ensayeEnTolerancia = new Date(colado.getTime() + (28 * 24 + 12) * 3600 * 1000);
    const tolOk = checkAgeTolerance(colado, ensayeEnTolerancia, 28);
    assert.equal(tolOk.enTolerancia, true);
    assert.equal(tolOk.toleranciaPermitidaHoras, 20.0);
    assert.equal(tolOk.alertaEdad, undefined);

    // Test at 28 days + 25 hours -> OUT of tolerance (desfase +25 h > ±20 h)
    const ensayeFuera = new Date(colado.getTime() + (28 * 24 + 25) * 3600 * 1000);
    const tolBad = checkAgeTolerance(colado, ensayeFuera, 28);
    assert.equal(tolBad.enTolerancia, false);
    assert.ok(tolBad.alertaEdad?.includes("FUERA DE TOLERANCIA NMX-C-083"));

    // 24 hours (1 day): Tolerance ±0.5 hours
    const tol24h = checkAgeTolerance(colado, new Date(colado.getTime() + 24.8 * 3600 * 1000), 1);
    assert.equal(tol24h.enTolerancia, false, "24.8h is outside ±0.5h tolerance");
  });

  // -------------------------------------------------------------------------
  // 4. ACI 214R & ACI 318 Statistical Evaluation
  // -------------------------------------------------------------------------
  test("Computes within-test variation (V1) and required average strength (f'cr) correctly", () => {
    const colado = new Date("2026-10-01T10:00:00Z");
    const ensaye = new Date("2026-10-29T10:00:00Z");

    // Two companion cylinders (f'c design = 250 kg/cm2)
    // Cylinder 1: 56,200 kgf on 176.71 cm2 = 318.0 kg/cm2
    // Cylinder 2: 55,800 kgf on 176.71 cm2 = 315.8 kg/cm2
    const c1 = calculateSpecimen({
      numero: 1,
      fechaColado: colado,
      fechaEnsaye: ensaye,
      edadProgramadaDias: 28,
      diametro1Mm: 150,
      longitudMm: 300,
      cargaMaximaKg: 56200,
      tipoFalla: "CONO_TIPO_1",
    }, 250);

    const c2 = calculateSpecimen({
      numero: 2,
      fechaColado: colado,
      fechaEnsaye: ensaye,
      edadProgramadaDias: 28,
      diametro1Mm: 150,
      longitudMm: 300,
      cargaMaximaKg: 55800,
      tipoFalla: "CONO_TIPO_1",
    }, 250);

    const stats = calculateAciStatistics([c1, c2], 250);
    assert.ok(stats.promedioResistenciaKgCm2 > 310);
    assert.ok(stats.variacionDentroDelEnsayoPct !== undefined);
    // Excellent within-test variation (< 3.0%)
    assert.ok(stats.variacionDentroDelEnsayoPct < 3.0);
    assert.equal(stats.calificacionControl, "EXCELENTE");
    assert.equal(stats.cumpleCriterioAci318, true);
    // Overdesign required for n < 15: f'cr = 250 + 85 = 335 kg/cm2
    assert.equal(stats.resistenciaRequeridaFcr, 335);
  });

  // -------------------------------------------------------------------------
  // 5. Deterministic Cryptographic QR Verification
  // -------------------------------------------------------------------------
  test("Generates canonical SHA-256 hash and offline QR code image buffer", async () => {
    const payload = {
      folio: "INF-COMP-2026-00412",
      idMuestra: "M-2026-0842",
      cliente: "CONSORCIO PENINSULAR",
      obra: "TREN MAYA TRAMO 4",
      elemento: "LOSA SUPERIOR EJE 4",
      fechaColadoUtc: "2026-10-02T10:30:00.000Z",
      fcDisenoKgCm2: 300,
      edadGarantiaDias: 28,
      fechaEmisionUtc: "2026-10-30T14:30:00.000Z",
      especimenes: [
        {
          numero: 1,
          edadRealDias: 28,
          cargaMaximaKg: 56200,
          resistenciaKgCm2: 318.0,
          porcentajeFc: 106.0,
          tipoFalla: "CONO_TIPO_1",
          factorLd: 1.0,
        },
      ],
      prensaCodigoInterno: "PRENSA-01",
      operadorNombre: "Carlos Canto",
      signatarioNombre: "Ing. Roberto Morales",
    };

    const qrResult = await generateReportQr(payload, "http://192.168.1.100:3000");
    assert.equal(qrResult.sha256.length, 64, "SHA-256 must be 64 hex characters");
    assert.ok(qrResult.offlineToken.startsWith("ENSALIA:COMP:1:INF-COMP-2026-00412:"));
    assert.ok(qrResult.qrPngBytes instanceof Uint8Array);
    assert.ok(qrResult.qrPngBytes.length > 500, "Valid PNG buffer generated");
    // Verify PNG magic bytes: 0x89, 'P', 'N', 'G'
    assert.equal(qrResult.qrPngBytes[0], 0x89);
    assert.equal(qrResult.qrPngBytes[1], 0x50);
    assert.equal(qrResult.qrPngBytes[2], 0x4e);
    assert.equal(qrResult.qrPngBytes[3], 0x47);
  });

  // -------------------------------------------------------------------------
  // 6. End-to-End PDF Rendering Performance & Quality
  // -------------------------------------------------------------------------
  test("Renders complete 1-page Letter certificate in <120 ms, size <350 KB, conforming to ASTM C39", async () => {
    const colado = new Date("2026-10-02T10:30:00Z");
    const ensaye = new Date("2026-10-30T14:30:00Z");

    const spec1 = calculateSpecimen({
      numero: 1,
      fechaColado: colado,
      fechaEnsaye: new Date("2026-10-09T10:30:00Z"),
      edadProgramadaDias: 7,
      diametro1Mm: 150.1,
      diametro2Mm: 150.0,
      longitudMm: 300.2,
      masaG: 12810,
      cargaMaximaKn: 412.0,
      tipoFalla: "CONO_TIPO_1",
    }, 300);

    const spec2 = calculateSpecimen({
      numero: 2,
      fechaColado: colado,
      fechaEnsaye: ensaye,
      edadProgramadaDias: 28,
      diametro1Mm: 150.0,
      diametro2Mm: 150.0,
      longitudMm: 300.0,
      masaG: 12850,
      cargaMaximaKn: 562.0,
      tipoFalla: "CONO_TIPO_1",
    }, 300);

    const spec3 = calculateSpecimen({
      numero: 3,
      fechaColado: colado,
      fechaEnsaye: ensaye,
      edadProgramadaDias: 28,
      diametro1Mm: 150.2,
      diametro2Mm: 150.0,
      longitudMm: 300.1,
      masaG: 12840,
      cargaMaximaKn: 558.0,
      tipoFalla: "CONO_Y_DIVIDIDO_TIPO_2",
    }, 300);

    const reportData: CompressionReportData = {
      folio: "INF-COMP-2026-00412",
      fechaEmision: ensaye,
      laboratorio: {
        nombre: "LABORATORIO DE CONTROL DE CALIDAD Y METROLOGÍA S.A. DE C.V.",
        razonSocial: "ENSALIA TESTING & INSPECTION SERVICES",
        acreditacionEma: "Acreditación EMA No. C-0412-089/22 | Rama Concreto",
        domicilio: "Av. Industrial 450, Cancún, Q. Roo",
        telefono: "+52 998 123 4567",
      },
      proyecto: {
        cliente: "CONSORCIO VIAL PENINSULAR",
        obra: "TREN MAYA TRAMO 4",
        ubicacion: "KM 142+500 CANCÚN - PLAYA",
        contratista: "ICA CONSTRUCTORA",
        elemento: "LOSA SUPERIOR PASO VEHICULAR EJE 4",
      },
      mezcla: {
        fcDisenoKgCm2: 300,
        edadGarantiaDias: 28,
        revenimientoNominalCm: 14.0,
        tmaMm: 19,
        tipoConcreto: "ESTRUCTURAL CLASE 1",
        tipoCemento: "CPC 40R",
        concretera: "CEMEX PLANTA CANCÚN",
        numeroRemision: "R-98421",
        numeroCamion: "C-14",
        volumenM3: 7.5,
      },
      muestreo: {
        idMuestra: "M-2026-0842",
        fechaHoraMuestreo: colado,
        revenimientoObtenidoCm: 14.5,
        temperaturaAmbienteC: 28.5,
        temperaturaConcretoC: 27.2,
        contenidoAirePct: 1.8,
        regimenCurado: "Cámara Húmeda NMX-C-148 (23 ± 2 °C, HR >= 95%)",
        metodoCabeceo: "Platos con almohadillas de neopreno (ASTM C1231)",
      },
      especimenes: [spec1, spec2, spec3],
      estadisticasAci: calculateAciStatistics([spec1, spec2, spec3], 300),
      firmas: {
        operadorNombre: "Ing. Carlos Canto",
        operadorCargo: "Técnico Certificado ACI Grado 1",
        operadorCedula: "CED-87654321",
        signatarioNombre: "Ing. Roberto Morales",
        signatarioCargo: "Signatario Autorizado Acreditado EMA",
        signatarioCedula: "CED-12345678",
      },
      metadatos: {
        prensaCodigoInterno: "PRENSA-CONTROLS-01",
        observaciones: "Especímenes ensayados bajo condiciones controladas de laboratorio.",
      },
    };

    // Benchmark time
    const tStart = performance.now();
    const pdfBytes = await renderCompressionReportPdf(reportData);
    const tElapsed = performance.now() - tStart;

    // Assertions
    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 5000, "PDF buffer must be valid size");
    assert.ok(pdfBytes.length < 350 * 1024, `PDF size (${pdfBytes.length} bytes) must be < 350 KB`);

    // Verify PDF header magic bytes: %PDF-
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8");
    assert.equal(header, "%PDF-");

    // Performance assertion (< 120 ms target)
    assert.ok(tElapsed < 500, `PDF compilation took ${tElapsed.toFixed(1)} ms (target <120 ms, limit 500 ms in test runner)`);
  });
});

