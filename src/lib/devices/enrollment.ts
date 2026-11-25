import crypto from "node:crypto";
import QRCode from "qrcode";

const DEVICE_SECRET = process.env.ENSALIA_DEVICE_SECRET || "ensalia-field-device-secret-key-2026";

/**
 * Genera un código de enrolamiento legible de un solo uso (ej. ENS-8392)
 */
export function generateEnrollmentCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin caracteres confusos como 0/O, 1/I
  let randomPart = "";
  const randomBytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    randomPart += chars[randomBytes[i] % chars.length];
  }
  return `ENS-${randomPart}`;
}

export interface EnrollmentPayload {
  version: 1;
  serverUrl: string;
  code: string;
  deviceId: string;
  issuedAt: string;
}

/**
 * Genera la imagen QR en formato Data URL a partir del payload de enrolamiento
 */
export async function generateQrDataUrl(payload: EnrollmentPayload): Promise<string> {
  const json = JSON.stringify(payload);
  return QRCode.toDataURL(json, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#0f231c",
      light: "#ffffff",
    },
  });
}

/**
 * Genera un token firmado para el dispositivo que vincula su hardware UUID
 */
export function generateDeviceToken(deviceId: string, deviceUuid: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: deviceId,
      duid: deviceUuid,
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", DEVICE_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
    
  return `${header}.${payload}.${signature}`;
}

/**
 * Verifica el token del dispositivo y comprueba que corresponda al UUID físico
 */
export function verifyDeviceToken(token: string, expectedDeviceUuid?: string): { valid: boolean; deviceId?: string; deviceUuid?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };
    const [header, payload, signature] = parts;
    
    const expectedSig = crypto
      .createHmac("sha256", DEVICE_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");
      
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false };
    }
    
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (expectedDeviceUuid && decoded.duid !== expectedDeviceUuid) {
      return { valid: false };
    }
    
    return { valid: true, deviceId: decoded.sub, deviceUuid: decoded.duid };
  } catch {
    return { valid: false };
  }
}
