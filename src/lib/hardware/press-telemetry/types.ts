export type PressManufacturer = "CONTROLS" | "FORNEY" | "ELE" | "MATEST" | "SIMULATOR";
export type PressBrand = PressManufacturer;
export type PressConnectionStatus = "DISCONNECTED" | "CONNECTING" | "STREAMING" | "ERROR";

export interface SerialPortConfig {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: "none" | "even" | "odd";
  flowControl?: "none" | "hardware";
}

export interface TelemetryReading {
  currentLoadKn: number;
  currentLoadKg: number;
  peakLoadKn: number;
  peakLoadKg: number;
  currentRateKnS: number;
  currentRateMpaS?: number;
  rateCompliant: boolean;
  breakDetected: boolean;
  phase: "PRELOAD" | "PHASE_1" | "PHASE_2_NORMATIVE" | "BROKEN";
  rawFrame?: string;
  isPeak?: boolean;
}

export type PressReading = TelemetryReading;

export interface ParsedPressFrame {
  manufacturer: PressManufacturer;
  currentKn: number;
  rateKnS?: number;
  peakKn?: number;
  isPeakFrame: boolean;
  raw: string;
}

export interface ForneyNormalizedData {
  forceLbf: number;
  forceKn: number;
  forceKgf: number;
  stressPsi: number;
  stressMpa: number;
  stressKgCm2: number;
  peakLbf: number;
  peakKn: number;
  peakKgf: number;
}
