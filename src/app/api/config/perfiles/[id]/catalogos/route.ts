import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { catalogValueSchema } from "@/lib/config/schema";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  const type = new URL(request.url).searchParams.get("tipo")?.trim().toUpperCase();
  try { return Response.json(await prisma.valorCatalogoPerfil.findMany({ where: { perfilId: id, ...(type ? { tipo: type } : {}) }, orderBy: [{ tipo: "asc" }, { orden: "asc" }, { nombre: "asc" }] })); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = catalogValueSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Valor de catalogo invalido", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try { return Response.json(await prisma.valorCatalogoPerfil.create({ data: { perfilId: id, tipo: parsed.data.tipo.toUpperCase(), clave: parsed.data.clave.toUpperCase(), nombre: parsed.data.nombre, orden: parsed.data.orden, activo: parsed.data.activo, metadataJson: parsed.data.metadata as Prisma.InputJsonValue | undefined } }), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
