import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { tipoEquipoSchema } from "@/lib/validation";
import { disabledModuleResponse } from "@/lib/config/modules";

export async function GET() {
  try { return Response.json(await prisma.tipoEquipo.findMany({ orderBy: { nombre: "asc" } })); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("inventario"); if (disabled) return disabled;
  const parsed = tipoEquipoSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  try { return Response.json(await prisma.tipoEquipo.create({ data: { ...parsed.data, codigo: parsed.data.codigo.toUpperCase() } }), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
