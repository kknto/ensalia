import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

const filterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  estado: z.enum(["BORRADOR", "REVISADA", "CERRADA", "ANULADA"]).optional(),
  recoleccion: z.enum(["PENDIENTE", "RECOLECTADA", "NO_RECOLECTADA"]).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export function parseJson(request: NextRequest): Promise<unknown | null> {
  return request.json().catch(() => null);
}

export function sampleFilters(url: URL): Prisma.MuestraWhereInput | { error: string } {
  const raw = Object.fromEntries(["q", "estado", "recoleccion", "desde", "hasta"].flatMap((key) => {
    const value = url.searchParams.get(key);
    return value ? [[key, value]] : [];
  }));
  const parsed = filterSchema.safeParse(raw);
  if (!parsed.success) return { error: "Filtros no válidos" };
  const { q, estado, recoleccion, desde, hasta } = parsed.data;
  if (desde && hasta && desde > hasta) return { error: "La fecha inicial no puede ser posterior a la fecha final" };
  return {
    ...(q ? { OR: ["cliente", "obra", "noMuestra", "remision", "ubicacion"].map((field) => ({ [field]: { contains: q } })) } : {}),
    ...(estado ? { estatusBitacora: estado } : {}),
    ...(recoleccion ? { estatusRecoleccion: recoleccion } : {}),
    ...((desde || hasta) ? { fechaMuestreo: {
      ...(desde ? { gte: new Date(`${desde}T00:00:00-05:00`) } : {}),
      ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999-05:00`) } : {}),
    } } : {}),
  };
}

export function errorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return Response.json({ error: "Ya existe un registro con esos datos." }, { status: 409 });
  }
  console.error(error);
  return Response.json({ error: "No fue posible completar la operación." }, { status: 500 });
}
