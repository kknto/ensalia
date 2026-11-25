import { createHash } from "node:crypto";

export const FIELD_SHEET_QR_PREFIX = "ENSALIA:HC:1:";
export const FIELD_SHEET_QR_VERSION = 1;

// 32 bytes codificados en base64url sin relleno producen exactamente 43 caracteres.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type ParsedFieldSheetQr = {
  version: typeof FIELD_SHEET_QR_VERSION;
  token: string;
};

export function parseFieldSheetQrPayload(payload: unknown): ParsedFieldSheetQr | null {
  if (typeof payload !== "string" || !payload.startsWith(FIELD_SHEET_QR_PREFIX)) return null;
  const token = payload.slice(FIELD_SHEET_QR_PREFIX.length);
  if (!TOKEN_PATTERN.test(token)) return null;
  return { version: FIELD_SHEET_QR_VERSION, token };
}

export function hashFieldSheetQrToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isFieldSheetVerificationAuthorized(input: {
  required: boolean;
  expectedCode?: string;
  suppliedCode?: string | null;
}): boolean {
  if (!input.required || !input.expectedCode) return true;
  return input.suppliedCode === input.expectedCode;
}

