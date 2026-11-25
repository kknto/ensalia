import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";
import {
  generateCompressionReportPdfBySample,
  generateLabsicoReportPdfBySample,
  CompressionReportError,
} from "@/lib/pdf/compression-report";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  const { id } = await context.params;

  try {
    // Buscar si el ID corresponde a un EnsayeCompresion o directamente a una Muestra
    let muestraId: string | null = null;

    const ensaye = await prisma.ensayeCompresion.findUnique({
      where: { id },
      include: {
        especimen: {
          select: { muestraId: true },
        },
      },
    });

    if (ensaye) {
      muestraId = ensaye.especimen.muestraId;
    } else {
      // Intentar buscar como muestra
      const muestra = await prisma.muestra.findUnique({
        where: { id },
        select: { id: true },
      });
      if (muestra) {
        muestraId = muestra.id;
      }
    }

    if (!muestraId) {
      return NextResponse.json(
        { error: "Ensaye o muestra no encontrada con el identificador proporcionado." },
        { status: 404 }
      );
    }

    const formato = (request.nextUrl.searchParams.get("formato") || "labsico").toLowerCase();
    const draft = request.nextUrl.searchParams.get("draft") === "true";

    if (formato === "labsico" || formato === "oficial" || formato === "mc-lbs-cc-ie") {
      const { bytes, reportData } = await generateLabsicoReportPdfBySample(muestraId, {
        isPreliminary: draft,
      });

      const safeFilename = `Informe_LABSICO_${(reportData.cliente.reporte || "INFORME").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

      return new Response(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${safeFilename}"`,
          "Content-Length": String(bytes.byteLength),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    }

    const { bytes, reportData } = await generateCompressionReportPdfBySample(muestraId, {
      operadorNombre: operator.nombre,
      renderOptions: { isDraft: draft },
    });

    const safeFilename = `Certificado_Compresion_${reportData.folio.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    if (error instanceof CompressionReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return errorResponse(error);
  }
}

