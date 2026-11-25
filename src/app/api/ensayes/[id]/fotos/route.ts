import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { saveLocalDocument } from "@/lib/storage/local-files";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo, TipoFotoEnsaye } from "@prisma/client";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  const { id } = await context.params;

  try {
    const fotos = await prisma.fotoEnsayeCompresion.findMany({
      where: { ensayeId: id },
      include: { subidoPor: { select: { id: true, nombre: true } } },
      orderBy: { creadoEn: "desc" },
    });

    return NextResponse.json(fotos);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  const { id: ensayeId } = await context.params;

  try {
    const ensaye = await prisma.ensayeCompresion.findUnique({
      where: { id: ensayeId },
    });

    if (!ensaye) {
      return NextResponse.json({ error: "Ensaye de compresión no encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tipo = (formData.get("tipo") as TipoFotoEnsaye) || TipoFotoEnsaye.ROTURA_FRACTURA;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo de imagen" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Guardar en almacenamiento seguro local bajo categoría compression_photos
    const filename = file.name || `break_${Date.now()}.webp`;
    const saved = await saveLocalDocument("compression_photos", ensayeId, filename, buffer);

    const foto = await prisma.fotoEnsayeCompresion.create({
      data: {
        ensayeId,
        tipo,
        nombreArchivo: file.name || "captura_rotura.webp",
        nombreSeguro: saved.filename,
        mimeType: file.type || "image/webp",
        tamano: saved.size,
        hashSha256: saved.sha256,
        rutaRelativa: saved.relativePath,
        capturadaEn: new Date(),
        subidoPorId: operator.id,
      },
      include: {
        subidoPor: true,
      },
    });

    return NextResponse.json(foto, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

