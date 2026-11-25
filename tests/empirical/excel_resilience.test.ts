import { test, describe } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Levenshtein distance implementation
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Convert Excel serial date to Date, handling 1900 leap year bug & timezone offset
export function parseExcelSerialDate(serial: number, timezone = "America/Cancun"): Date {
  const adjustedSerial = serial > 60 ? serial - 1 : serial;
  const msPerDay = 86400 * 1000;
  const epochMs = Date.UTC(1899, 11, 31);
  const targetUtcMs = epochMs + adjustedSerial * msPerDay;
  return new Date(targetUtcMs + 12 * 3600 * 1000); // 12:00:00 UTC anchor
}

// Worker's LegacyExcelIngestionEngine directly from Section 4.2
export class WorkerLegacyExcelIngestionEngine {
  public readonly headerSynonyms: Record<string, string[]> = {
    numero: ["no", "no.", "numero", "muestra", "cilindro", "item", "id"],
    fechaColado: ["fecha colado", "f. colado", "f colado", "muestreo", "fecha muestreo"],
    fechaEnsaye: ["fecha ensaye", "f. ensaye", "f ensaye", "rotura", "fecha rotura"],
    edadDias: ["edad", "edad dias", "dias", "edad (dias)", "edad cilindro"],
    cargaKg: ["carga", "carga kg", "carga (kg)", "carga max", "fuerza kg", "lectura"],
    cargaKn: ["carga kn", "carga (kn)", "fuerza kn", "kn"],
    resistencia: ["resistencia", "fc", "f'c", "f´c", "kg/cm2", "kg/cm²", "fc obtenido"],
    diametro: ["diametro", "diametro mm", "d1", "d2", "d prom"],
    longitud: ["longitud", "altura", "h", "longitud mm"],
    tipoFalla: ["falla", "tipo falla", "fractura", "patron falla", "tipo fractura"],
  };

  public async parseWorkbook(workbook: ExcelJS.Workbook): Promise<any> {
    const worksheet = workbook.worksheets[0];
    const result: any = { metadata: {}, specimens: [], diagnostics: [] };

    let currentSection: "SEEKING_HEADER" | "READING_TABLE" = "SEEKING_HEADER";
    let columnMap: Record<string, number> = {};

    worksheet.eachRow((row, rowNumber) => {
      const hasValues = row.values && (row.values as any[]).some(v => v !== null && v !== undefined && v !== "");
      if (!hasValues) {
        if (currentSection === "READING_TABLE" && result.specimens.length > 0) {
          currentSection = "SEEKING_HEADER";
        }
        return;
      }

      if (currentSection === "SEEKING_HEADER") {
        const potentialHeaders: Record<string, number> = {};
        row.eachCell((cell, colNumber) => {
          const text = cell.text?.toLowerCase().trim() || "";
          for (const [canonicalKey, aliases] of Object.entries(this.headerSynonyms)) {
            if (aliases.some(alias => text.includes(alias))) {
              potentialHeaders[canonicalKey] = colNumber;
            }
          }
        });

        if (potentialHeaders.cargaKg || potentialHeaders.cargaKn || potentialHeaders.resistencia) {
          columnMap = potentialHeaders;
          currentSection = "READING_TABLE";
          return;
        }

        this.extractMetadataPairs(row, result.metadata);
        return;
      }

      if (currentSection === "READING_TABLE") {
        try {
          const specimen = this.extractSpecimenRow(row, columnMap, rowNumber, result.diagnostics);
          if (specimen) {
            result.specimens.push(specimen);
          }
        } catch (err: any) {
          result.diagnostics.push({ cell: `Row ${rowNumber}`, message: err.message, severity: "CRITICAL" });
        }
      }
    });

    return { result, columnMap };
  }

