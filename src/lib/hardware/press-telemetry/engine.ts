import { TelemetryReading, PressManufacturer } from "./types";
import {
  parseAnyPressFrame,
  parseControlsFrame,
  parseEleFrame,
  parseForneyFrame,
  parseMatestFrame,
} from "./parsers";

export class PressTelemetryEngine {
  public peakLoadKn = 0;
  public isTesting = false;
  public hasStarted = false;
  public loadHistory: Array<{ time: number; loadKn: number }> = [];
  public consecutiveDropFrames = 0;

  // Parámetros calculados dinámicamente según la geometría del espécimen
  public diameterMm: number;
  public areaCm2 = 0;
  public minRateKnS = 0;
  public maxRateKnS = 0;
  public targetRateKnS = 0;
  public minBreakThresholdKn = 10.0;
  public expectedPeakKn = 400.0;
  public manufacturer: PressManufacturer = "CONTROLS";

  constructor(diameterMm = 150.0, expectedPeakKn?: number) {
    this.diameterMm = diameterMm;
    this.recalculateGeometry(diameterMm, expectedPeakKn);
  }

  public recalculateGeometry(diameterMm: number, expectedPeakKn?: number): void {
    this.diameterMm = diameterMm;
    const areaMm2 = (Math.PI * Math.pow(diameterMm, 2)) / 4;
    this.areaCm2 = Number((areaMm2 / 100).toFixed(2));

    // ASTM C39 / NMX-C-083: 0.15 a 0.35 MPa/s (Tasa objetivo 0.25 MPa/s)
    // Tasa (kN/s) = Tasa (MPa/s) * Área (mm2) * 1e-3
    this.minRateKnS = Number((0.15 * areaMm2 * 1e-3).toFixed(2));
    this.maxRateKnS = Number((0.35 * areaMm2 * 1e-3).toFixed(2));
    this.targetRateKnS = Number((0.25 * areaMm2 * 1e-3).toFixed(2));

    // Umbral dinámico de activación de rotura (mínimo 10.0 kN o 20% de carga prevista)
    const expected = expectedPeakKn || this.areaCm2 * 250 * 0.00980665; // Default f'c = 250 kg/cm2
    this.expectedPeakKn = expected;
    this.minBreakThresholdKn = Math.max(10.0, Number((expected * 0.2).toFixed(1)));
  }

  public setSpecimenDiameter(diameterMm: number): void {
    this.recalculateGeometry(diameterMm);
  }

  public setManufacturer(manufacturer: PressManufacturer): void {
    this.manufacturer = manufacturer;
  }

  public ingestRawFrame(raw: string, manufacturer?: PressManufacturer): TelemetryReading | null {
    const brand = manufacturer || this.manufacturer;
    let parsed = null;

    if (brand === "CONTROLS") {
      parsed = parseControlsFrame(raw);
    } else if (brand === "FORNEY") {
      parsed = parseForneyFrame(raw);
    } else if (brand === "ELE") {
      parsed = parseEleFrame(raw);
    } else if (brand === "MATEST") {
      parsed = parseMatestFrame(raw);
    }

    if (!parsed) {
      parsed = parseAnyPressFrame(raw);
    }

    if (!parsed) return null;

    const reading = this.processReading(parsed.currentKn);
    reading.rawFrame = parsed.raw;
    if (parsed.isPeakFrame) {
      reading.isPeak = true;
    }
    return reading;
  }

  public processReading(loadKn: number, timestamp = performance.now()): TelemetryReading {
    // 1. Detección de inicio de ensayo al superar precarga inicial (5.0 kN)
    if (loadKn > 5.0 && !this.isTesting && !this.hasStarted) {
      this.isTesting = true;
      this.hasStarted = true;
      this.peakLoadKn = loadKn;
      this.loadHistory = [];
      this.consecutiveDropFrames = 0;
    }

    // 2. Ventana deslizante temporal móvil (últimos 1.5 a 2.0 segundos / 20 muestras a 10 Hz)
    this.loadHistory.push({ time: timestamp, loadKn });
    if (this.loadHistory.length > 20) {
      this.loadHistory.shift();
    }

    // 3. Derivada instantánea de carga dP/dt
    let currentRateKnS = 0;
    if (this.loadHistory.length >= 2) {
      const oldest = this.loadHistory[0];
      const dt = (timestamp - oldest.time) / 1000;
      if (dt > 0.1) {
        currentRateKnS = (loadKn - oldest.loadKn) / dt;
      }
    }

    // 4. Retención de Carga Pico Invariable durante el ensayo
    if (this.isTesting && loadKn > this.peakLoadKn) {
      this.peakLoadKn = loadKn;
    }

    // 5. Evaluación de Fase y Cumplimiento Normativo (ASTM C39 §7.5.1)
    // La tasa solo es vinculante en Fase 2 (cuando carga >= 50% de la carga prevista o máxima)
    const isPhase2 = this.isTesting && loadKn >= this.expectedPeakKn * 0.5;
    const rateCompliant =
      !isPhase2 || (currentRateKnS >= this.minRateKnS && currentRateKnS <= this.maxRateKnS);

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
        // Recuperación de presión (asentamiento o fluctuación hidráulica transitoria)
        this.consecutiveDropFrames = 0;
      }
    }

    const phase = !this.isTesting
      ? this.hasStarted
        ? "BROKEN"
        : "PRELOAD"
      : isPhase2
      ? "PHASE_2_NORMATIVE"
      : "PHASE_1";

    const currentLoadKg = Math.round(loadKn * 101.9716);
    const peakLoadKg = Math.round(this.peakLoadKn * 101.9716);
    const currentRateMpaS =
      this.areaCm2 > 0 ? Number(((currentRateKnS * 10) / this.areaCm2).toFixed(2)) : 0;

    return {
      currentLoadKn: Number(loadKn.toFixed(1)),
      currentLoadKg,
      peakLoadKn: Number(this.peakLoadKn.toFixed(1)),
      peakLoadKg,
      currentRateKnS: Math.max(0, Number(currentRateKnS.toFixed(2))),
      currentRateMpaS,
      rateCompliant,
      breakDetected,
      phase,
    };
  }

  public reset(): void {
    this.peakLoadKn = 0;
    this.isTesting = false;
    this.hasStarted = false;
    this.loadHistory = [];
    this.consecutiveDropFrames = 0;
  }
}
