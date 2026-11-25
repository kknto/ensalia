import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { readLocalDocument } from "@/lib/storage/local-files";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";

type Context = {
  params: Promise<{ fotoId: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  const { fotoId } = await context.params;

  try {
    const foto = await prisma.fotoEnsayeCompresion.findUnique({
      where: { id: fotoId },
    });

    if (!foto) {
      return NextResponse.json({ error: "Fotografía no encontrada" }, { status: 404 });
    }

    const fileBuffer = await readLocalDocument(foto.rutaRelativa);
    if (!fileBuffer) {
      return NextResponse.json({ error: "Archivo físico no encontrado en disco local." }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", foto.mimeType || "image/webp");
    headers.set("Content-Length", fileBuffer.length.toString());
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Sha256", foto.hashSha256);

    return new NextResponse(new Uint8Array(fileBuffer), { status: 200, headers });
  } catch (error) {
    return errorResponse(error);
  }
}
