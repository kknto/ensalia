import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { exportProfile } from "@/lib/config/service";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const bundle = await exportProfile(id);
    if (!bundle) return Response.json({ error: "El perfil no tiene una version publicada" }, { status: 404 });
    return new Response(JSON.stringify(bundle, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="perfil-${bundle.perfil.clave.toLowerCase()}.json"` } });
  } catch (error) { return errorResponse(error); }
}
