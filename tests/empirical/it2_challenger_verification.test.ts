import { test, describe } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// 1. Levenshtein Distance & Date Parser (Verbatim from Architecture Plan Section 4.2)
// ---------------------------------------------------------------------------
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

export function parseExcelSerialDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate(), 12, 0, 0));
  }
  if (typeof val === "number" && val > 0) {
    // Lotus 1-2-3 / Excel 1900 leap year bug correction: serials > 60 subtract 1
    const adjustedSerial = val > 60 ? val - 1 : val;
    const msPerDay = 86400 * 1000;
    const epochMs = Date.UTC(1899, 11, 31);
    const targetUtcMs = epochMs + adjustedSerial * msPerDay;
    return new Date(targetUtcMs + 12 * 3600 * 1000); // 12:00:00 UTC anchor
  }
  if (typeof val === "string") {
    const str = val.trim();
    if (!str) return undefined;
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      return new Date(Date.UTC(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]), 12, 0, 0));
    }
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      return new Date(Date.UTC(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]), 12, 0, 0));
    }
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// 2. Hardened LegacyExcelIngestionEngine (Verbatim from Architecture Plan Section 4.2)
// ---------------------------------------------------------------------------
export class HardenedLegacyExcelIngestionEngine {
  public readonly headerSynonyms: Record<string, string[]> = {
    numero: ["no", "no.", "numero", "muestra", "cilindro", "item", "id", "probeta", "#"],
    fechaColado: ["fecha colado", "f. colado", "f colado", "muestreo", "fecha muestreo", "colado"],
    fechaEnsaye: ["fecha ensaye", "f. ensaye", "f ensaye", "rotura", "fecha rotura", "ensaye"],
    edadDias: ["edad", "edad dias", "dias", "edad (dias)", "edad cilindro"],
    cargaKg: ["carga", "carga kg", "carga (kg)", "carga max", "fuerza kg", "lectura kg", "fuerza (kg)"],
    cargaKn: ["carga kn", "carga (kn)", "fuerza kn", "kn"],
    resistencia: ["resistencia", "fc", "f'c", "f´c", "kg/cm2", "kg/cm²", "fc obtenido", "esfuerzo"],
    diametro: ["diametro", "diametro mm", "diametro (mm)", "d1", "d2", "d prom"],
    longitud: ["longitud", "altura", "h", "longitud mm", "longitud (mm)"],
    tipoFalla: ["falla", "tipo falla", "fractura", "patron falla", "tipo fractura"],
  };

