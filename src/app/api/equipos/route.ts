import { EstadoEquipo, Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { equipoSchema } from "@/lib/validation";
import { disabledModuleResponse } from "@/lib/config/modules";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().slice(0, 200);
  const tipoId = searchParams.get("tipoId") || undefined;
  const rawEstado = searchParams.get("estado");
  const estado = rawEstado && Object.values(EstadoEquipo).includes(rawEstado as EstadoEquipo) ? rawEstado as EstadoEquipo : undefined;
  if (rawEstado && !estado) return Response.json({ error: "Estado no válido" }, { status: 400 });
  const where: Prisma.EquipoWhereInput = { ...(tipoId ? { tipoId } : {}), ...(estado ? { estado } : {}), ...(q ? { OR: [{ numeroSerie: { contains: q } }, { codigoInterno: { contains: q } }, { marca: { contains: q } }, { modelo: { contains: q } }] } : {}) };
  try { return Response.json(await prisma.equipo.findMany({ where, include: { tipo: true }, orderBy: [{ tipo: { nombre: "asc" } }, { codigoInterno: "asc" }] })); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request); if (!operator) return unauthorized();
  const disabled = await disabledModuleResponse("inventario"); if (disabled) return disabled;
  const parsed = equipoSchema.safeParse(await parseJson(request));
  if (!parsed.success) return Response.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  try {
    const row = await prisma.$transaction(async (tx) => {
      const tipo = await tx.tipoEquipo.findFirst({ where: { id: parsed.data.tipoId, activo: true } });
      if (!tipo) throw new Error("TIPO_NO_DISPONIBLE");
      if (tipo.requiereSerie && !parsed.data.numeroSerie) throw new Error("SERIE_REQUERIDA");
      const codigos = await tx.equipo.findMany({ select: { codigoInterno: true } });
      if (codigos.some((item) => item.codigoInterno.trim().toUpperCase() === parsed.data.codigoInterno)) throw new Error("CODIGO_DUPLICADO");
      const equipo = await tx.equipo.create({ data: parsed.data, include: { tipo: true } });
      await tx.movimientoEquipo.create({ data: { equipoId: equipo.id, operadorId: operator.id, tipo: "ALTA", estadoDespues: "DISPONIBLE", detalleJson: { codigoInterno: equipo.codigoInterno, numeroSerie: equipo.numeroSerie, tipo: tipo.codigo } } });
      return equipo;
    });
    return Response.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "TIPO_NO_DISPONIBLE") return Response.json({ error: "El tipo de equipo no existe o está inactivo." }, { status: 409 });
    if (error instanceof Error && error.message === "SERIE_REQUERIDA") return Response.json({ error: "Este tipo de equipo requiere serie del fabricante." }, { status: 400 });
    if (error instanceof Error && error.message === "CODIGO_DUPLICADO") return Response.json({ error: "El codigo interno ya existe en Inventario." }, { status: 409 });
    return errorResponse(error);
  }
}
