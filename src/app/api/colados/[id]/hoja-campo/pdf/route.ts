import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { downloadPourFieldSheetPackage, FieldSheetError } from "@/lib/documents/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const result = await downloadPourFieldSheetPackage(id, operator);
    return new Response(Buffer.from(result.bytes), { headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${result.filename.replace(/[^A-Za-z0-9_.-]/g, "_")}"`,
      "content-length": String(result.bytes.byteLength),
      "x-document-sha256": result.sha256,
      "x-content-type-options": "nosniff",
    } });
  } catch (error) {
    return error instanceof FieldSheetError ? Response.json({ error: error.message }, { status: error.status }) : errorResponse(error);
  }
}
