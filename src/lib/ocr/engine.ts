import type { OcrEngineResult, OcrTemplate } from "./types";

export type OcrEngineInput = {
  bytes: Uint8Array;
  mime: string;
  sha256: string;
  template?: OcrTemplate;
};

export interface OcrEngine {
  readonly name: string;
  readonly version: string;
  isAvailable(): Promise<boolean>;
  analyze(input: OcrEngineInput): Promise<OcrEngineResult>;
}

export class ManualReviewEngine implements OcrEngine {
  readonly name = "manual-review";
  readonly version = "1";
  async isAvailable() { return true; }
  async analyze(input: OcrEngineInput): Promise<OcrEngineResult> {
    return {
      engine: this.name,
      engineVersion: this.version,
      status: "MANUAL_REQUIRED",
      fields: (input.template?.regions ?? []).map((region) => ({
        key: region.key, rawText: "", proposedValue: null, confidence: null, box: region.box,
        warnings: ["Captura manual requerida: no hay un motor OCR local instalado."],
      })),
      warnings: ["El documento fue validado, pero requiere transcripción y confirmación humana."],
    };
  }
}

export async function chooseOcrEngine(engines: OcrEngine[], fallback = new ManualReviewEngine()) {
  for (const engine of engines) if (await engine.isAvailable()) return engine;
  return fallback;
}
