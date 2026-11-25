import { NextRequest, NextResponse } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";
import {
  HardenedLegacyExcelIngestionEngine,
  reconcileAndPersistImportedBatch,
} from "@/lib/excel/compression";

export async function POST(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  const url = new URL(request.url);
  const persist = url.searchParams.get("persist") === "true";
  const forzar = url.searchParams.get("forzar") === "true";

  try {
    let fileBuffer: Buffer | null = null;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "Debe adjuntar un archivo Excel en el campo 'file'." }, { status: 400 });
      }
      const arrayBuffer = await (file as Blob).arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      const arrayBuffer = await request.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return NextResponse.json({ error: "El cuerpo de la petición no contiene datos binarios de Excel." }, { status: 400 });
      }
      fileBuffer = Buffer.from(arrayBuffer);
    }

    const engine = new HardenedLegacyExcelIngestionEngine();
    const { result } = await engine.parseWorkbook(fileBuffer);

    let reconciliation = null;
    if (persist && result.specimens.length > 0) {
      reconciliation = await reconcileAndPersistImportedBatch(result, operator.id, {
        forzarSobrescritura: forzar,
      });
    }

    return NextResponse.json({
      success: true,
      metadata: result.metadata,
      totalEspecimenes: result.specimens.length,
      especimenes: result.specimens,
      diagnosticos: result.diagnostics,
      hashMuestra: result.hashMuestra,
      reconciliation,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

