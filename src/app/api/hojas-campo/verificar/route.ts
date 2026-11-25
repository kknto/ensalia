import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashFieldSheetQrToken,
  isFieldSheetVerificationAuthorized,
  parseFieldSheetQrPayload,
} from "@/lib/documents/qr-verification";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const accessRequired = process.env.ENSALIA_REQUIRE_ACCESS_CODE?.toLowerCase() === "true";
  if (!isFieldSheetVerificationAuthorized({
    required: accessRequired,
    expectedCode: process.env.APP_ACCESS_CODE,
    suppliedCode: request.headers.get("x-app-access-code"),
  })) {
    return Response.json({ error: "Codigo de acceso invalido" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Solicitud JSON invalida" }, { status: 400 });
  }

  const payload = body && typeof body === "object" && "payload" in body
    ? (body as { payload?: unknown }).payload
    : undefined;
  const parsed = parseFieldSheetQrPayload(payload);
  if (!parsed) {
    return Response.json({ error: "QR de hoja de campo invalido o incompatible" }, { status: 400 });
  }

  const emission = await prisma.emisionHojaCampo.findUnique({
    where: { tokenQrHash: hashFieldSheetQrToken(parsed.token) },
    select: {
      numeroControl: true,
      revision: true,
      estado: true,
      emitidaEn: true,
      plantillaCodigo: true,
      plantillaVersion: true,
    },
  });

  if (!emission) {
    return Response.json({ error: "Hoja de campo no encontrada" }, { status: 404 });
  }

  return Response.json({
    numeroControl: emission.numeroControl,
    revision: emission.revision,
    estado: emission.estado,
    emitidaEn: emission.emitidaEn,
    plantilla: {
      codigo: emission.plantillaCodigo,
      version: emission.plantillaVersion,
    },
    compatibilidad: {
      compatible: true,
      versionQr: parsed.version,
    },
  });
}

