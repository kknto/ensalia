import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { saveLocalDocument, readLocalDocument, deleteLocalDocument } from "@/lib/storage/local-files";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";
import crypto from "crypto";

type Context = {
  params: Promise<{ id: string; calibracionId: string }>;
};

// GET: Descargar o visualizar certificado PDF con validación de integridad SHA-256
export async function GET(request: NextRequest, context: Context) {
  const licenseError = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (licenseError) return licenseError;

  const { calibracionId } = await context.params;

  try {
    const doc = await prisma.documentoCalibracion.findUnique({
      where: { calibracionId },
      include: { calibracion: { include: { equipo: true } } },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento de calibración no encontrado" }, { status: 404 });
    }

    const fileBuffer = await readLocalDocument(doc.rutaRelativa);
    if (!fileBuffer) {
      return NextResponse.json({ error: "El archivo físico no se encuentra en el almacenamiento local." }, { status: 404 });
    }

    // Verificación forense de integridad SHA-256
    const calculatedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const esIntegro = calculatedHash.toLowerCase() === doc.hashSha256.toLowerCase();

    const headers = new Headers();
    headers.set("Content-Type", doc.mimeType || "application/pdf");
    headers.set("Content-Length", fileBuffer.length.toString());
    headers.set("X-Sha256-Original", doc.hashSha256);
    headers.set("X-Sha256-Calculated", calculatedHash);
    headers.set("X-Integrity-Verified", esIntegro ? "true" : "false");

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "true";
    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.nombreArchivo)}"`);
    } else {
      headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(doc.nombreArchivo)}"`);
    }

    return new NextResponse(new Uint8Array(fileBuffer), { status: 200, headers });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST: Cargar certificado PDF
export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (licenseError) return licenseError;

  const { id: equipoId, calibracionId } = await context.params;

  try {
    const calibracion = await prisma.calibracionEquipo.findUnique({
      where: { id: calibracionId },
    });

    if (!calibracion || calibracion.equipoId !== equipoId) {
      return NextResponse.json({ error: "Calibración no encontrada para este equipo" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo PDF" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "El archivo debe ser un documento PDF válido" }, { status: 400 });
    }

    const maxSizeBytes = 15 * 1024 * 1024; // 15 MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: "El archivo excede el límite permitido de 15 MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Guardar en el almacenamiento determinista local
    const saved = await saveLocalDocument("calibrations", equipoId, file.name, buffer);

    // Upsert registro en base de datos
    const doc = await prisma.documentoCalibracion.upsert({
      where: { calibracionId },
      update: {
        nombreArchivo: file.name,
        nombreSeguro: saved.filename,
        mimeType: "application/pdf",
        tamano: saved.size,
        hashSha256: saved.sha256,
        rutaRelativa: saved.relativePath,
        subidoPorId: operator.id,
      },
      create: {
        calibracionId,
        nombreArchivo: file.name,
        nombreSeguro: saved.filename,
        mimeType: "application/pdf",
        tamano: saved.size,
        hashSha256: saved.sha256,
        rutaRelativa: saved.relativePath,
        subidoPorId: operator.id,
      },
      include: {
        subidoPor: true,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE: Eliminar certificado PDF
export async function DELETE(request: NextRequest, context: Context) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (licenseError) return licenseError;

  const { calibracionId } = await context.params;

  try {
    const doc = await prisma.documentoCalibracion.findUnique({
      where: { calibracionId },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    await deleteLocalDocument(doc.rutaRelativa);
    await prisma.documentoCalibracion.delete({ where: { calibracionId } });

    return NextResponse.json({ ok: true, mensaje: "Certificado eliminado correctamente." });
  } catch (error) {
    return errorResponse(error);
  }
}
