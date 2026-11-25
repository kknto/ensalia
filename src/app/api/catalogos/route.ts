import { NextRequest } from "next/server";
import { TipoCatalogo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { serialize } from "@/lib/serialize";
import { errorResponse, parseJson } from "@/lib/api";
import { z } from "zod";

const catalogSchema = z.object({ tipo: z.nativeEnum(TipoCatalogo), nombre: z.string().trim().min(1).max(200) });

export async function GET() {
  const rows = await prisma.catalogo.findMany({ where: { activo: true }, orderBy: [{ tipo: "asc" }, { nombre: "asc" }] });
  const operadores = await prisma.operador.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } });
  const profile = await prisma.perfilCliente.findFirst({ where: { activo: true, versionPublicadaId: { not: null } } });
  const catalogosPerfil = profile ? await prisma.valorCatalogoPerfil.findMany({ where: { perfilId: profile.id, activo: true }, orderBy: [{ tipo: "asc" }, { orden: "asc" }, { nombre: "asc" }] }) : [];
  return Response.json(serialize({ catalogos: rows, catalogosPerfil, operadores }));
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();
  const parsed = catalogSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Tipo y nombre son obligatorios", details: parsed.error.flatten() }, { status: 400 });
  try {
    const row = await prisma.catalogo.create({ data: parsed.data });
    return Response.json(serialize(row), { status: 201 });
  } catch (error) { return errorResponse(error); }
}
