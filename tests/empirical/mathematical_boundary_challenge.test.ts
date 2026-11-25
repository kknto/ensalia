import { test, describe } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";

// ============================================================================
// 1. PressTelemetryEngine verbatim from Architecture Plan Section 2.4.C
// ============================================================================
export class PlanPressTelemetryEngine {
  public peakLoadKn = 0;
  public isTesting = false;
  public loadHistory: Array<{ time: number; loadKn: number }> = [];
  public consecutiveDropFrames = 0;

  public readonly areaCm2: number;
  public readonly minRateKnS: number;
  public readonly maxRateKnS: number;
  public readonly targetRateKnS: number;
  public readonly minBreakThresholdKn: number;

  constructor(
    diameterMm = 150.0,
    expectedPeakKn?: number
  ) {
    const areaMm2 = (Math.PI * Math.pow(diameterMm, 2)) / 4;
    this.areaCm2 = Number((areaMm2 / 100).toFixed(2));

    // ASTM C39 / NMX-C-083: 0.15 a 0.35 MPa/s (Tasa objetivo 0.25 MPa/s)
    this.minRateKnS = Number((0.15 * areaMm2 * 1e-3).toFixed(2));
    this.maxRateKnS = Number((0.35 * areaMm2 * 1e-3).toFixed(2));
    this.targetRateKnS = Number((0.25 * areaMm2 * 1e-3).toFixed(2));

    // Umbral dinámico de activación de rotura (mínimo 10 kN o 20% de carga prevista)
    const expected = expectedPeakKn || (this.areaCm2 * 250 * 0.00980665); // Default f'c = 250 kg/cm2
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
    // 1. Detección de inicio de ensayo al superar precarga inicial (5.0 kN)
    if (loadKn > 5.0 && !this.isTesting) {
      this.isTesting = true;
      this.peakLoadKn = loadKn;
      this.loadHistory = [];
      this.consecutiveDropFrames = 0;
    }

    // 2. Ventana deslizante temporal móvil (últimos 1.5 segundos / 15 muestras a 10 Hz)
    this.loadHistory.push({ time: timestamp, loadKn });
    if (this.loadHistory.length > 20) this.loadHistory.shift();

    // 3. Derivada instantánea de carga dP/dt
    let currentRateKnS = 0;
    if (this.loadHistory.length >= 2) {
      const oldest = this.loadHistory[0];
      const dt = (timestamp - oldest.time) / 1000;
      if (dt > 0.05) {
        currentRateKnS = (loadKn - oldest.loadKn) / dt;
      }
    }

    // 4. Retención de Carga Pico Invariable
    if (loadKn > this.peakLoadKn) {
      this.peakLoadKn = loadKn;
    }

    // 5. Evaluación de Fase y Cumplimiento Normativo (ASTM C39 §7.5.1)
    // BUG/CHALLENGE ANALYSIS:
    // If loadKn >= this.peakLoadKn * 0.50, since this.peakLoadKn was just updated to loadKn in step 4,
    // loadKn >= loadKn * 0.50 is ALWAYS TRUE for any positive loadKn!
    const isPhase2 = this.isTesting && (loadKn >= this.peakLoadKn * 0.50 || loadKn >= this.minBreakThresholdKn * 1.5);
    const rateCompliant = !isPhase2 || (currentRateKnS >= this.minRateKnS && currentRateKnS <= this.maxRateKnS);

    // 6. Detección Robusta de Rotura con Filtro Anti-Flutter (>= 3 frames consecutivos con caída > 15%)
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
      currentRateKnS: Math.max(0, currentRateKnS),
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

// ============================================================================
// 2. Slenderness Factor F_L/D calculation (ASTM C39 / NMX-C-083 Section 3.1.B)
// ============================================================================
export interface SlendernessFactorResult {
  factorLd: number;
  rejected: boolean;
  status: "VALID_STANDARD" | "VALID_CORRECTED" | "REJECTED_OUT_OF_SPEC";
  reason?: string;
}

export function calculateSlendernessFactor(
  lengthMm: number,
  diameterMm: number,
  standard: "ASTM" | "NMX" = "ASTM"
): SlendernessFactorResult {
  if (diameterMm <= 0 || lengthMm <= 0) {
    return { factorLd: 0, rejected: true, status: "REJECTED_OUT_OF_SPEC", reason: "Invalid dimensions" };
  }

  const ld = lengthMm / diameterMm;

  // Boundary guard 1: ld < 1.00 -> REJECTED
  if (ld < 1.00) {
    return {
      factorLd: 0,
      rejected: true,
      status: "REJECTED_OUT_OF_SPEC",
      reason: `L/D ratio ${ld.toFixed(2)} < 1.00 is rejected by ${standard} specification. Extrapolation prohibited.`,
    };
  }

  // Boundary guard 2: ld >= 2.00 -> Clamped strictly at 1.000
  if (ld >= 2.00) {
    return {
      factorLd: 1.000,
      rejected: false,
      status: "VALID_STANDARD",
    };
  }

  // Linear interpolation tables
  // L/D: 1.00, 1.25, 1.50, 1.75, 2.00
  const astmTable = [
    { ld: 1.00, factor: 0.87 },
    { ld: 1.25, factor: 0.93 },
    { ld: 1.50, factor: 0.96 },
    { ld: 1.75, factor: 0.98 },
    { ld: 2.00, factor: 1.00 },
  ];

  const nmxTable = [
    { ld: 1.00, factor: 0.89 },
    { ld: 1.25, factor: 0.94 },
    { ld: 1.50, factor: 0.96 },
    { ld: 1.75, factor: 0.98 },
    { ld: 2.00, factor: 1.00 },
  ];

  const table = standard === "ASTM" ? astmTable : nmxTable;

  for (let i = 0; i < table.length - 1; i++) {
    const lower = table[i];
    const upper = table[i + 1];
    if (ld >= lower.ld && ld <= upper.ld) {
      const interpolated = lower.factor + ((ld - lower.ld) / (upper.ld - lower.ld)) * (upper.factor - lower.factor);
      return {
        factorLd: Number(interpolated.toFixed(3)),
        rejected: false,
        status: "VALID_CORRECTED",
      };
    }
  }

  return { factorLd: 1.000, rejected: false, status: "VALID_STANDARD" };
}

// ============================================================================
// 3. ACI 214R-11 / ACI 318-19 Statistical Evaluation Engine (Section 3.2)
// ============================================================================
export interface AciStatisticsResult {
  n: number;
  mean: number;
  stdDev: number;
  adjustedStdDev: number;
  kFactor: number;
  covPct: number;
  fcr: number | null;
  overdesignFormula: string;
  gaussianPoints: Array<{ x: number; y: number }>;
  status: "INSUFFICIENT_DATA" | "FIXED_MARGIN_LOW_HISTORY" | "ADJUSTED_STATISTICAL" | "STANDARD_STATISTICAL";
}

export function calculateAciStatistics(
  fcNominalKgCm2: number,
  testResultsKgCm2: number[]
): AciStatisticsResult {
  const n = testResultsKgCm2.length;

  // Boundary Guard 1: n < 2 -> denominator n - 1 = 0
  if (n < 2) {
    let fcr: number | null = null;
    let overdesignFormula = "n < 15: Margen fijo ACI 318-19 Tabla 26.12.1.1(b)";
    if (fcNominalKgCm2 < 210) fcr = fcNominalKgCm2 + 70;
    else if (fcNominalKgCm2 <= 350) fcr = fcNominalKgCm2 + 85;
    else fcr = Number((1.10 * fcNominalKgCm2 + 50).toFixed(1));

    return {
      n,
      mean: n === 1 ? testResultsKgCm2[0] : 0,
      stdDev: 0,
      adjustedStdDev: 0,
      kFactor: 1.0,
      covPct: 0,
      fcr: n === 0 ? null : fcr,
      overdesignFormula,
      gaussianPoints: [],
      status: n === 0 ? "INSUFFICIENT_DATA" : "FIXED_MARGIN_LOW_HISTORY",
    };
  }

  const mean = testResultsKgCm2.reduce((acc, v) => acc + v, 0) / n;
  const sumSq = testResultsKgCm2.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const stdDev = Math.sqrt(sumSq / (n - 1));

  // Boundary Guard 2: s = 0 (all test results identical)
  if (stdDev <= 1e-6 || mean <= 0) {
    return {
      n,
      mean: Number(mean.toFixed(2)),
      stdDev: 0,
      adjustedStdDev: 0,
      kFactor: 1.0,
      covPct: 0,
      fcr: fcNominalKgCm2,
      overdesignFormula: "Varianza nula (s = 0): f'cr = f'c",
      gaussianPoints: [],
      status: n < 15 ? "FIXED_MARGIN_LOW_HISTORY" : "STANDARD_STATISTICAL",
    };
  }

  const covPct = Number(((stdDev / mean) * 100).toFixed(2));

  // Sample size correction factor k (Section 3.2.C)
  let kFactor = 1.00;
  if (n < 15) {
    kFactor = 1.00; // Not applicable: fixed margin used instead
  } else if (n < 20) {
    // Linear interp: n=15 -> 1.16, n=20 -> 1.08
    kFactor = 1.16 - ((n - 15) / 5) * (1.16 - 1.08);
  } else if (n < 25) {
    // Linear interp: n=20 -> 1.08, n=25 -> 1.03
    kFactor = 1.08 - ((n - 20) / 5) * (1.08 - 1.03);
  } else if (n < 30) {
    // Linear interp: n=25 -> 1.03, n=30 -> 1.00
    kFactor = 1.03 - ((n - 25) / 5) * (1.03 - 1.00);
  } else {
    kFactor = 1.00;
  }
  kFactor = Number(kFactor.toFixed(3));

  const adjustedStdDev = Number((stdDev * kFactor).toFixed(2));

  // Determine f'cr:
  let fcr: number;
  let overdesignFormula = "";
  let status: AciStatisticsResult["status"];

  if (n < 15) {
    // ACI 318-19 Table 26.12.1.1(b) Fixed overdesign margins
    status = "FIXED_MARGIN_LOW_HISTORY";
    if (fcNominalKgCm2 < 210) {
      fcr = fcNominalKgCm2 + 70;
      overdesignFormula = "f'cr = f'c + 70 kg/cm² (n < 15, f'c < 210)";
    } else if (fcNominalKgCm2 <= 350) {
      fcr = fcNominalKgCm2 + 85;
      overdesignFormula = "f'cr = f'c + 85 kg/cm² (n < 15, 210 <= f'c <= 350)";
    } else {
      fcr = Number((1.10 * fcNominalKgCm2 + 50).toFixed(1));
      overdesignFormula = "f'cr = 1.10 f'c + 50 kg/cm² (n < 15, f'c > 350)";
    }
  } else {
    // n >= 15: Statistical overdesign formulas
    status = n < 30 ? "ADJUSTED_STATISTICAL" : "STANDARD_STATISTICAL";
    const s = adjustedStdDev;
    if (fcNominalKgCm2 <= 350) {
      const fcr1 = fcNominalKgCm2 + 1.34 * s;
      const fcr2 = fcNominalKgCm2 + 2.33 * s - 35;
      fcr = Math.max(fcr1, fcr2);
      overdesignFormula = `f'cr = max(f'c + 1.34s [${fcr1.toFixed(1)}], f'c + 2.33s - 35 [${fcr2.toFixed(1)}])`;
    } else {
      const fcr1 = fcNominalKgCm2 + 1.34 * s;
      const fcr2 = 0.90 * fcNominalKgCm2 + 2.33 * s;
      fcr = Math.max(fcr1, fcr2);
      overdesignFormula = `f'cr = max(f'c + 1.34s [${fcr1.toFixed(1)}], 0.90 f'c + 2.33s [${fcr2.toFixed(1)}])`;
    }
    fcr = Number(fcr.toFixed(1));
  }

  // Gaussian Curve generation (Section 3.2.E)
  const gaussianPoints: Array<{ x: number; y: number }> = [];
  const minX = Math.max(0, mean - 3.5 * stdDev);
  const maxX = mean + 3.5 * stdDev;
  const step = (maxX - minX) / 60;
  const factor = 1 / (stdDev * Math.sqrt(2 * Math.PI));

  for (let i = 0; i <= 60; i++) {
    const x = minX + i * step;
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
    const y = factor * Math.exp(exponent);
    gaussianPoints.push({ x: Number(x.toFixed(1)), y: Number(y.toFixed(6)) });
  }

  return {
    n,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    adjustedStdDev,
    kFactor,
    covPct,
    fcr,
    overdesignFormula,
    gaussianPoints,
    status,
  };
}

// ============================================================================
// TESTS SUITE
// ============================================================================

describe("MATHEMATICAL & BOUNDARY VERIFICATION (Iteration 2)", () => {

  // --------------------------------------------------------------------------
  // Area 1: Dynamic Area-Scaled Loading Rate in PressTelemetryEngine
  // --------------------------------------------------------------------------
  describe("Area 1: Dynamic Area-Scaled Loading Rate in PressTelemetryEngine", () => {
    test("150 x 300 mm cylinder evaluates strictly at 2.65 - 6.18 kN/s (target 4.42 kN/s)", () => {
      const engine = new PlanPressTelemetryEngine(150.0);
      assert.equal(engine.areaCm2, 176.71);
      assert.equal(engine.minRateKnS, 2.65, "150mm min rate must be 2.65 kN/s");
      assert.ok(Math.abs(engine.maxRateKnS - 6.19) <= 0.01, "150mm max rate must be ~6.19 kN/s");
      assert.equal(engine.targetRateKnS, 4.42, "150mm target rate must be 4.42 kN/s");
    });

    test("100 x 200 mm cylinder evaluates strictly at 1.18 - 2.75 kN/s (target 1.96 kN/s)", () => {
      const engine = new PlanPressTelemetryEngine(100.0);
      assert.equal(engine.areaCm2, 78.54);
      assert.equal(engine.minRateKnS, 1.18, "100mm min rate must be 1.18 kN/s");
      assert.equal(engine.maxRateKnS, 2.75, "100mm max rate must be 2.75 kN/s");
      assert.equal(engine.targetRateKnS, 1.96, "100mm target rate must be 1.96 kN/s");
    });

    test("Rate compliance discrimination between 100mm and 150mm at 2.0 kN/s", () => {
      const engine100 = new PlanPressTelemetryEngine(100.0);
      const engine150 = new PlanPressTelemetryEngine(150.0);

      // Feeding 2.0 kN/s derivative to both:
      // For 100mm: 2.0 kN/s is INSIDE [1.18, 2.75] -> Compliant
      // For 150mm: 2.0 kN/s is BELOW [2.65, 6.18] -> Non-compliant
      let t = 0;
      // Preload & ramp up
      engine100.processReading(6.0, t += 100);
      engine100.loadHistory = []; // Reset window to calibrate immediate derivative
      engine100.processReading(100.0, t += 100);
      const r100 = engine100.processReading(100.2, t += 100); // dP = 0.2 kN in 0.1s => 2.0 kN/s
      assert.ok(Math.abs(r100.currentRateKnS - 2.0) < 0.001);
      assert.equal(r100.rateCompliant, true, "2.0 kN/s must be compliant for 100mm cylinder");

      t = 0;
      engine150.processReading(6.0, t += 100);
      engine150.loadHistory = [];
      engine150.processReading(100.0, t += 100);
      const r150 = engine150.processReading(100.2, t += 100); // 2.0 kN/s
      assert.ok(Math.abs(r150.currentRateKnS - 2.0) < 0.001);
      assert.equal(r150.rateCompliant, false, "2.0 kN/s must be NON-compliant for 150mm cylinder (too slow)");
    });

    test("Hydraulic seating anti-flutter filter requires >= 3 consecutive frames with drop > 15%", () => {
      const engine = new PlanPressTelemetryEngine(150.0, 100.0); // minBreakThresholdKn = max(10, 20) = 20 kN
      let t = 0;
      engine.processReading(10.0, t += 100);
      engine.processReading(35.0, t += 100);
      assert.equal(engine.peakLoadKn, 35.0);

      // Frame 1: drop to 28.0 kN (20% drop > 15%) -> consecutiveDropFrames = 1
      let res = engine.processReading(28.0, t += 100);
      assert.equal(res.breakDetected, false, "Frame 1 drop must not trigger break");
      assert.equal(engine.consecutiveDropFrames, 1);

      // Frame 2: drop continues to 28.5 kN (still < 35 * 0.85 = 29.75) -> consecutiveDropFrames = 2
      res = engine.processReading(28.5, t += 100);
      assert.equal(res.breakDetected, false, "Frame 2 drop must not trigger break");
      assert.equal(engine.consecutiveDropFrames, 2);

      // Hydraulic recovery: load returns to 34.0 kN -> consecutiveDropFrames resets to 0!
      res = engine.processReading(34.0, t += 100);
      assert.equal(res.breakDetected, false, "Recovery must not trigger break");
      assert.equal(engine.consecutiveDropFrames, 0, "Flutter recovery must reset drop counter");

      // Now true break occurs: drops for 3 consecutive frames
      engine.processReading(27.0, t += 100); // Drop 1
      assert.equal(engine.consecutiveDropFrames, 1);
      engine.processReading(25.0, t += 100); // Drop 2
      assert.equal(engine.consecutiveDropFrames, 2);
      res = engine.processReading(20.0, t += 100); // Drop 3
      assert.equal(engine.consecutiveDropFrames, 3);
      assert.equal(res.breakDetected, true, "3 consecutive drop frames must confirm true rupture");
      assert.equal(engine.isTesting, false);
    });

    test("Dynamic break threshold enables early-age break detection below 30 kN", () => {
      // Early age concrete (12 hours) with expected peak of 25 kN
      const engine = new PlanPressTelemetryEngine(100.0, 25.0);
      // minBreakThresholdKn = max(10, 25 * 0.20) = 10.0 kN
      assert.equal(engine.minBreakThresholdKn, 10.0);

      let t = 0;
      engine.processReading(6.0, t += 100);
      engine.processReading(15.0, t += 100);
      engine.processReading(22.0, t += 100); // Peak reached at 22 kN (< 30 kN!)
      assert.equal(engine.peakLoadKn, 22.0);

      // Rupture occurs: load drops to 12.0 kN (< 22 * 0.85 = 18.7 kN) for 3 frames
      engine.processReading(12.0, t += 100);
      engine.processReading(10.0, t += 100);
      const breakRes = engine.processReading(8.0, t += 100);

      assert.equal(breakRes.breakDetected, true, "Early age specimen breaking at 22 kN must be detected!");
      assert.equal(breakRes.peakLoadKn, 22.0);
    });

    test("EMPIRICAL CHALLENGE: Phase evaluation defect in Section 2.4.C", () => {
      // Observation:
      // Line 440: const isPhase2 = this.isTesting && (loadKn >= this.peakLoadKn * 0.50 || loadKn >= this.minBreakThresholdKn * 1.5);
      // Because this.peakLoadKn is updated to loadKn in Step 4, loadKn >= this.peakLoadKn * 0.50 is ALWAYS TRUE
      // whenever loadKn > 0 during monotonic upward loading!
      // This means Phase 1 NEVER exists in the author's code during normal testing!
      const engine = new PlanPressTelemetryEngine(150.0, 500.0);
      let t = 0;
      engine.processReading(6.0, t += 100);
      const resAt10Kn = engine.processReading(10.0, t += 100);

      // At 10 kN (which is only 2% of the anticipated 500 kN load), the engine should be in PHASE_1!
      // But because 10 >= 10 * 0.50 is true, it evaluates to PHASE_2_NORMATIVE!
      assert.equal(
        resAt10Kn.phase,
        "PHASE_2_NORMATIVE",
        "Empirical finding: Engine prematurely enters PHASE_2_NORMATIVE at 10 kN due to peakLoadKn self-comparison!"
      );
    });
  });

  // --------------------------------------------------------------------------
  // Area 2: Slenderness Factor F_L/D & Excel Export Formula
  // --------------------------------------------------------------------------
  describe("Area 2: Slenderness Factor F_L/D & Excel Export Formula", () => {
    test("Clamping strictly at 1.000 for L/D >= 2.00 (Extrapolation prohibited)", () => {
      const standard2 = calculateSlendernessFactor(300, 150); // L/D = 2.00
      assert.equal(standard2.factorLd, 1.000);
      assert.equal(standard2.status, "VALID_STANDARD");

      const tall2_2 = calculateSlendernessFactor(330, 150); // L/D = 2.20
      assert.equal(tall2_2.factorLd, 1.000, "L/D = 2.20 must clamp at 1.000");

      const tall3_0 = calculateSlendernessFactor(450, 150); // L/D = 3.00
      assert.equal(tall3_0.factorLd, 1.000, "L/D = 3.00 must clamp at 1.000");
    });

    test("Rejection for L/D < 1.00 according to ASTM C39 / NMX-C-083", () => {
      const short0_9 = calculateSlendernessFactor(135, 150); // L/D = 0.90
      assert.equal(short0_9.rejected, true);
      assert.equal(short0_9.status, "REJECTED_OUT_OF_SPEC");
      assert.ok(short0_9.reason?.includes("< 1.00"));
    });

    test("Interpolation table values for ASTM C39", () => {
      assert.equal(calculateSlendernessFactor(300, 150, "ASTM").factorLd, 1.000);
      assert.equal(calculateSlendernessFactor(262.5, 150, "ASTM").factorLd, 0.980); // L/D = 1.75
      assert.equal(calculateSlendernessFactor(225, 150, "ASTM").factorLd, 0.960);   // L/D = 1.50
      assert.equal(calculateSlendernessFactor(187.5, 150, "ASTM").factorLd, 0.930); // L/D = 1.25
      assert.equal(calculateSlendernessFactor(150, 150, "ASTM").factorLd, 0.870);   // L/D = 1.00

      // Continuous linear interpolation at midpoints
      assert.equal(calculateSlendernessFactor(281.25, 150, "ASTM").factorLd, 0.990); // L/D = 1.875 -> midpoint 0.98-1.00
      assert.equal(calculateSlendernessFactor(243.75, 150, "ASTM").factorLd, 0.970); // L/D = 1.625 -> midpoint 0.96-0.98
      assert.equal(calculateSlendernessFactor(206.25, 150, "ASTM").factorLd, 0.945); // L/D = 1.375 -> midpoint 0.93-0.96
      assert.equal(calculateSlendernessFactor(168.75, 150, "ASTM").factorLd, 0.900); // L/D = 1.125 -> midpoint 0.87-0.93
    });

    test("Interpolation table values for NMX-C-083", () => {
      assert.equal(calculateSlendernessFactor(300, 150, "NMX").factorLd, 1.000);
      assert.equal(calculateSlendernessFactor(262.5, 150, "NMX").factorLd, 0.980); // L/D = 1.75
      assert.equal(calculateSlendernessFactor(225, 150, "NMX").factorLd, 0.960);   // L/D = 1.50
      assert.equal(calculateSlendernessFactor(187.5, 150, "NMX").factorLd, 0.940); // L/D = 1.25
      assert.equal(calculateSlendernessFactor(150, 150, "NMX").factorLd, 0.890);   // L/D = 1.00
    });

    test("Excel Workbook live formula generates correct F_L/D factor and syntax", async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Test");

      // Setup row 3: f'c proyecto in H3
      ws.getCell("H3").value = 250;

      // Row 10: Standard cylinder (L/D = 2.00, factorLd = 1.000)
      const factorLdStandard = 1.0;
      ws.getCell("E10").value = 150.0;
      ws.getCell("F10").value = 150.0;
      ws.getCell("G10").value = 300.0;
      ws.getCell("H10").value = {
        formula: `ROUND(PI()*POWER(((E10+F10)/2)/10, 2)/4, 2)`,
        result: 176.71,
      };
      ws.getCell("I10").value = 53000;
      ws.getCell("J10").value = {
        formula: factorLdStandard < 1.0
          ? `ROUND((I10/H10)*${factorLdStandard.toFixed(3)}, 1)`
          : `ROUND(I10/H10, 1)`,
        result: 300.0,
      };
      ws.getCell("K10").value = {
        formula: `ROUND((J10/$H$3)*100, 1)`,
        result: 120.0,
      };

      // Row 11: Trimmed core (L/D = 1.50, factorLd = 0.960)
      const factorLdTrimmed = 0.960;
      ws.getCell("E11").value = 150.0;
      ws.getCell("F11").value = 150.0;
      ws.getCell("G11").value = 225.0;
      ws.getCell("H11").value = {
        formula: `ROUND(PI()*POWER(((E11+F11)/2)/10, 2)/4, 2)`,
        result: 176.71,
      };
      ws.getCell("I11").value = 53000;
      ws.getCell("J11").value = {
        formula: factorLdTrimmed < 1.0
          ? `ROUND((I11/H11)*${factorLdTrimmed.toFixed(3)}, 1)`
          : `ROUND(I11/H11, 1)`,
        result: 288.0,
      };
      ws.getCell("K11").value = {
        formula: `ROUND((J11/$H$3)*100, 1)`,
        result: 115.2,
      };

      assert.equal((ws.getCell("J10").value as any).formula, "ROUND(I10/H10, 1)");
      assert.equal((ws.getCell("J11").value as any).formula, "ROUND((I11/H11)*0.960, 1)");

      // Write to binary buffer and ensure zero errors
      const buffer = await wb.xlsx.writeBuffer();
      assert.ok(buffer.byteLength > 1000);
    });
  });

  // --------------------------------------------------------------------------
  // Area 3: ACI 214R / ACI 318 Boundary Cases
  // --------------------------------------------------------------------------
  describe("Area 3: ACI 214R / 318 Boundary Cases", () => {
    test("Zero records (n = 0): returns s=0, fcr=null, points=[] with no crash", () => {
      const res = calculateAciStatistics(250, []);
      assert.equal(res.n, 0);
      assert.equal(res.stdDev, 0);
      assert.equal(res.covPct, 0);
      assert.equal(res.fcr, null);
      assert.equal(res.gaussianPoints.length, 0);
      assert.equal(res.status, "INSUFFICIENT_DATA");
    });

    test("Single record (n = 1): denominator n - 1 = 0 defended, returns s=0, fixed margin fcr", () => {
      const res = calculateAciStatistics(250, [260]);
      assert.equal(res.n, 1);
      assert.equal(res.stdDev, 0);
      assert.equal(res.covPct, 0);
      // Fixed margin for 210 <= f'c <= 350: f'cr = 250 + 85 = 335
      assert.equal(res.fcr, 335);
      assert.equal(res.gaussianPoints.length, 0);
      assert.equal(res.status, "FIXED_MARGIN_LOW_HISTORY");
    });

    test("Zero variance (s = 0) with n >= 2: Gaussian denominator s*sqrt(2pi) defended", () => {
      const res = calculateAciStatistics(250, [250, 250, 250, 250]);
      assert.equal(res.n, 4);
      assert.equal(res.stdDev, 0);
      assert.equal(res.covPct, 0);
      assert.equal(res.fcr, 250);
      assert.equal(res.gaussianPoints.length, 0);
      assert.ok(res.overdesignFormula.includes("s = 0"));
    });

    test("ACI 318-19 Table 26.12.1.1(b) fixed overdesign additions for n < 15", () => {
      // f'c < 210: f'cr = f'c + 70
      const resLow = calculateAciStatistics(150, [160, 165, 155]);
      assert.equal(resLow.status, "FIXED_MARGIN_LOW_HISTORY");
      assert.equal(resLow.fcr, 150 + 70); // 220

      // 210 <= f'c <= 350: f'cr = f'c + 85
      const resMid = calculateAciStatistics(300, [310, 320, 295, 305]);
      assert.equal(resMid.status, "FIXED_MARGIN_LOW_HISTORY");
      assert.equal(resMid.fcr, 300 + 85); // 385

      // f'c > 350: f'cr = 1.10 * f'c + 50
      const resHigh = calculateAciStatistics(400, [410, 420, 395, 415]);
      assert.equal(resHigh.status, "FIXED_MARGIN_LOW_HISTORY");
      assert.equal(resHigh.fcr, Number((400 * 1.10 + 50).toFixed(1))); // 440 + 50 = 490
    });

    test("Sample size correction factor k for 15 <= n < 30", () => {
      const makeDataset = (count: number, base = 260) =>
        Array.from({ length: count }, (_, i) => base + (i % 5) * 5);

      // n = 15 -> k = 1.16
      const res15 = calculateAciStatistics(250, makeDataset(15));
      assert.equal(res15.kFactor, 1.16);
      assert.equal(res15.status, "ADJUSTED_STATISTICAL");

      // n = 20 -> k = 1.08
      const res20 = calculateAciStatistics(250, makeDataset(20));
      assert.equal(res20.kFactor, 1.08);

      // n = 25 -> k = 1.03
      const res25 = calculateAciStatistics(250, makeDataset(25));
      assert.equal(res25.kFactor, 1.03);

      // n = 30 -> k = 1.00
      const res30 = calculateAciStatistics(250, makeDataset(30));
      assert.equal(res30.kFactor, 1.00);
      assert.equal(res30.status, "STANDARD_STATISTICAL");
    });

    test("High-strength switch at f'c = 350 kg/cm2 and mathematical continuity", () => {
      // At exactly f'c = 350 kg/cm2:
      // Conventional: 350 + 2.33s - 35 = 315 + 2.33s
      // High strength: 0.90 * 350 + 2.33s = 315 + 2.33s
      // Mathematical continuity: both formulas yield IDENTICAL results at f'c = 350!
      const s = 30; // standard deviation
      const convFormula2 = 350 + 2.33 * s - 35;
      const highFormula2 = 0.90 * 350 + 2.33 * s;
      assert.equal(convFormula2, 384.9);
      assert.equal(highFormula2, 384.9);

      // Now verify with calculateAciStatistics on n = 30 tests
      // Normal concrete: f'c = 300 <= 350
      const tests300 = Array.from({ length: 30 }, (_, i) => 300 + (i % 2 === 0 ? 20 : -20));
      const res300 = calculateAciStatistics(300, tests300);
      assert.ok(res300.overdesignFormula.includes("2.33s - 35"));

      // High strength concrete: f'c = 400 > 350
      const tests400 = Array.from({ length: 30 }, (_, i) => 400 + (i % 2 === 0 ? 20 : -20));
      const res400 = calculateAciStatistics(400, tests400);
      assert.ok(res400.overdesignFormula.includes("0.90 f'c + 2.33s"));
    });
  });
});
