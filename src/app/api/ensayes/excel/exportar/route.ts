import { NextRequest, NextResponse } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";
import {
  exportCorporateExcelForSample,
  generateCorporateExcelWorkbook,
  CorporateExcelDataset,
} from "@/lib/excel/compression";

export async function GET(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  const url = new URL(request.url);
  const muestraId = url.searchParams.get("muestraId");

  if (!muestraId) {
    return NextResponse.json({ error: "Parámetro 'muestraId' requerido en la URL." }, { status: 400 });
  }

  try {
    const buffer = await exportCorporateExcelForSample(muestraId);
    const filename = `Informe_Ensayes_fc_${muestraId}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  try {
    const body = (await parseJson(request)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object" || !Array.isArray(body.especimenes)) {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido. Se requiere dataset de tipo CorporateExcelDataset." }, { status: 400 });
    }

    const dataset = body as unknown as CorporateExcelDataset;
    const buffer = await generateCorporateExcelWorkbook(dataset);
    const filename = `Informe_Ensayes_fc_${dataset.folio || "export"}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

