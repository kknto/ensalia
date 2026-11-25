import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const profile = await prisma.perfilCliente.findUnique({ where: { id }, include: {
      versionPublicada: true, versiones: { include: { recursos: true }, orderBy: { numeroVersion: "desc" } },
      publicaciones: { orderBy: { creadoEn: "desc" }, take: 100 },
      valoresCatalogo: { orderBy: [{ tipo: "asc" }, { orden: "asc" }, { nombre: "asc" }] },
    } });
    return profile ? Response.json(profile) : Response.json({ error: "Perfil no encontrado" }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}
