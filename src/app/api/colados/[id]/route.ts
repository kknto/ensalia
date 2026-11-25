import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { coladoPatchSchema } from "@/lib/validation";
import { coladoInclude } from "@/lib/colados";

type Context = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, context: Context) {
  const { id } = await context.params;
  try { const row = await prisma.colado.findUnique({ where: { id }, include: coladoInclude }); return row ? Response.json(row) : Response.json({ error: "Colado no encontrado" }, { status: 404 }); }
  catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const parsed = coladoPatchSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params; const { version, fechaColado, ...changes } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.colado.findUnique({ where: { id }, include: { _count: { select: { muestras: true } } } });
      if (!current) return { status: 404 as const, error: "Colado no encontrado" };
      if (current.estado !== "ABIERTO") return { status: 409 as const, error: "Sólo puede editarse un colado abierto." };
      if (changes.numeroTomas != null && changes.numeroTomas < current._count.muestras) return { status: 409 as const, error: "El número de tomas no puede ser menor que las muestras existentes." };
      const changed = await tx.colado.updateMany({ where: { id, version, estado: "ABIERTO" }, data: { ...changes, ...(fechaColado ? { fechaColado: new Date(fechaColado) } : {}), version: { increment: 1 } } });
      if (changed.count !== 1) return { status: 409 as const, error: "El colado cambió. Recargue e intente nuevamente." };
      await tx.auditoria.create({ data: { coladoId: id, operadorId: operator.id, accion: "COLADO_EDITADO", estadoAntes: "ABIERTO", estadoDespues: "ABIERTO", cambiosJson: { campos: Object.keys({ ...changes, ...(fechaColado ? { fechaColado } : {}) }), versionAnterior: version } } });
      return { status: 200 as const, row: await tx.colado.findUniqueOrThrow({ where: { id }, include: coladoInclude }) };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.row);
  } catch (error) { return errorResponse(error); }
}
