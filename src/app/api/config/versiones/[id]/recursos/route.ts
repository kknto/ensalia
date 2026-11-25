import { NextRequest } from "next/server";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ProfileResourceError, saveProfileLogo } from "@/lib/config/resources";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  const recursos = await prisma.recursoPerfil.findMany({ where: { versionPerfilId: id }, orderBy: { creadoEn: "desc" } });
  return Response.json({ recursos });
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const form = await request.formData();
    const file = form.get("archivo");
    if (!(file instanceof File)) return Response.json({ error: "Seleccione un archivo de imagen." }, { status: 400 });
    const resource = await saveProfileLogo(id, file, operator.id);
    return Response.json(resource, { status: 201 });
  } catch (error) {
    if (error instanceof ProfileResourceError) return Response.json({ error: error.message }, { status: error.status });
    return errorResponse(error);
  }
}