  private extractMetadataPairs(row: ExcelJS.Row, metadata: Record<string, any>): void {
    row.eachCell((cell, colNumber) => {
      const text = cell.text?.trim() || "";
      if (text.endsWith(":") || text.includes(":")) {
        const parts = text.split(":");
        const key = parts[0].toLowerCase().trim();
        const inlineVal = parts[1]?.trim();
        if (inlineVal) {
          metadata[key] = inlineVal;
        } else {
          const nextCell = row.getCell(colNumber + 1);
          if (nextCell && nextCell.value) {
            metadata[key] = nextCell.text?.trim();
          }
        }
      }
    });
  }

  public extractSpecimenRow(row: ExcelJS.Row, map: Record<string, number>, rowNumber: number, diagnostics: Array<any>): any {
    const rawCargaKg = map.cargaKg ? this.sanitizeNumeric(row.getCell(map.cargaKg).value) : 0;
    const rawCargaKn = map.cargaKn ? this.sanitizeNumeric(row.getCell(map.cargaKn).value) : 0;
    const cargaFinalKg = rawCargaKg > 0 ? rawCargaKg : rawCargaKn * 101.9716;

    if (cargaFinalKg <= 0) return null;

    const diametro = map.diametro ? this.sanitizeNumeric(row.getCell(map.diametro).value) : 150.0;
    const longitud = map.longitud ? this.sanitizeNumeric(row.getCell(map.longitud).value) : 300.0;
    const areaCm2 = (Math.PI * Math.pow(diametro / 10, 2)) / 4;
    const resistencia = cargaFinalKg / areaCm2;

    return {
      numero: map.numero ? Number(this.sanitizeNumeric(row.getCell(map.numero).value)) || 1 : 1,
      edadDias: map.edadDias ? Number(this.sanitizeNumeric(row.getCell(map.edadDias).value)) || 28 : 28,
      diametroMm: diametro,
      longitudMm: longitud,
      cargaMaximaKg: Math.round(cargaFinalKg),
      cargaMaximaKn: Number((cargaFinalKg * 0.00980665).toFixed(1)),
      resistenciaCalculadaKgCm2: Number(resistencia.toFixed(1)),
      tipoFalla: map.tipoFalla ? row.getCell(map.tipoFalla).text?.trim() || "CONO_TIPO_1" : "CONO_TIPO_1",
    };
  }

  public sanitizeNumeric(val: any): number {
    if (typeof val === "number") return val;
    if (!val) return 0;
    if (typeof val === "object" && "result" in val) return Number(val.result) || 0;
    const cleanStr = String(val).replace(/[^0-9.-]/g, "");
    return parseFloat(cleanStr) || 0;
  }
}

