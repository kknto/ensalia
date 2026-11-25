import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { importProfile } from "@/lib/config/service";

export async function POST(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  try { return Response.json(await importProfile(await parseJson(request), operator), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
