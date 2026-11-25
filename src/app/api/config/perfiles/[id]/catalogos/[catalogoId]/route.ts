import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { catalogValueSchema } from "@/lib/config/schema";

type Context = { params: Promise<{ id: string; catalogoId: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = catalogValueSchema.partial().safeParse(await parseJson(request));
  if (!parsed.success || !Object.keys(parsed.data).length) return Response.json({ error: "Cambios de catalogo invalidos", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  const { id, catalogoId } = await context.params;
  try {
    const existing = await prisma.valorCatalogoPerfil.findFirst({ where: { id: catalogoId, perfilId: id } });
    if (!existing) return Response.json({ error: "Valor de catalogo no encontrado" }, { status: 404 });
    return Response.json(await prisma.valorCatalogoPerfil.update({ where: { id: catalogoId }, data: {
      ...(parsed.data.tipo ? { tipo: parsed.data.tipo.toUpperCase() } : {}), ...(parsed.data.clave ? { clave: parsed.data.clave.toUpperCase() } : {}),
      ...(parsed.data.nombre !== undefined ? { nombre: parsed.data.nombre } : {}), ...(parsed.data.orden !== undefined ? { orden: parsed.data.orden } : {}),
      ...(parsed.data.activo !== undefined ? { activo: parsed.data.activo } : {}), ...(parsed.data.metadata !== undefined ? { metadataJson: parsed.data.metadata as Prisma.InputJsonValue } : {}),
    } }));
  } catch (error) { return errorResponse(error); }
}
