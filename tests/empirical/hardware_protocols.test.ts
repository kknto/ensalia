import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Re-implementation of Worker's PressTelemetryEngine verbatim from Section 2.4.C
export class WorkerPressTelemetryEngine {
  public peakLoadKn = 0;
  public isTesting = false;
  public loadHistory: Array<{ time: number; loadKn: number }> = [];

  private readonly minRateKnS = 3.53; // 0.20 MPa/s for 15x30 cm
  private readonly maxRateKnS = 5.30; // 0.30 MPa/s for 15x30 cm

  public processReading(loadKn: number, timestamp = performance.now()): {
    currentLoadKn: number;
    peakLoadKn: number;
    currentRateKnS: number;
    rateCompliant: boolean;
    breakDetected: boolean;
  } {
    // 1. Detección de inicio de ensaye al superar umbral de precarga (5 kN)
    if (loadKn > 5.0 && !this.isTesting) {
      this.isTesting = true;
      this.peakLoadKn = loadKn;
      this.loadHistory = [];
    }

    // 2. Buffer circular de ventana temporal móvil (últimos 1.5 segundos)
    this.loadHistory.push({ time: timestamp, loadKn });
    if (this.loadHistory.length > 20) this.loadHistory.shift();

    // 3. Cálculo de la derivada instantánea dP/dt
    let currentRateKnS = 0;
    if (this.loadHistory.length >= 2) {
      const oldest = this.loadHistory[0];
      const dt = (timestamp - oldest.time) / 1000;
      if (dt > 0.1) {
        currentRateKnS = (loadKn - oldest.loadKn) / dt;
      }
    }

    const rateCompliant = currentRateKnS >= this.minRateKnS && currentRateKnS <= this.maxRateKnS;

    // 4. Retención de Carga Pico
    if (loadKn > this.peakLoadKn) {
      this.peakLoadKn = loadKn;
    }

    // 5. Detección Automática de Rotura (Rupture Drop Trigger)
    // Se confirma rotura física cuando la fuerza cae > 15% respecto al pico histórico tras superar 30 kN
    let breakDetected = false;
    if (this.isTesting && this.peakLoadKn > 30.0 && loadKn < this.peakLoadKn * 0.85) {
      breakDetected = true;
      this.isTesting = false;
    }

    return {
      currentLoadKn: loadKn,
      peakLoadKn: this.peakLoadKn,
      currentRateKnS: Math.max(0, currentRateKnS),
      rateCompliant,
      breakDetected,
    };
  }

  public reset(): void {
    this.peakLoadKn = 0;
    this.isTesting = false;
    this.loadHistory = [];
  }
}

// Telemetry parsers for the 4 consoles
export function parseControlsFrame(frame: string): { loadKn?: number; rateKnS?: number; peakKn?: number; status?: string } | null {
  // Continuous: "+00124.5 kN  +002.4 kN/s  ST:RUN\r\n"
  // Peak: "PEAK: +00458.2 kN  TIME: 0084s  ST:STOP\r\n"
  const continuousMatch = frame.match(/([+-]?\d+\.?\d*)\s*kN\s+([+-]?\d+\.?\d*)\s*kN\/s\s+ST:(\w+)/);
  if (continuousMatch) {
    return {
      loadKn: parseFloat(continuousMatch[1]),
      rateKnS: parseFloat(continuousMatch[2]),
      status: continuousMatch[3],
    };
  }
  const peakMatch = frame.match(/PEAK:\s*([+-]?\d+\.?\d*)\s*kN\s+TIME:\s*(\d+)s\s+ST:(\w+)/);
  if (peakMatch) {
    return {
      peakKn: parseFloat(peakMatch[1]),
      status: peakMatch[3],
    };
  }
  return null;
}

export function parseForneyFrame(frame: string): { forceLbf: number; forceKn: number; stressPsi: number; peakLbf: number; peakKn: number } | null {
  // "TEST: 00124  FORCE: 103250 LBF  STRESS: 3652 PSI  PEAK: 103250 LBF\r\n"
  const match = frame.match(/TEST:\s*\d+\s+FORCE:\s*(\d+)\s*LBF\s+STRESS:\s*(\d+)\s*PSI\s+PEAK:\s*(\d+)\s*LBF/i);
  if (!match) return null;
  const forceLbf = parseFloat(match[1]);
  const stressPsi = parseFloat(match[2]);
  const peakLbf = parseFloat(match[3]);
  const LBF_TO_KN = 0.0044482216;
  return {
    forceLbf,
    forceKn: Number((forceLbf * LBF_TO_KN).toFixed(2)),
    stressPsi,
    peakLbf,
    peakKn: Number((peakLbf * LBF_TO_KN).toFixed(2)),
  };
}

export function parseEleMultilineReport(multiline: string): { sampleId?: string; maxLoadKn?: number; paceRateKnS?: number } | null {
  // Multi-line block:
  // ELE ADR-TOUCH - TEST REPORT
  // SAMPLE ID: 260842
  // MAX LOAD: 462.1 kN
  // PACE RATE: 4.5 kN/s
  const idMatch = multiline.match(/SAMPLE ID:\s*(\w+)/i);
  const maxLoadMatch = multiline.match(/MAX LOAD:\s*([\d.]+)\s*kN/i);
  const paceRateMatch = multiline.match(/PACE RATE:\s*([\d.]+)\s*kN\/s/i);

  if (!maxLoadMatch) return null;
  return {
    sampleId: idMatch ? idMatch[1] : undefined,
    maxLoadKn: parseFloat(maxLoadMatch[1]),
    paceRateKnS: paceRateMatch ? parseFloat(paceRateMatch[1]) : undefined,
  };
}

