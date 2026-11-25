import { NextRequest, NextResponse } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";
import {
  generateCompressionReportPdfBySample,
  generateLabsicoReportPdfBySample,
  renderCompressionReportPdf,
  renderLabsicoReportPdf,
  CompressionReportError,
} from "@/lib/pdf/compression-report";

export async function GET(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  const url = new URL(request.url);
  const muestraId = url.searchParams.get("muestraId");
  const draft = url.searchParams.get("draft") === "true";
  const formato = (url.searchParams.get("formato") || "labsico").toLowerCase();

  if (!muestraId) {
    return NextResponse.json(
      { error: "Parámetro 'muestraId' requerido en la URL." },
      { status: 400 }
    );
  }

  try {
    if (formato === "labsico" || formato === "oficial" || formato === "mc-lbs-cc-ie") {
      const { bytes, reportData } = await generateLabsicoReportPdfBySample(muestraId, {
        isPreliminary: draft,
      });

      const safeFilename = `Informe_LABSICO_${(reportData.cliente?.reporte || "INFORME").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

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

export async function POST(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  try {
    const body = await parseJson(request);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
    }

    const { reportData, options, formato } = body as { reportData: any; options?: any; formato?: string };

    if (formato === "labsico" || (reportData && (reportData.header || reportData.cliente))) {
      const bytes = await renderLabsicoReportPdf(reportData, options);
      const safeFilename = `Informe_LABSICO_${(reportData.cliente?.reporte || reportData.header?.sistemaFolio || "INFORME").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

      return new Response(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${safeFilename}"`,
          "Content-Length": String(bytes.byteLength),
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (!reportData || !reportData.folio || !Array.isArray(reportData.especimenes)) {
      return NextResponse.json(
        { error: "Estructura de CompressionReportData requerida en el cuerpo." },
        { status: 400 }
      );
    }

    // Asegurar que las fechas sean objetos Date
    reportData.fechaEmision = new Date(reportData.fechaEmision || Date.now());
    if (reportData.muestreo?.fechaHoraMuestreo) {
      reportData.muestreo.fechaHoraMuestreo = new Date(reportData.muestreo.fechaHoraMuestreo);
    }
    for (const esp of reportData.especimenes) {
      if (esp.fechaColado) esp.fechaColado = new Date(esp.fechaColado);
      if (esp.fechaEnsaye) esp.fechaEnsaye = new Date(esp.fechaEnsaye);
    }

    const bytes = await renderCompressionReportPdf(reportData, options);
    const safeFilename = `Certificado_Compresion_${reportData.folio.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

