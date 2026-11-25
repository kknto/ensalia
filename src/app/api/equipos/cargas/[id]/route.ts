import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const { id } = await context.params;
  try {
    const row = await prisma.cargaInventario.findUnique({ where: { id }, include: { tipo: true, operador: true, equipos: { orderBy: { codigoInterno: "asc" } } } });
    return row ? Response.json(row) : Response.json({ error: "Carga no encontrada." }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}
