import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { tipoEquipoSchema } from "@/lib/validation";
import { disabledModuleResponse } from "@/lib/config/modules";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("inventario"); if (disabled) return disabled;
  const parsed = tipoEquipoSchema.partial().safeParse(await parseJson(request));
  if (!parsed.success || !Object.keys(parsed.data).length) return Response.json({ error: "Datos inválidos", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const row = await prisma.tipoEquipo.update({ where: { id }, data: { ...parsed.data, ...(parsed.data.codigo ? { codigo: parsed.data.codigo.toUpperCase() } : {}) } });
    return Response.json(row);
  } catch (error) { return errorResponse(error); }
}
