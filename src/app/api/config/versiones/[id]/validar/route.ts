import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { validateProfileVersion } from "@/lib/config/service";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const result = await validateProfileVersion(id, operator);
    if (!result) return Response.json({ error: "Version no encontrada" }, { status: 404 });
    return Response.json(result, { status: result.valid ? 200 : 400 });
  } catch (error) { return errorResponse(error); }
}
