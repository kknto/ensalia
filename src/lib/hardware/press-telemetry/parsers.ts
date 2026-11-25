import { ParsedPressFrame, ForneyNormalizedData } from "./types";

export const LBF_TO_KN = 0.0044482216;
export const LBF_TO_KGF = 0.45359237;
export const PSI_TO_MPA = 0.006894757;
export const PSI_TO_KGCM2 = 0.07030696;

/**
 * CONTROLS Group (DigiPlus, Advantest 9, Automax)
 * - Trama continua: "+00124.5 kN  +002.4 kN/s  ST:RUN"
 * - Trama pico: "PEAK: +00458.2 kN  TIME: 0084s  ST:STOP"
 */
export function parseControlsFrame(frame: string): ParsedPressFrame | null {
  const clean = frame.trim();

  // 1. Trama de Carga Pico
  if (clean.includes("PEAK:")) {
    const peakMatch = clean.match(/PEAK:\s*([+-]?\d+\.?\d*)\s*kN/i);
    if (peakMatch) {
      const peakKn = parseFloat(peakMatch[1]);
      return {
        manufacturer: "CONTROLS",
        currentKn: peakKn,
        peakKn,
        isPeakFrame: true,
        raw: clean,
      };
    }
  }

  // 2. Trama Continua
  const contMatch = clean.match(/([+-]?\d+\.?\d*)\s*kN\s*([+-]?\d+\.?\d*)\s*kN\/s/i);
  if (contMatch) {
    const currentKn = parseFloat(contMatch[1]);
    const rateKnS = parseFloat(contMatch[2]);
    return {
      manufacturer: "CONTROLS",
      currentKn: Math.max(0, currentKn),
      rateKnS,
      isPeakFrame: false,
      raw: clean,
    };
  }

  return null;
}

/**
 * FORNEY LP (Co-Pilot, ForneyLink, VFD)
 * - Trama ASCII: "TEST: 00124  FORCE: 103250 LBF  STRESS: 3652 PSI  PEAK: 103250 LBF"
 * Normalización obligatoria de unidades imperiales a sistema métrico internacional SI.
 */
export function parseForneyFrame(frame: string): (ParsedPressFrame & { normalized: ForneyNormalizedData }) | null {
  const match = frame.match(
    /TEST:\s*\d+\s+FORCE:\s*(\d+\.?\d*)\s*LBF\s+STRESS:\s*(\d+\.?\d*)\s*PSI\s+PEAK:\s*(\d+\.?\d*)\s*LBF/i
  );
  if (!match) return null;

  const forceLbf = parseFloat(match[1]);
  const stressPsi = parseFloat(match[2]);
  const peakLbf = parseFloat(match[3]);

  const forceKn = Number((forceLbf * LBF_TO_KN).toFixed(2));
  const forceKgf = Number((forceLbf * LBF_TO_KGF).toFixed(1));
  const stressMpa = Number((stressPsi * PSI_TO_MPA).toFixed(2));
  const stressKgCm2 = Number((stressPsi * PSI_TO_KGCM2).toFixed(2));
  const peakKn = Number((peakLbf * LBF_TO_KN).toFixed(2));
  const peakKgf = Number((peakLbf * LBF_TO_KGF).toFixed(1));

  return {
    manufacturer: "FORNEY",
    currentKn: forceKn,
    peakKn,
    isPeakFrame: true,
    raw: frame.trim(),
    normalized: {
      forceLbf,
      forceKn,
      forceKgf,
      stressPsi,
      stressMpa,
      stressKgCm2,
      peakLbf,
      peakKn,
      peakKgf,
    },
  };
}

/**
 * ELE International (ADR-Touch, ADR-Auto)
 * - Multiline frame:
 *   ELE ADR-TOUCH - TEST REPORT
 *   SAMPLE ID: 260842
 *   MAX LOAD: 462.1 kN
 *   PACE RATE: 4.5 kN/s
 */
export function parseEleFrame(frame: string): ParsedPressFrame | null {
  const isEle = frame.toUpperCase().includes("ELE") || frame.toUpperCase().includes("MAX LOAD:");
  if (!isEle) return null;

  const loadMatch = frame.match(/MAX\s*LOAD:\s*([+-]?\d+\.?\d*)\s*kN/i);
  const rateMatch = frame.match(/PACE\s*RATE:\s*([+-]?\d+\.?\d*)\s*kN\/s/i);

  if (loadMatch) {
    const loadKn = parseFloat(loadMatch[1]);
    const rateKnS = rateMatch ? parseFloat(rateMatch[1]) : undefined;
    return {
      manufacturer: "ELE",
      currentKn: loadKn,
      peakKn: loadKn,
      rateKnS,
      isPeakFrame: true,
      raw: frame.trim(),
    };
  }

  return null;
}

/**
 * MATEST S.p.A. (Cyber-Plus Evolution, Digitec)
 * - Trama: "#01L=00452.3R=004.42S=01*"
 */
export function parseMatestFrame(frame: string): ParsedPressFrame | null {
  const match = frame.match(/#\d+L=([+-]?\d+\.?\d*)R=([+-]?\d+\.?\d*)S=(\d+)\*/i);
  if (!match) return null;

  const loadKn = parseFloat(match[1]);
  const rateKnS = parseFloat(match[2]);
  const status = match[3];

  return {
    manufacturer: "MATEST",
    currentKn: Math.max(0, loadKn),
    rateKnS,
    isPeakFrame: status === "02" || status === "00", // En Matest S=01 es en carga, S=02 o S=00 es fin/pico
    raw: frame.trim(),
  };
}

/**
 * Parser omnidireccional automático que intenta interpretar cualquier trama ASCII
 * proveniente de consolas Controls, Forney, ELE o Matest.
 */
export function parseAnyPressFrame(frame: string): ParsedPressFrame | null {
  return (
    parseControlsFrame(frame) ||
    parseForneyFrame(frame) ||
    parseEleFrame(frame) ||
    parseMatestFrame(frame)
  );
}