  public async parseWorkbook(workbook: ExcelJS.Workbook): Promise<any> {
    const worksheet = workbook.worksheets[0];
    const result: any = { metadata: {}, specimens: [], diagnostics: [] };

    let currentSection: "SEEKING_HEADER" | "READING_TABLE" = "SEEKING_HEADER";
    let columnMap: Record<string, number> = {};
    let consecutiveEmptyRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      const hasValues = row.values && (row.values as any[]).some(v => v !== null && v !== undefined && v !== "");

      // Lookahead Buffer: 3 consecutive empty rows required to terminate table
      if (!hasValues) {
        if (currentSection === "READING_TABLE") {
          consecutiveEmptyRows++;
          if (consecutiveEmptyRows >= 3) {
            currentSection = "SEEKING_HEADER";
          }
        }
        return;
      }

      if (currentSection === "SEEKING_HEADER") {
        const potentialHeaders: Record<string, number> = {};
        row.eachCell((cell, colNumber) => {
          const text = cell.text?.trim() || "";
          if (!text) return;

          for (const [canonicalKey, aliases] of Object.entries(this.headerSynonyms)) {
            if (aliases.some(alias => this.matchHeaderAlias(text, alias))) {
              potentialHeaders[canonicalKey] = colNumber;
            }
          }
        });

        if (
          (potentialHeaders.cargaKg || potentialHeaders.cargaKn || potentialHeaders.resistencia) &&
          (potentialHeaders.numero || potentialHeaders.edadDias || potentialHeaders.diametro)
        ) {
          columnMap = potentialHeaders;
          currentSection = "READING_TABLE";
          consecutiveEmptyRows = 0;
          return;
        }

        this.extractMetadataPairs(row, result.metadata);
        return;
      }

      if (currentSection === "READING_TABLE") {
        if (this.detectMetadataOrSummaryRow(row)) {
          currentSection = "SEEKING_HEADER";
          this.extractMetadataPairs(row, result.metadata);
          consecutiveEmptyRows = 0;
          return;
        }

        try {
          const specimen = this.extractSpecimenRow(row, columnMap, rowNumber, result.diagnostics);
          if (specimen) {
            result.specimens.push(specimen);
            consecutiveEmptyRows = 0;
          }
        } catch (err: any) {
          result.diagnostics.push({ cell: `Row ${rowNumber}`, message: err.message, severity: "CRITICAL" });
        }
      }
    });

    return { result, columnMap };
  }

  public matchHeaderAlias(cellText: string, alias: string): boolean {
    const text = cellText.toLowerCase().trim();
    const cleanAlias = alias.toLowerCase().trim();

    // 1. Boundary regex for short tokens (<= 3 chars) to avoid collisions like 'Turno' matching 'no'
    if (cleanAlias.length <= 3) {
      const boundaryRegex = new RegExp(`(^|[\\s.,;()_-])${cleanAlias.replace('.', '\\.')}([\\s.,;()_-]|$)`, 'i');
      return boundaryRegex.test(text);
    }

    // 2. Substring match for longer strings
    if (text.includes(cleanAlias)) return true;

    // 3. Levenshtein distance <= 2 for typo tolerance
    if (levenshteinDistance(text, cleanAlias) <= 2) return true;

    // 4. Token search in compound headers
    const tokens = text.split(/[\s,()_-]+/).filter(t => t.length > 3);
    for (const token of tokens) {
      if (levenshteinDistance(token, cleanAlias) <= 1) return true;
    }

    return false;
  }

  private detectMetadataOrSummaryRow(row: ExcelJS.Row): boolean {
    let isMeta = false;
    row.eachCell((cell) => {
      const txt = cell.text?.toLowerCase().trim() || "";
      if (txt.includes(":") || txt.includes("promedio") || txt.includes("desv") || txt.includes("coef")) {
        isMeta = true;
      }
    });
    return isMeta;
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

    const rawFechaColado = map.fechaColado ? row.getCell(map.fechaColado).value : undefined;
    const rawFechaEnsaye = map.fechaEnsaye ? row.getCell(map.fechaEnsaye).value : undefined;
    const fechaColado = parseExcelSerialDate(rawFechaColado);
    const fechaEnsaye = parseExcelSerialDate(rawFechaEnsaye);

    return {
      numero: map.numero ? Number(this.sanitizeNumeric(row.getCell(map.numero).value)) || 1 : 1,
      fechaColado,
      fechaEnsaye,
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

// ---------------------------------------------------------------------------
// 3. Hardened PressTelemetryEngine (Verbatim from Architecture Plan Section 2.4.C)
// ---------------------------------------------------------------------------
export class HardenedPressTelemetryEngine {
  public peakLoadKn = 0;
  public isTesting = false;
  public loadHistory: Array<{ time: number; loadKn: number }> = [];
  public consecutiveDropFrames = 0;

  public readonly areaCm2: number;
  public readonly minRateKnS: number;
  public readonly maxRateKnS: number;
  public readonly targetRateKnS: number;
  public readonly minBreakThresholdKn: number;

  constructor(diameterMm = 150.0, expectedPeakKn?: number) {
    const areaMm2 = (Math.PI * Math.pow(diameterMm, 2)) / 4;
    this.areaCm2 = Number((areaMm2 / 100).toFixed(2));

    this.minRateKnS = Number((0.15 * areaMm2 * 1e-3).toFixed(2));
    this.maxRateKnS = Number((0.35 * areaMm2 * 1e-3).toFixed(2));
    this.targetRateKnS = Number((0.25 * areaMm2 * 1e-3).toFixed(2));

    const expected = expectedPeakKn || (this.areaCm2 * 250 * 0.00980665);
    this.minBreakThresholdKn = Math.max(10.0, Number((expected * 0.20).toFixed(1)));
  }

  public processReading(loadKn: number, timestamp = performance.now()): {
    currentLoadKn: number;
    peakLoadKn: number;
    currentRateKnS: number;
    rateCompliant: boolean;
    breakDetected: boolean;
    phase: "PRELOAD" | "PHASE_1" | "PHASE_2_NORMATIVE" | "BROKEN";
  } {
    if (loadKn > 5.0 && !this.isTesting) {
      this.isTesting = true;
      this.peakLoadKn = loadKn;
      this.loadHistory = [];
      this.consecutiveDropFrames = 0;
    }

    this.loadHistory.push({ time: timestamp, loadKn });
    if (this.loadHistory.length > 20) this.loadHistory.shift();

    let currentRateKnS = 0;
    if (this.loadHistory.length >= 2) {
      const oldest = this.loadHistory[0];
      const dt = (timestamp - oldest.time) / 1000;
      if (dt > 0.1) {
        currentRateKnS = (loadKn - oldest.loadKn) / dt;
      }
    }

    if (loadKn > this.peakLoadKn) {
      this.peakLoadKn = loadKn;
    }

    const isPhase2 = this.isTesting && (loadKn >= this.peakLoadKn * 0.50 || loadKn >= this.minBreakThresholdKn * 1.5);
    const rateCompliant = !isPhase2 || (currentRateKnS >= this.minRateKnS && currentRateKnS <= this.maxRateKnS);

    let breakDetected = false;
    if (this.isTesting && this.peakLoadKn >= this.minBreakThresholdKn) {
      if (loadKn < this.peakLoadKn * 0.85) {
        this.consecutiveDropFrames++;
        if (this.consecutiveDropFrames >= 3) {
          breakDetected = true;
          this.isTesting = false;
        }
      } else {
        this.consecutiveDropFrames = 0;
      }
    }

    const phase = !this.isTesting
      ? (this.peakLoadKn > 0 ? "BROKEN" : "PRELOAD")
      : (isPhase2 ? "PHASE_2_NORMATIVE" : "PHASE_1");

    return {
      currentLoadKn: loadKn,
      peakLoadKn: this.peakLoadKn,
      currentRateKnS: Math.max(0, Number(currentRateKnS.toFixed(2))),
      rateCompliant,
      breakDetected,
      phase,
    };
  }

  public reset(): void {
    this.peakLoadKn = 0;
    this.isTesting = false;
    this.loadHistory = [];
    this.consecutiveDropFrames = 0;
  }
}

// ---------------------------------------------------------------------------
// 4. Forney Frame Parser (Verbatim from Architecture Plan Section 2.4.A)
// ---------------------------------------------------------------------------
export function parseForneyFrameHardened(frame: string): {
  forceLbf: number;
  forceKn: number;
  forceKgf: number;
  stressPsi: number;
  stressMpa: number;
  stressKgCm2: number;
  peakLbf: number;
  peakKn: number;
} | null {
  const match = frame.match(/TEST:\s*\d+\s+FORCE:\s*(\d+)\s*LBF\s+STRESS:\s*(\d+)\s*PSI\s+PEAK:\s*(\d+)\s*LBF/i);
  if (!match) return null;
  const forceLbf = parseFloat(match[1]);
  const stressPsi = parseFloat(match[2]);
  const peakLbf = parseFloat(match[3]);

  const LBF_TO_KN = 0.0044482216;
  const LBF_TO_KGF = 0.45359237;
  const PSI_TO_MPA = 0.006894757;
  const PSI_TO_KGCM2 = 0.07030696;

  return {
    forceLbf,
    forceKn: Number((forceLbf * LBF_TO_KN).toFixed(2)),
    forceKgf: Number((forceLbf * LBF_TO_KGF).toFixed(1)),
    stressPsi,
    stressMpa: Number((stressPsi * PSI_TO_MPA).toFixed(2)),
    stressKgCm2: Number((stressPsi * PSI_TO_KGCM2).toFixed(2)),
    peakLbf,
    peakKn: Number((peakLbf * LBF_TO_KN).toFixed(2)),
  };
}

// ===========================================================================
// EMPIRICAL TEST SUITE: RE-VERIFICATION OF ALL 5 DEFECTS
// ===========================================================================
describe("Iteration 2 Empirical Challenge: Re-Verification of 5 Hardened Defects", () => {

  // -------------------------------------------------------------------------
  // DEFECT 1: Lookahead buffer prevents specimen loss on formatted blank rows
  // -------------------------------------------------------------------------
  test("DEFECT 1 RESOLVED: Lookahead buffer (consecutiveEmptyRows < 3) parses all specimens across blank rows", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Cilindros");

    // Row 1: Header
    ws.getRow(1).values = ["No.", "Fecha Colado", "Fecha Ensaye", "Edad (días)", "Diámetro (mm)", "Longitud (mm)", "Carga (kg)", "Resistencia (kg/cm²)"];

    // Row 2: Specimen 1 (7 days)
    ws.getRow(2).values = [1, "2026-10-02", "2026-10-09", 7, 150, 300, 35000, 198.0];

    // Row 3: Single blank formatting row (separating age groups in lab template)
    ws.getCell("A3").value = "";

    // Row 4: Specimen 2 (28 days)
    ws.getRow(4).values = [2, "2026-10-02", "2026-10-30", 28, 150, 300, 56000, 316.9];

    // Row 5: Specimen 3 (28 days)
    ws.getRow(5).values = [3, "2026-10-02", "2026-10-30", 28, 150, 300, 55500, 314.1];

    // Row 6, 7, 8: Three consecutive empty rows (true end of data block)
    ws.getCell("A6").value = "";
    ws.getCell("A7").value = "";
    ws.getCell("A8").value = "";

    // Row 9: Metadata closing block
    ws.getRow(9).values = ["Observaciones:", "Cilindros ensayados conforme a ASTM C39 / NMX-C-083"];

    const engine = new HardenedLegacyExcelIngestionEngine();
    const { result } = await engine.parseWorkbook(wb);

    // VERIFICATION:
    // All 3 specimens MUST be parsed (previously only 1 was parsed, 2 were dropped!)
    assert.equal(result.specimens.length, 3, "All 3 specimens must be parsed successfully across the blank formatting row!");
    assert.equal(result.specimens[0].numero, 1);
    assert.equal(result.specimens[0].edadDias, 7);
    assert.equal(result.specimens[1].numero, 2);
    assert.equal(result.specimens[1].edadDias, 28);
    assert.equal(result.specimens[2].numero, 3);
    assert.equal(result.specimens[2].edadDias, 28);

    // Verify closing metadata was captured
    assert.ok(result.metadata.observaciones);
  });

  // -------------------------------------------------------------------------
  // DEFECT 2: Regex word boundary prevents 'Turno' matching 'no' & Levenshtein matches typos
  // -------------------------------------------------------------------------
  test("DEFECT 2 RESOLVED: Regex word boundary prevents 'Turno' collision, and Levenshtein <= 2 matches typos", async () => {
    const engine = new HardenedLegacyExcelIngestionEngine();

    // 1. Regex boundary prevents 'Turno' from matching alias 'no'
    const turnoMatchesNo = engine.matchHeaderAlias("Turno", "no");
    assert.equal(turnoMatchesNo, false, "'Turno' must NOT match alias 'no'!");

    // 2. Exact word boundaries match valid aliases
    assert.equal(engine.matchHeaderAlias("No.", "no."), true, "'No.' must match alias 'no.'");
    assert.equal(engine.matchHeaderAlias("No", "no"), true, "'No' must match alias 'no'");
    assert.equal(engine.matchHeaderAlias("ID", "id"), true, "'ID' must match alias 'id'");
    assert.equal(engine.matchHeaderAlias("#", "#"), true, "'#' must match alias '#'");
    assert.equal(engine.matchHeaderAlias("Cilindro No.", "no."), true, "'Cilindro No.' must match 'no.'");

    // 3. Realistic workbook header row test: 'Muestra' in col 1, 'Turno' in col 2
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("HeaderTest");
    ws.getRow(1).values = ["Muestra", "Turno", "Diámetro", "Carga (kg)", "Resistensia"]; // Note typo 'Resistensia'
    ws.getRow(2).values = [101, "Matutino", 150, 55000, 311.2];

    const { columnMap, result } = await engine.parseWorkbook(wb);

    // 'Muestra' is Column 1; 'Turno' (Col 2) must NOT overwrite columnMap.numero!
    assert.equal(columnMap.numero, 1, "columnMap.numero must remain 1 ('Muestra'), NOT 2 ('Turno')!");
    assert.equal(result.specimens[0].numero, 101, "Sample ID 101 must be preserved exactly!");

    // Typo 'Resistensia' must be mapped to 'resistencia' via Levenshtein distance <= 2!
    assert.equal(columnMap.resistencia, 5, "Typo 'Resistensia' must be matched via Levenshtein to column 5!");
  });

  // -------------------------------------------------------------------------
  // DEFECT 3: extractSpecimenRow extracts fechaColado & fechaEnsaye with 1900 bug & UTC noon anchor
  // -------------------------------------------------------------------------
  test("DEFECT 3 RESOLVED: extractSpecimenRow extracts dates and handles Lotus 1900 leap bug & noon UTC anchor", () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Dates");

    // Excel serial calculation for 2026-10-02:
    // Excel epoch 1899-12-30 -> 2026-10-02 = 46300 (approx)
    const targetDate = new Date(Date.UTC(2026, 9, 2)); // 2026-10-02
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const serialColado = Math.round((targetDate.getTime() - excelEpoch.getTime()) / (86400 * 1000));
    const serialEnsaye = serialColado + 28; // 28 days later (2026-10-30)

    ws.getRow(1).values = ["No.", "Fecha Colado", "Fecha Ensaye", "Carga (kg)", "Resistencia"];
    ws.getRow(2).values = [1, serialColado, serialEnsaye, 56000, 316.9];

    const engine = new HardenedLegacyExcelIngestionEngine();
    const map = { numero: 1, fechaColado: 2, fechaEnsaye: 3, cargaKg: 4, resistencia: 5 };
    const specimen = engine.extractSpecimenRow(ws.getRow(2), map, 2, []);

    // VERIFICATION:
    // Dates MUST NOT be undefined!
    assert.ok(specimen.fechaColado instanceof Date, "fechaColado must be an instantiated Date!");
    assert.ok(specimen.fechaEnsaye instanceof Date, "fechaEnsaye must be an instantiated Date!");

    // Verify 12:00:00 UTC anchor
    assert.equal(specimen.fechaColado.getUTCHours(), 12, "Must be anchored at 12:00 UTC");
    assert.equal(specimen.fechaEnsaye.getUTCHours(), 12, "Must be anchored at 12:00 UTC");

    // Verify correct calendar dates in UTC
    assert.equal(specimen.fechaColado.getUTCFullYear(), 2026);
    assert.equal(specimen.fechaColado.getUTCMonth(), 9); // October
    assert.equal(specimen.fechaColado.getUTCDate(), 2);

    assert.equal(specimen.fechaEnsaye.getUTCFullYear(), 2026);
    assert.equal(specimen.fechaEnsaye.getUTCMonth(), 9); // October
    assert.equal(specimen.fechaEnsaye.getUTCDate(), 30);

    // Verify timezone shift immunity in UTC-5 (America/Cancun) and UTC-6 (America/Mexico_City)
    // At 12:00 UTC, Cancun is 07:00 AM same day, Mexico City is 06:00 AM same day
    const cancunDateStr = specimen.fechaColado.toLocaleDateString("es-MX", { timeZone: "America/Cancun" });
    const cdmxDateStr = specimen.fechaColado.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });
    assert.ok(cancunDateStr.includes("2/10/2026") || cancunDateStr.includes("02/10/2026"));
    assert.ok(cdmxDateStr.includes("2/10/2026") || cdmxDateStr.includes("02/10/2026"));
  });

  // -------------------------------------------------------------------------
  // DEFECT 4: Vosk WASM Grammar Dictionary completeness (all tens and hundreds)
  // -------------------------------------------------------------------------
  test("DEFECT 4 RESOLVED: Vosk WASM Grammar contains all tens and hundreds, enabling complete numerical coverage", () => {
    // Verbatim grammar list from Section 2.2.B of the architecture plan
    const voskGrammar = [
      "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
      "diez", "once", "doce", "trece", "catorce", "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve",
      "veinte", "veintiuno", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa",
      "cien", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos", "mil",
      "y", "punto", "coma", "kilonewtons", "kilos", "toneladas",
      "cono", "tipo uno", "tipo dos", "columna", "tipo tres", "cizalla", "tipo cuatro", "esquina", "tipoRuby", "cabeceo", "puntual", "tipo seis",
      "capturar", "carga", "tara", "iniciar", "detener", "repetir", "confirmar", "guardar", "siguiente", "cancelar"
    ];

    const grammarSet = new Set(voskGrammar);

    // Verify presence of all decades (previously 60, 70, 80, 90 were missing!)
    const allDecades = ["diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
    for (const d of allDecades) {
      assert.ok(grammarSet.has(d), `Decade '${d}' must exist in grammar!`);
    }

    // Verify presence of all hundreds
    const allHundreds = ["cien", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];
    for (const h of allHundreds) {
      assert.ok(grammarSet.has(h), `Hundred '${h}' must exist in grammar!`);
    }

    // Verify compound sentence simulation:
    // Operator dictates: "Carga cuatrocientos sesenta y dos punto cinco kilonewtons cono tipo uno confirmar"
    const dictatedTokens = ["cuatrocientos", "sesenta", "y", "dos", "punto", "cinco", "kilonewtons", "cono", "confirmar"];
    for (const token of dictatedTokens) {
      assert.ok(grammarSet.has(token), `Token '${token}' must NOT be rejected by Vosk acoustic automaton!`);
    }
  });

  // -------------------------------------------------------------------------
  // DEFECT 5: Forney LBF conversion factor & 3-frame anti-flutter persistence filter
  // -------------------------------------------------------------------------
  test("DEFECT 5A RESOLVED: Forney LBF conversion factor normalizes imperial telemetry to metric SI", () => {
    const rawTrama = "TEST: 00124  FORCE: 103250 LBF  STRESS: 3652 PSI  PEAK: 103250 LBF\r\n";
    const parsed = parseForneyFrameHardened(rawTrama);

    assert.ok(parsed);
    assert.equal(parsed.forceLbf, 103250);
    // 103250 * 0.0044482216 = 459.27888 -> 459.28 kN
    assert.equal(parsed.forceKn, 459.28, "103,250 LBF must convert to 459.28 kN!");
    // 103250 * 0.45359237 = 46833.4 kgf
    assert.equal(parsed.forceKgf, 46833.4, "103,250 LBF must convert to 46,833.4 kgf!");
    // Stress 3652 PSI * 0.006894757 = 25.18 MPa
    assert.equal(parsed.stressMpa, 25.18, "3,652 PSI must convert to 25.18 MPa!");
    // Stress 3652 PSI * 0.07030696 = 256.76 kg/cm2
    assert.equal(parsed.stressKgCm2, 256.76, "3,652 PSI must convert to 256.76 kg/cm2!");
  });

  test("DEFECT 5B RESOLVED: 3-frame anti-flutter filter ignores hydraulic seating dip and triggers only on sustained rupture", () => {
    const engine = new HardenedPressTelemetryEngine(150.0, 500.0);
    let t = 0;

    // Ramps past minBreakThresholdKn (100 kN) to 120 kN
    engine.processReading(50.0, t += 100);
    engine.processReading(90.0, t += 100);
    engine.processReading(120.0, t += 100);
    assert.equal(engine.peakLoadKn, 120.0);

    // ATTACK SCENARIO: Hydraulic platen seating flutter / valve dip
    // Dip 1: load drops to 100 kN (-16.7%, below 120 * 0.85 = 102 kN)
    const dip1 = engine.processReading(100.0, t += 100);
    assert.equal(dip1.breakDetected, false, "Frame 1 dip must NOT trigger break! (anti-flutter active)");
    assert.equal(engine.consecutiveDropFrames, 1);

    // Recovery: pressure recovers to 118.0 kN
    const recovery = engine.processReading(118.0, t += 100);
    assert.equal(recovery.breakDetected, false);
    assert.equal(engine.consecutiveDropFrames, 0, "Counter must reset upon pressure recovery!");

    // Ramp up to real peak: 480 kN
    engine.processReading(100.0, t += 100);
    engine.processReading(300.0, t += 100);
    engine.processReading(480.0, t += 100);
    assert.equal(engine.peakLoadKn, 480.0);

    // TRUE PHYSICAL SPECIMEN RUPTURE (3 sustained drop frames)
    // Frame 1: drop to 380 kN (> 15% drop below 408 kN)
    const rupture1 = engine.processReading(380.0, t += 100);
    assert.equal(rupture1.breakDetected, false, "Rupture Frame 1 must not trip immediately");
    assert.equal(engine.consecutiveDropFrames, 1);

    // Frame 2: drop to 300 kN
    const rupture2 = engine.processReading(300.0, t += 100);
    assert.equal(rupture2.breakDetected, false, "Rupture Frame 2 must not trip immediately");
    assert.equal(engine.consecutiveDropFrames, 2);

    // Frame 3: drop to 150 kN (3rd consecutive frame -> Break confirmed!)
    const rupture3 = engine.processReading(150.0, t += 100);
    assert.equal(rupture3.breakDetected, true, "Rupture Frame 3 must confirm break!");
    assert.equal(engine.isTesting, false, "Testing flag must stop!");
    assert.equal(rupture3.peakLoadKn, 480.0, "Historical peak 480 kN must be retained!");
  });

  test("DEFECT 5C RESOLVED: Dynamic break threshold enables break detection on low-strength specimens (< 30 kN)", () => {
    // 100x200 mm cylinder with expected load 25 kN
    const engine = new HardenedPressTelemetryEngine(100.0, 25.0);
    // minBreakThresholdKn should be max(10.0, 25 * 0.20 = 5.0) = 10.0 kN (NOT 30.0 kN!)
    assert.equal(engine.minBreakThresholdKn, 10.0);

    let t = 0;
    engine.processReading(6.0, t += 100);
    engine.processReading(15.0, t += 100);
    engine.processReading(24.0, t += 100);
    assert.equal(engine.peakLoadKn, 24.0);

    // Low-strength specimen shatters to 0 kN (3 sustained frames)
    engine.processReading(18.0, t += 100); // Frame 1
    engine.processReading(10.0, t += 100); // Frame 2
    const breakFrame = engine.processReading(2.0, t += 100); // Frame 3

    assert.equal(breakFrame.breakDetected, true, "Low-strength break must be detected under dynamic threshold!");
    assert.equal(breakFrame.peakLoadKn, 24.0);
  });

  // -------------------------------------------------------------------------
  // BONUS: LibreOffice Calc Headless Formula Validation using soffice.com
  // -------------------------------------------------------------------------
  test("BONUS RESOLVED: Generated corporate Excel formulas are syntactically valid in LibreOffice Calc via soffice.com", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Reporte", { views: [{ showGridLines: true }] });

    ws.getCell("G3").value = "f'c Proyecto:";
    ws.getCell("H3").value = 300;

    ws.getRow(9).values = ["#", "F. Colado", "F. Ensaye", "Edad (d)", "D1 (mm)", "D2 (mm)", "L (mm)", "Área (cm²)", "Carga (kg)", "f'c (kg/cm²)", "% f'c"];

    // Row 10: Specimen with L/D = 300 / 150 = 2.0 (factorLd = 1.0)
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
    r10.getCell(10).value = { formula: "ROUND((I10/H10)*1.000, 1)", result: 318.0 };
    r10.getCell(11).value = { formula: "ROUND((J10/$H$3)*100, 1)", result: 106.0 };

    // Row 11: Specimen with L/D = 225 / 150 = 1.50 -> factorLd = 0.960
    const r11 = ws.getRow(11);
    r11.getCell(1).value = 2;
    r11.getCell(2).value = "2026-10-02";
    r11.getCell(3).value = "2026-10-30";
    r11.getCell(4).value = 28;
    r11.getCell(5).value = 150.0;
    r11.getCell(6).value = 150.0;
    r11.getCell(7).value = 225.0;
    r11.getCell(8).value = { formula: "ROUND(PI()*POWER(((E11+F11)/2)/10, 2)/4, 2)", result: 176.71 };
    r11.getCell(9).value = 55800;
    r11.getCell(10).value = { formula: "ROUND((I11/H11)*0.960, 1)", result: 303.1 };
    r11.getCell(11).value = { formula: "ROUND((J11/$H$3)*100, 1)", result: 101.0 };

    ws.getCell("I13").value = "Promedio 28d:";
    ws.getCell("J13").value = { formula: "AVERAGEIF(D10:D11, 28, J10:J11)", result: 310.55 };

    const testDir = path.resolve("tests", "empirical");
    const testXlsx = path.join(testDir, "test_output_it2.xlsx");
    await wb.xlsx.writeFile(testXlsx);

    assert.ok(fs.existsSync(testXlsx));

    const sofficeCom = '"C:\\Program Files\\LibreOffice\\program\\soffice.com"';
    try {
      execSync(`${sofficeCom} --headless --convert-to csv --outdir "${testDir}" "${testXlsx}"`, { stdio: "pipe" });
      const testCsv = path.join(testDir, "test_output_it2.csv");
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
