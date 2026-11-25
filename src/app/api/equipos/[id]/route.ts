import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { equipoPatchSchema } from "@/lib/validation";
import { disabledModuleResponse } from "@/lib/config/modules";

type Context = { params: Promise<{ id: string }> };
export async function GET(_: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const row = await prisma.equipo.findUnique({
      where: { id },
      include: {
        tipo: true,
        asignaciones: {
          orderBy: { asignadoEn: "desc" },
          include: { muestra: { select: { id: true, idMuestra: true } }, especimen: true },
        },
        calibraciones: {
          orderBy: { fechaCalibracion: "desc" },
          include: { documento: true, registradoPor: true },
        },
        mantenimientos: {
          orderBy: { fechaProgramada: "desc" },
          include: { documentos: true, registradoPor: true },
        },
      },
    });
    return row ? Response.json(row) : Response.json({ error: "Equipo no encontrado" }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest, context: Context) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("inventario"); if (disabled) return disabled;
  const parsed = equipoPatchSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params; const { version, ...data } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.equipo.findUnique({ where: { id }, include: { tipo: true } });
      if (!current) return { status: 404 as const, error: "Equipo no encontrado" };
      if (current.estado === "ASIGNADO") return { status: 409 as const, error: "No se puede editar un equipo mientras está asignado." };
      const targetType = data.tipoId
        ? await tx.tipoEquipo.findFirst({ where: { id: data.tipoId, activo: true } })
        : current.tipo;
      if (!targetType) return { status: 409 as const, error: "El tipo de equipo no existe o está inactivo." };
      const targetSerial = data.numeroSerie !== undefined ? data.numeroSerie : current.numeroSerie;
      if (targetType.requiereSerie && !targetSerial) return { status: 400 as const, error: "Este tipo de equipo requiere serie del fabricante." };
      if (data.codigoInterno) {
        const codigos = await tx.equipo.findMany({ where: { id: { not: id } }, select: { codigoInterno: true } });
        if (codigos.some((item) => item.codigoInterno.trim().toUpperCase() === data.codigoInterno)) return { status: 409 as const, error: "El código interno ya existe en Inventario." };
      }
      const changed = await tx.equipo.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
      if (changed.count !== 1) return { status: 409 as const, error: "El equipo cambió. Recargue e intente nuevamente." };
      await tx.movimientoEquipo.create({ data: { equipoId: id, operadorId: operator.id, tipo: "AJUSTE", estadoAntes: current.estado, estadoDespues: current.estado, detalleJson: { versionAnterior: version, campos: Object.keys(data) } } });
      return { status: 200 as const, row: await tx.equipo.findUniqueOrThrow({ where: { id }, include: { tipo: true } }) };
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.row);
  } catch (error) { return errorResponse(error); }
}
