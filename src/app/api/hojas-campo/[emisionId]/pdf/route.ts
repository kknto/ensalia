import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { downloadFieldSheet, FieldSheetError } from "@/lib/documents/service";

type Context = { params: Promise<{ emisionId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { emisionId } = await context.params;
  try {
    const { emission, bytes } = await downloadFieldSheet(emisionId, operator);
    return new Response(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${emission.numeroControl}.pdf"`, "content-length": String(bytes.byteLength), "x-content-type-options": "nosniff" } });
  } catch (error) {
    return error instanceof FieldSheetError ? Response.json({ error: error.message }, { status: error.status }) : errorResponse(error);
  }
}
