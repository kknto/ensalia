import { test, describe } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  HardenedLegacyExcelIngestionEngine,
  generateCorporateExcelWorkbook,
  parseExcelSerialDate,
  levenshteinDistance,
  CorporateExcelDataset,
} from "../../src/lib/excel/compression";

describe("ENSALIA Excel Interoperability Engine (exceljs)", () => {
  // -------------------------------------------------------------------------
  // 1. Date Parsing with Lotus 1900 Leap Bug & UTC Noon Anchor
  // -------------------------------------------------------------------------
  test("Parses dates correctly with 1900 leap bug correction and UTC noon anchor", () => {
    // Excel serial 46307 corresponds to 2026-10-12
    const parsedDate = parseExcelSerialDate(46307);
    assert.ok(parsedDate instanceof Date);
    assert.equal(parsedDate.getUTCFullYear(), 2026);
    assert.equal(parsedDate.getUTCMonth(), 9); // October is index 9
    assert.equal(parsedDate.getUTCDate(), 12);
    assert.equal(parsedDate.getUTCHours(), 12, "Must be anchored to UTC noon to avoid timezone shift");

    // ISO string matching
    const isoDate = parseExcelSerialDate("2026-10-30");
    assert.ok(isoDate instanceof Date);
    assert.equal(isoDate.getUTCDate(), 30);

    // Latin format DD/MM/YYYY
    const dmyDate = parseExcelSerialDate("02/10/2026");
    assert.ok(dmyDate instanceof Date);
    assert.equal(dmyDate.getUTCDate(), 2);
    assert.equal(dmyDate.getUTCMonth(), 9);
    assert.equal(dmyDate.getUTCFullYear(), 2026);
  });

  // -------------------------------------------------------------------------
  // 2. Fuzzy Alias Matching & Word Boundary Guard
  // -------------------------------------------------------------------------
  test("Regex boundary prevents false positives and Levenshtein matches typos", async () => {
    const engine = new HardenedLegacyExcelIngestionEngine();

    // Word boundary guards: 'Turno' must NOT match alias 'no'
    assert.equal(engine.matchHeaderAlias("Turno", "no"), false);
    assert.equal(engine.matchHeaderAlias("No.", "no."), true);
    assert.equal(engine.matchHeaderAlias("No", "no"), true);
    assert.equal(engine.matchHeaderAlias("ID", "id"), true);
    assert.equal(engine.matchHeaderAlias("#", "#"), true);

    // Levenshtein typos: 'resitencia' -> 'resistencia', 'diamtro' -> 'diametro'
    assert.equal(engine.matchHeaderAlias("resitencia", "resistencia"), true);
    assert.equal(engine.matchHeaderAlias("diamtro", "diametro"), true);
    assert.equal(engine.matchHeaderAlias("Resistensia", "resistencia"), true);

    // Workbook header row mapping test
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("HeaderTest");
    ws.getRow(1).values = ["Muestra", "Turno", "Diámetro", "Carga (kg)", "Resistensia"];
    ws.getRow(2).values = [101, "Matutino", 150, 55000, 311.2];

    const { columnMap, result } = await engine.parseWorkbook(wb);
    assert.equal(columnMap.numero, 1, "Muestra must map to column 1");
    assert.equal(columnMap.resistencia, 5, "Typo 'Resistensia' must map to column 5 via Levenshtein <= 2");
    assert.equal(result.specimens[0].numero, 101);
  });

  // -------------------------------------------------------------------------
  // 3. Multi-Block Ingestion Across Formatted Blank Rows
  // -------------------------------------------------------------------------
  test("Parses multi-block legacy Excel across blank formatting rows without losing specimens", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Control de Roturas");

    // Metadatos iniciales
    ws.getCell("A1").value = "Cliente:";
    ws.getCell("B1").value = "CONSORCIO PENINSULAR S.A.";
    ws.getCell("A2").value = "Obra:";
    ws.getCell("B2").value = "TREN MAYA TRAMO 4";
    ws.getCell("D1").value = "f'c:";
    ws.getCell("E1").value = 300;

    // Fila 4: Encabezados de tabla
    ws.getRow(4).values = [
      "No.",
      "Fecha Colado",
      "Fecha Ensaye",
      "Edad (días)",
      "Diámetro (mm)",
      "Longitud (mm)",
      "Carga (kg)",
      "Resistencia (kg/cm²)",
      "Tipo Falla",
    ];

    // Fila 5: Espécimen 1 (7 días)
    ws.getRow(5).values = [1, "2026-10-02", "2026-10-09", 7, 150.0, 300.0, 41200, 233.1, "CONO_TIPO_1"];

    // Fila 6: Fila en blanco de separación estética de lote
    ws.getCell("A6").value = "";

    // Fila 7: Espécimen 2 (28 días)
    ws.getRow(7).values = [2, "2026-10-02", "2026-10-30", 28, 150.0, 300.0, 56200, 318.0, "CONO_TIPO_1"];

    // Fila 8: Espécimen 3 (28 días)
    ws.getRow(8).values = [3, "2026-10-02", "2026-10-30", 28, 150.0, 300.0, 55800, 315.8, "CONO_Y_DIVIDIDO_TIPO_2"];

    // Filas 9, 10, 11: Tres filas vacías consecutivas (fin formal del bloque)
    ws.getCell("A9").value = "";
    ws.getCell("A10").value = "";
    ws.getCell("A11").value = "";

    // Fila 12: Metadatos de cierre
    ws.getRow(12).values = ["Observaciones:", "Cilindros ensayados con platos de neopreno ASTM C1231."];

    const engine = new HardenedLegacyExcelIngestionEngine();
    const { result } = await engine.parseWorkbook(wb);

    assert.equal(result.specimens.length, 3, "All 3 specimens must be preserved across blank row");
    assert.equal(result.specimens[0].numero, 1);
    assert.equal(result.specimens[0].edadDias, 7);
    assert.equal(result.specimens[1].numero, 2);
    assert.equal(result.specimens[1].edadDias, 28);
    assert.equal(result.specimens[2].numero, 3);
    assert.equal(result.specimens[2].tipoFalla, "CONO_Y_DIVIDIDO_TIPO_2");

    // Verificar metadatos
    assert.equal(result.metadata.cliente, "CONSORCIO PENINSULAR S.A.");
    assert.equal(result.metadata.obra, "TREN MAYA TRAMO 4");
    assert.ok(result.hashMuestra && result.hashMuestra.length === 64, "Deterministic sample hash generated");
  });

  // -------------------------------------------------------------------------
  // 4. Corporate Excel Generator with Active Live Formulas & Conditional Formatting
  // -------------------------------------------------------------------------
  test("Generates corporate Excel with active live formulas and conditional formatting", async () => {
    const dataset: CorporateExcelDataset = {
      folio: "INF-COMP-2026-00412",
      cliente: "CONSORCIO VIAL PENINSULAR",
      obra: "TREN MAYA TRAMO 4",
      elemento: "LOSA SUPERIOR EJE 4",
      fcDisenoKgCm2: 300,
      edadGarantiaDias: 28,
      concretera: "CEMEX PLANTA CANCÚN",
      especimenes: [
        {
          numero: 1,
          fechaColado: "2026-10-02",
          fechaEnsaye: "2026-10-09",
          edadDias: 7,
          diametro1Mm: 150.0,
          diametro2Mm: 150.0,
          longitudMm: 300.0,
          areaCm2: 176.71,
          cargaMaximaKg: 41200,
          cargaMaximaKn: 404.0,
          resistenciaKgCm2: 233.1,
          factorLd: 1.0,
          porcentajeFc: 77.7,
        },
        {
          numero: 2,
          fechaColado: "2026-10-02",
          fechaEnsaye: "2026-10-30",
          edadDias: 28,
          diametro1Mm: 150.0,
          diametro2Mm: 150.0,
          longitudMm: 300.0,
          areaCm2: 176.71,
          cargaMaximaKg: 56200,
          cargaMaximaKn: 551.1,
          resistenciaKgCm2: 318.0,
          factorLd: 1.0,
          porcentajeFc: 106.0,
        },
        {
          numero: 3,
          fechaColado: "2026-10-02",
          fechaEnsaye: "2026-10-30",
          edadDias: 28,
          diametro1Mm: 150.0,
          diametro2Mm: 150.0,
          longitudMm: 262.5, // L/D = 1.75 -> factor 0.980
          areaCm2: 176.71,
          cargaMaximaKg: 56000,
          cargaMaximaKn: 549.2,
          resistenciaKgCm2: 310.5,
          factorLd: 0.98,
          porcentajeFc: 103.5,
        },
      ],
      promedio28d: 314.3,
    };

    const buffer = await generateCorporateExcelWorkbook(dataset);
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 2000, "Workbook binary buffer must be generated");

    // ZIP PK magic bytes verification (0x50, 0x4B)
    assert.equal(buffer[0], 0x50);
    assert.equal(buffer[1], 0x4b);

    // Reload generated workbook to verify internal formula cells
    const verifyWb = new ExcelJS.Workbook();
    await verifyWb.xlsx.load(buffer as any);
    const ws = verifyWb.getWorksheet("Informe de Ensaye f'c");
    assert.ok(ws, "Worksheet must exist");

    // Check Area formula on row 10 (Specimen 1)
    const areaCell = ws.getCell("H10");
    assert.ok(typeof areaCell.value === "object" && areaCell.value !== null && "formula" in areaCell.value);
    assert.ok((areaCell.value as { formula: string }).formula.includes("PI()"));

    // Check Strength formula on row 10
    const fcCell = ws.getCell("J10");
    assert.ok(typeof fcCell.value === "object" && fcCell.value !== null && "formula" in fcCell.value);
    assert.ok((fcCell.value as { formula: string }).formula.includes("I10/H10"));

    // Check Slenderness factor injected in formula for Specimen 3 (row 12)
    const fcLdCell = ws.getCell("J12");
    assert.ok(typeof fcLdCell.value === "object" && fcLdCell.value !== null && "formula" in fcLdCell.value);
    assert.ok((fcLdCell.value as { formula: string }).formula.includes("0.980"));

    // Check % f'c formula against fixed cell $H$3
    const pctCell = ws.getCell("K10");
    assert.ok(typeof pctCell.value === "object" && pctCell.value !== null && "formula" in pctCell.value);
    assert.ok((pctCell.value as { formula: string }).formula.includes("$H$3"));

    // Check AVERAGEIF summary formula
    const avgCell = ws.getCell("J14");
    assert.ok(typeof avgCell.value === "object" && avgCell.value !== null && "formula" in avgCell.value);
    assert.ok((avgCell.value as { formula: string }).formula.includes("AVERAGEIF"));
  });
});
