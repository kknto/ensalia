import { createHash, randomUUID } from "node:crypto";

export const MAX_OCR_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_PDF_PAGES = 4;

export type SupportedOcrMime = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

export class OcrFileError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export type ValidatedOcrFile = {
  id: string;
  mime: SupportedOcrMime;
  extension: "pdf" | "jpg" | "png" | "webp";
  bytes: Uint8Array;
  sha256: string;
  originalName: string;
  pageCount: number | null;
  dimensions: { width: number; height: number } | null;
};

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function detectMime(bytes: Uint8Array): Pick<ValidatedOcrFile, "mime" | "extension"> | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", extension: "pdf" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", extension: "jpg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", extension: "png" };
  if (bytes.length >= 12 && new TextDecoder("ascii").decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder("ascii").decode(bytes.slice(8, 12)) === "WEBP") return { mime: "image/webp", extension: "webp" };
  return null;
}

function safeName(value: string) {
  const leaf = value.replaceAll("\\", "/").split("/").at(-1) || "documento";
  return leaf.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160) || "documento";
}

function pngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: (bytes[offset + 5] << 8) + bytes[offset + 6], width: (bytes[offset + 7] << 8) + bytes[offset + 8] };
    }
    offset += length + 2;
  }
  return null;
}

function inspectPdf(bytes: Uint8Array) {
  const text = new TextDecoder("latin1").decode(bytes);
  if (!text.includes("%%EOF")) throw new OcrFileError("El PDF está incompleto o dañado.");
  if (/\/(JavaScript|JS|OpenAction|Launch|EmbeddedFile|Encrypt)\b/i.test(text)) {
    throw new OcrFileError("El PDF contiene funciones no permitidas. Genere una copia plana para digitalización.");
  }
  const pages = text.match(/\/Type\s*\/Page\b/g)?.length ?? null;
  if (pages !== null && (pages < 1 || pages > MAX_PDF_PAGES)) throw new OcrFileError(`El PDF debe contener entre 1 y ${MAX_PDF_PAGES} páginas.`);
  return pages;
}

export function validateOcrUpload(bytes: Uint8Array, declaredMime: string, originalName: string): ValidatedOcrFile {
  if (!bytes.length) throw new OcrFileError("El archivo está vacío.");
  if (bytes.length > MAX_OCR_FILE_BYTES) throw new OcrFileError("El archivo supera el límite de 15 MB.", 413);
  const detected = detectMime(bytes);
  if (!detected) throw new OcrFileError("Use un PDF, PNG, JPEG o WebP válido.");
  if (declaredMime && declaredMime !== "application/octet-stream" && declaredMime.toLowerCase() !== detected.mime) {
    throw new OcrFileError("El contenido del archivo no coincide con el tipo declarado.");
  }
  const pageCount = detected.mime === "application/pdf" ? inspectPdf(bytes) : 1;
  const dimensions = detected.mime === "image/png" ? pngDimensions(bytes) : detected.mime === "image/jpeg" ? jpegDimensions(bytes) : null;
  return {
    id: randomUUID(), ...detected, bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    originalName: safeName(originalName), pageCount, dimensions,
  };
}