describe("Excel Ingestion & Generation Resilience Empirical Verification", () => {
  test("CHALLENGE 1: State machine drops subsequent specimens when a blank formatted row exists inside the table", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Cilindros");

    // Row 1: Table Header
    ws.getRow(1).values = ["No.", "Edad (días)", "Diámetro (mm)", "Longitud (mm)", "Carga (kg)", "Resistencia (kg/cm²)"];

    // Row 2: Specimen 1 (7 days)
    ws.getRow(2).values = [1, 7, 150, 300, 35000, 198.0];

    // Row 3: Blank formatted row (empty string in cell, e.g. age separator in lab template)
    ws.getCell("A3").value = "";

    // Row 4: Specimen 2 (28 days)
    ws.getRow(4).values = [2, 28, 150, 300, 56000, 316.9];

    // Row 5: Specimen 3 (28 days)
    ws.getRow(5).values = [3, 28, 150, 300, 55500, 314.1];

    const engine = new WorkerLegacyExcelIngestionEngine();
    const { result } = await engine.parseWorkbook(wb);

    // EMPIRICAL BUG DEMONSTRATION:
    // Row 3 hasValues is FALSE, so currentSection transitions back to SEEKING_HEADER.
    // Rows 4 and 5 are not header rows, so only 1 specimen is parsed instead of 3!
    assert.equal(result.specimens.length, 1, "Only 1 specimen parsed: Row 4 and 5 were dropped!");
    assert.equal(result.specimens[0].numero, 1);
  });

  test("CHALLENGE 2: False positive substring matching on column headers (e.g. 'Turno' matching alias 'no')", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("PruebaHeader");

    // Header row where 'Muestra' is Column 1 and 'Turno' is Column 2
    ws.getRow(1).values = ["Muestra", "Turno", "Carga (kg)", "f'c (kg/cm²)"];
    ws.getRow(2).values = [101, "Matutino", 55000, 311.2];

    const engine = new WorkerLegacyExcelIngestionEngine();
    const { columnMap, result } = await engine.parseWorkbook(wb);

    // 'turno'.includes('no') is true, so columnMap.numero is overwritten to Column 2 ('Turno')!
    assert.equal(columnMap.numero, 2, "Vulnerability: 'Turno' falsely mapped to 'numero' because of 'no' alias substring match!");
    // When specimen row is extracted, 'Matutino' is parsed as numeric for numero, producing NaN -> 1
    assert.equal(result.specimens[0].numero, 1, "Specimen sample ID 101 was lost and defaulted to 1!");
  });

  test("CHALLENGE 3: Worker's extractSpecimenRow completely omits fechaColado and fechaEnsaye", () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Fechas");
    ws.getRow(1).values = ["No.", "Fecha Colado", "Fecha Ensaye", "Carga (kg)", "Resistencia"];
    ws.getRow(2).values = [1, "2026-10-02", "2026-10-30", 56000, 316.9];

    const engine = new WorkerLegacyExcelIngestionEngine();
    const row = ws.getRow(2);
    const map = { numero: 1, fechaColado: 2, fechaEnsaye: 3, cargaKg: 4, resistencia: 5 };

    const specimen = engine.extractSpecimenRow(row, map, 2, []);

    // EMPIRICAL BUG CONFIRMATION:
    // Worker's extractSpecimenRow in Section 4.2 never extracts fechaColado or fechaEnsaye!
    assert.equal(specimen.fechaColado, undefined, "Bug: fechaColado is undefined in extracted specimen!");
    assert.equal(specimen.fechaEnsaye, undefined, "Bug: fechaEnsaye is undefined in extracted specimen!");
  });

  test("CHALLENGE 4: Levenshtein distance matches real-world misspelled headers where substring matching fails", () => {
    const headerSynonyms: Record<string, string[]> = {
      resistencia: ["resistencia", "fc", "f'c", "kg/cm2"],
      cargaKg: ["carga kg", "carga (kg)", "fuerza kg"],
    };

    const messyHeaders = ["Resistensia", "Carga (Kg)", "Fuerza kgs", "Resistecia"];

    // Naive includes test
    for (const h of messyHeaders) {
      const lower = h.toLowerCase();
      const naiveRes = headerSynonyms.resistencia.some(a => lower.includes(a));
      if (h === "Resistensia" || h === "Resistecia") {
        assert.equal(naiveRes, false, `Naive includes failed on '${h}'`);

        // But Levenshtein distance detects it within edit distance <= 1
        const minDistance = Math.min(...headerSynonyms.resistencia.map(a => levenshteinDistance(lower, a)));
        assert.ok(minDistance <= 1, `Levenshtein correctly matched '${h}' with distance ${minDistance}`);
      }
    }
  });

  test("CHALLENGE 5: Excel 1900 leap year bug and timezone shift handling", () => {
    const dTarget = new Date(Date.UTC(2026, 9, 2)); // 2026-10-02
    const dEpoch = new Date(Date.UTC(1899, 11, 30));
    const excelSerial = Math.round((dTarget.getTime() - dEpoch.getTime()) / (86400 * 1000));

    const converted = parseExcelSerialDate(excelSerial, "America/Cancun");
    assert.equal(converted.getUTCFullYear(), 2026);
    assert.equal(converted.getUTCMonth(), 9); // October
    assert.equal(converted.getUTCDate(), 2);
  });

  test("CHALLENGE 6: Generated corporate Excel formulas are syntactically valid in LibreOffice Calc", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Reporte", { views: [{ showGridLines: true }] });

    ws.getCell("G3").value = "f'c Proyecto:";
    ws.getCell("H3").value = 300;

    ws.getRow(9).values = ["#", "F. Colado", "F. Ensaye", "Edad (d)", "D1 (mm)", "D2 (mm)", "L (mm)", "Área (cm²)", "Carga (kg)", "f'c (kg/cm²)", "% f'c"];

    const r10 = ws.getRow(10);
    r10.getCell(1).value = 1;
    r10.getCell(2).value = "2026-10-02";
    r10.getCell(3).value = "2026-10-30";
    r10.getCell(4).value = 28;
    r10.getCell(5).value = 150.0;
    r10.getCell(6).value = 150.0;
    r10.getCell(7).value = 300.0;
    r10.getCell(8).value = { formula: "ROUND(PI()*POWER(((E10+F10)/2)/10, 2)/4, 2)", result: 176.71 };
    r10.getCell(9).value = 56200;
    r10.getCell(10).value = { formula: "ROUND(I10/H10, 1)", result: 318.0 };
    r10.getCell(11).value = { formula: "ROUND((J10/$H$3)*100, 1)", result: 106.0 };

    const r11 = ws.getRow(11);
    r11.getCell(1).value = 2;
    r11.getCell(2).value = "2026-10-02";
    r11.getCell(3).value = "2026-10-30";
    r11.getCell(4).value = 28;
    r11.getCell(5).value = 150.2;
    r11.getCell(6).value = 150.0;
    r11.getCell(7).value = 300.1;
    r11.getCell(8).value = { formula: "ROUND(PI()*POWER(((E11+F11)/2)/10, 2)/4, 2)", result: 176.95 };
    r11.getCell(9).value = 55800;
    r11.getCell(10).value = { formula: "ROUND(I11/H11, 1)", result: 315.3 };
    r11.getCell(11).value = { formula: "ROUND((J11/$H$3)*100, 1)", result: 105.1 };

    ws.getCell("I13").value = "Promedio 28d:";
    ws.getCell("J13").value = { formula: "AVERAGEIF(D10:D11, 28, J10:J11)", result: 316.65 };

    const testDir = path.resolve("tests", "empirical");
    const testXlsx = path.join(testDir, "test_output.xlsx");
    await wb.xlsx.writeFile(testXlsx);

    assert.ok(fs.existsSync(testXlsx));

    const sofficePath = '"C:\\Program Files\\LibreOffice\\program\\soffice.com"';
    try {
      const userInstall = `-env:UserInstallation=file:///${path.join(testDir, ".lo_profile").replaceAll("\\", "/")}`;
      execSync(`${sofficePath} --headless --norestore --nolockcheck ${userInstall} --convert-to csv --outdir "${testDir}" "${testXlsx}"`, { stdio: "pipe" });
      const testCsv = path.join(testDir, "test_output.csv");
      assert.ok(fs.existsSync(testCsv), "CSV must be produced by LibreOffice");
      const csvContent = fs.readFileSync(testCsv, "utf8");

      assert.ok(!csvContent.includes("#NAME?"), "Formulas must not evaluate to #NAME?");
      assert.ok(!csvContent.includes("#VALUE!"), "Formulas must not evaluate to #VALUE!");
      assert.ok(!csvContent.includes("#REF!"), "Formulas must not evaluate to #REF!");

      assert.ok(csvContent.includes("300"), "Project f'c present");
      assert.ok(csvContent.includes("Promedio 28d:"), "Summary label present");

      fs.unlinkSync(testXlsx);
      fs.unlinkSync(testCsv);
    } catch (e: any) {
      if (fs.existsSync(testXlsx)) fs.unlinkSync(testXlsx);
      throw e;
    }
  });
});

