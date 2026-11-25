import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { reprintFieldSheetSchema } from "@/lib/documents/schema";
import { FieldSheetError, reprintFieldSheet } from "@/lib/documents/service";

type Context = { params: Promise<{ emisionId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = reprintFieldSheetSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos de reimpresion invalidos.", details: parsed.error.flatten() }, { status: 400 });
  const { emisionId } = await context.params;
  try {
    const result = await reprintFieldSheet(emisionId, operator, parsed.data.copiaControlada, parsed.data.motivo);
    return new Response(Buffer.from(result.bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${result.filename}"`, "content-length": String(result.bytes.byteLength), "x-content-type-options": "nosniff" } });
  } catch (error) {
    return error instanceof FieldSheetError ? Response.json({ error: error.message }, { status: error.status }) : errorResponse(error);
  }
}
