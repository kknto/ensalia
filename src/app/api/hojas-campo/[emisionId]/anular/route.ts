import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { cancelFieldSheetSchema } from "@/lib/documents/schema";
import { cancelFieldSheet, FieldSheetError } from "@/lib/documents/service";
import { serialize } from "@/lib/serialize";

type Context = { params: Promise<{ emisionId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = cancelFieldSheetSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Indique un motivo valido.", details: parsed.error.flatten() }, { status: 400 });
  const { emisionId } = await context.params;
  try { return Response.json(serialize(await cancelFieldSheet(emisionId, operator, parsed.data.motivo))); }
  catch (error) { return error instanceof FieldSheetError ? Response.json({ error: error.message }, { status: error.status }) : errorResponse(error); }
}