export function parseMatestFrame(frame: string): { channel: string; loadKn: number; rateKnS: number; status: string } | null {
  // "#01L=00452.3R=004.42S=01*\r\n"
  const match = frame.match(/#(\d{2})L=([\d.]+)R=([\d.]+)S=(\w+)\*/);
  if (!match) return null;
  return {
    channel: match[1],
    loadKn: parseFloat(match[2]),
    rateKnS: parseFloat(match[3]),
    status: match[4],
  };
}

describe("Hardware Protocols & Telemetry Verification", () => {
  test("Controls frame parsing (continuous and peak)", () => {
    const cont = parseControlsFrame("+00124.5 kN  +002.4 kN/s  ST:RUN\r\n");
    assert.ok(cont);
    assert.equal(cont.loadKn, 124.5);
    assert.equal(cont.rateKnS, 2.4);
    assert.equal(cont.status, "RUN");

    const peak = parseControlsFrame("PEAK: +00458.2 kN  TIME: 0084s  ST:STOP\r\n");
    assert.ok(peak);
    assert.equal(peak.peakKn, 458.2);
    assert.equal(peak.status, "STOP");
  });

  test("Forney frame parsing requires explicit LBF to kN / kgf conversion", () => {
    const raw = "TEST: 00124  FORCE: 103250 LBF  STRESS: 3652 PSI  PEAK: 103250 LBF\r\n";
    const res = parseForneyFrame(raw);
    assert.ok(res);
    assert.equal(res.forceLbf, 103250);
    // 103250 LBF * 0.0044482216 = 459.28 kN
    assert.equal(res.forceKn, 459.28);
    // CRITICAL FINDING: If raw reading is mistakenly treated as kN, error is 224x!
    assert.notEqual(res.forceKn, 103250);
  });

  test("ELE International multiline report parsing", () => {
    const text = "ELE ADR-TOUCH - TEST REPORT\r\nSAMPLE ID: 260842\r\nMAX LOAD: 462.1 kN\r\nPACE RATE: 4.5 kN/s\r\n";
    const res = parseEleMultilineReport(text);
    assert.ok(res);
    assert.equal(res.sampleId, "260842");
    assert.equal(res.maxLoadKn, 462.1);
    assert.equal(res.paceRateKnS, 4.5);
  });

  test("Matest frame parsing and channel identification", () => {
    const raw = "#01L=00452.3R=004.42S=01*\r\n";
    const res = parseMatestFrame(raw);
    assert.ok(res);
    assert.equal(res.channel, "01");
    assert.equal(res.loadKn, 452.3);
    assert.equal(res.rateKnS, 4.42);
    assert.equal(res.status, "01");
  });

  test("PressTelemetryEngine - Standard break detection at >15% drop", () => {
    const engine = new WorkerPressTelemetryEngine();
    let res: any;
    let t = 0;
    // Preload
    res = engine.processReading(4.0, t += 100);
    assert.equal(res.breakDetected, false);
    // Testing start
    res = engine.processReading(10.0, t += 100);
    assert.equal(engine.isTesting, true);
    // Ramp up to peak 500 kN
    res = engine.processReading(100.0, t += 100);
    res = engine.processReading(300.0, t += 100);
    res = engine.processReading(500.0, t += 100);
    assert.equal(res.peakLoadKn, 500.0);
    assert.equal(res.breakDetected, false);

    // Minor drop (500 -> 450 kN = 10% drop, <= 15%)
    res = engine.processReading(450.0, t += 100);
    assert.equal(res.breakDetected, false);

    // Rupture drop (500 -> 400 kN = 20% drop > 15%)
    res = engine.processReading(400.0, t += 100);
    assert.equal(res.breakDetected, true);
    assert.equal(engine.isTesting, false);
    assert.equal(res.peakLoadKn, 500.0);
  });

  test("CHALLENGE: Premature false break on hydraulic seating flutter at ~32 kN", () => {
    const engine = new WorkerPressTelemetryEngine();
    let t = 0;
    // Ramps past 30 kN to 32 kN
    engine.processReading(10.0, t += 100);
    engine.processReading(20.0, t += 100);
    engine.processReading(32.0, t += 100);
    assert.equal(engine.peakLoadKn, 32.0);

    // Operator or hydraulic valve settles/fluctuates: load dips to 26.5 kN (-17.2%)
    const dip = engine.processReading(26.5, t += 100);
    // 32 * 0.85 = 27.2 kN. 26.5 < 27.2 -> Triggers FALSE break!
    assert.equal(dip.breakDetected, true, "False positive break triggered on seating fluctuation!");
  });

  test("CHALLENGE: Low-strength specimen (peak < 30 kN) never detects break", () => {
    const engine = new WorkerPressTelemetryEngine();
    let t = 0;
    // Early age or mortar cylinder testing: peak reaches 25 kN
    engine.processReading(6.0, t += 100);
    engine.processReading(15.0, t += 100);
    engine.processReading(25.0, t += 100);
    assert.equal(engine.peakLoadKn, 25.0);

    // Cylinder completely shatters to 0 kN
    const res = engine.processReading(2.0, t += 100);
    // Because peakLoadKn (25.0) is not > 30.0, breakDetected is NEVER true!
    assert.equal(res.breakDetected, false, "Bug confirmed: Peak < 30 kN fails to detect break!");
  });
});

