import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { saveLocalDocument, readLocalDocument, deleteLocalDocument } from "@/lib/storage/local-files";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";
import crypto from "crypto";

type Context = {
  params: Promise<{ id: string; mantenimientoId: string }>;
};

// GET: Descargar o visualizar documento de mantenimiento PDF con validación SHA-256
export async function GET(request: NextRequest, context: Context) {
  const licenseError = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (licenseError) return licenseError;

  const { mantenimientoId } = await context.params;

  try {
    const doc = await prisma.documentoMantenimiento.findFirst({
      where: { mantenimientoId },
      include: { mantenimiento: true },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento de mantenimiento no encontrado" }, { status: 404 });
    }

    const fileBuffer = await readLocalDocument(doc.rutaRelativa);
    if (!fileBuffer) {
      return NextResponse.json({ error: "El archivo físico no se encuentra en el almacenamiento local." }, { status: 404 });
    }

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

// POST: Adjuntar archivo PDF a mantenimiento
export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (licenseError) return licenseError;

  const { id: equipoId, mantenimientoId } = await context.params;

  try {
    const mantenimiento = await prisma.mantenimientoEquipo.findUnique({
      where: { id: mantenimientoId },
    });

    if (!mantenimiento || mantenimiento.equipoId !== equipoId) {
      return NextResponse.json({ error: "Mantenimiento no encontrado para este equipo" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo PDF" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const saved = await saveLocalDocument("calibrations", `maint_${equipoId}`, file.name, buffer);

    const doc = await prisma.documentoMantenimiento.create({
      data: {
        mantenimientoId,
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

// DELETE: Eliminar documento
export async function DELETE(request: NextRequest, context: Context) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (licenseError) return licenseError;

  const url = new URL(request.url);
  const docId = url.searchParams.get("docId");

  if (!docId) {
    return NextResponse.json({ error: "docId requerido" }, { status: 400 });
  }

  try {
    const doc = await prisma.documentoMantenimiento.findUnique({ where: { id: docId } });
    if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

    await deleteLocalDocument(doc.rutaRelativa);
    await prisma.documentoMantenimiento.delete({ where: { id: docId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
