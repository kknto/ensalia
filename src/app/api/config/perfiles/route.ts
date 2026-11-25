import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { createProfileSchema } from "@/lib/config/schema";
import { createProfile, ensureDefaultProfile } from "@/lib/config/service";

export async function GET(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  try {
    await ensureDefaultProfile(operator);
    return Response.json(await prisma.perfilCliente.findMany({ include: { versionPublicada: true, versiones: { orderBy: { numeroVersion: "desc" } } }, orderBy: { nombreInterno: "asc" } }));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = createProfileSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
  try { return Response.json(await createProfile(parsed.data, operator), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
