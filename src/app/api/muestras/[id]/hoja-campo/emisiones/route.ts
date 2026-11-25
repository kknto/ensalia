import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { parseJson, errorResponse } from "@/lib/api";
import { issueFieldSheetSchema } from "@/lib/documents/schema";
import { FieldSheetError, issueFieldSheet, listFieldSheets } from "@/lib/documents/service";
import { serialize } from "@/lib/serialize";

type Context = { params: Promise<{ id: string }> };

function documentError(error: unknown) {
  return error instanceof FieldSheetError ? Response.json({ error: error.message }, { status: error.status }) : errorResponse(error);
}

export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try { return Response.json(serialize(await listFieldSheets(id))); } catch (error) { return documentError(error); }
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = issueFieldSheetSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos de emision invalidos.", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try { return Response.json(serialize(await issueFieldSheet(id, parsed.data.versionMuestra, operator, parsed.data.motivoSustitucion)), { status: 201 }); }
  catch (error) { return documentError(error); }
}
