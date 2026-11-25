import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, context: Context) {
  const { id } = await context.params;
  try { return Response.json(await prisma.movimientoEquipo.findMany({ where: { equipoId: id }, include: { operador: true, muestra: { select: { id: true, idMuestra: true } } }, orderBy: { creadoEn: "desc" } })); }
  catch (error) { return errorResponse(error); }
}
