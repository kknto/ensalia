import type { OcrEngineResult, OcrTemplate, ReviewSession } from "./types";

export class OcrReviewError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export function createReviewSession(documentId: string, template: OcrTemplate, result: OcrEngineResult): ReviewSession {
  const suggestions = new Map(result.fields.map((field) => [field.key, field]));
  return {
    documentId, version: 1, state: "EN_REVISION",
    fields: template.regions.map((region) => {
      const suggestion = suggestions.get(region.key);
      return {
        key: region.key,
        rawText: suggestion?.rawText ?? "",
        proposedValue: suggestion?.proposedValue ?? null,
        finalValue: suggestion?.proposedValue ?? null,
        confidence: suggestion?.confidence ?? null,
        box: region.box,
        warnings: suggestion?.warnings ?? ["Sin sugerencia automática."],
        required: region.required,
        state: "PENDIENTE",
      };
    }),
  };
}

export function reviewField(session: ReviewSession, key: string, value: string | number | boolean | null, reviewerId: string, expectedVersion: number): ReviewSession {
  if (session.state !== "EN_REVISION") throw new OcrReviewError("El documento ya no está en revisión.", 409);
  if (session.version !== expectedVersion) throw new OcrReviewError("La captura cambió mientras se revisaba. Recargue e intente de nuevo.", 409);
  const index = session.fields.findIndex((field) => field.key === key);
  if (index < 0) throw new OcrReviewError("El campo no pertenece a esta plantilla.");
  const field = session.fields[index];
  const state = value === null || value === "" ? "OMITIDO" : value === field.proposedValue ? "ACEPTADO" : "CORREGIDO";
  const fields = session.fields.slice();
  fields[index] = { ...field, finalValue: value, state, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() };
  return { ...session, fields, version: session.version + 1 };
}

export function confirmReview(session: ReviewSession, expectedVersion: number): ReviewSession {
  if (session.version !== expectedVersion) throw new OcrReviewError("La captura cambió mientras se confirmaba.", 409);
  if (session.state !== "EN_REVISION") throw new OcrReviewError("El documento ya no está en revisión.", 409);
  const pending = session.fields.filter((field) => field.state === "PENDIENTE");
  if (pending.length) throw new OcrReviewError(`Revise todos los campos antes de confirmar: ${pending.map((item) => item.key).join(", ")}.`);
  const missing = session.fields.filter((field) => field.required && (field.state === "OMITIDO" || field.finalValue === null || field.finalValue === ""));
  if (missing.length) throw new OcrReviewError(`Faltan campos obligatorios: ${missing.map((item) => item.key).join(", ")}.`);
  return { ...session, state: "CONFIRMADO", version: session.version + 1 };
}
