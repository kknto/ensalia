import crypto from "node:crypto";
import QRCode from "qrcode";
import { CanonicalCompressionPayload } from "./types";

/**
 * Serializador JSON determinista que ordena alfabéticamente todas las claves de forma recursiva.
 * Garantiza que dos objetos idénticos generen exactamente la misma cadena e idéntico hash SHA-256.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const keyValues = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(record[k])}`);
  return "{" + keyValues.join(",") + "}";
}

/**
 * Calcula el hash SHA-256 inmutable de una cadena en UTF-8.
 */
export function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export interface QrGenerationResult {
  sha256: string;
  canonicalJson: string;
  intranetUrl: string;
  offlineToken: string;
  qrPngBytes: Uint8Array;
}

/**
 * Genera el paquete criptográfico del informe y el código QR como imagen PNG en memoria (100% offline).
 */
export async function generateReportQr(
  payload: CanonicalCompressionPayload,
  baseUrl: string = "http://localhost:3000"
): Promise<QrGenerationResult> {
  const canonicalJson = canonicalizeJson(payload);
  const sha256 = computeSha256(canonicalJson);

  // Fecha compacta YYYYMMDD
  const dateCompact = payload.fechaEmisionUtc.slice(0, 10).replace(/-/g, "");

  // Máxima resistencia o última resistencia del lote
  const lastSpecimen = payload.especimenes[payload.especimenes.length - 1];
  const fcReportado = lastSpecimen ? lastSpecimen.resistenciaKgCm2.toFixed(1) : "0.0";

  // Token autónomo offline
  const offlineToken = `ENSALIA:COMP:1:${payload.folio}:${dateCompact}:${fcReportado}:${sha256.slice(0, 16)}`;

  // Enlace web / intranet
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const intranetUrl = `${cleanBase}/verify/${sha256}?folio=${encodeURIComponent(payload.folio)}&token=${encodeURIComponent(offlineToken)}`;

  // Generar imagen QR en memoria como Buffer PNG
  const qrPngBuffer = await QRCode.toBuffer(intranetUrl, {
    errorCorrectionLevel: "H",
    width: 256,
    margin: 1,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });

  return {
    sha256,
    canonicalJson,
    intranetUrl,
    offlineToken,
    qrPngBytes: new Uint8Array(qrPngBuffer),
  };
}

