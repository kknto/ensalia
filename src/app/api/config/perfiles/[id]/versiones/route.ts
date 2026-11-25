import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { createVersionSchema } from "@/lib/config/schema";
import { createProfileVersion } from "@/lib/config/service";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = createVersionSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Configuracion invalida", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try { return Response.json(await createProfileVersion(id, parsed.data.configuracion, operator, parsed.data.basadaEnId, parsed.data.notas), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
