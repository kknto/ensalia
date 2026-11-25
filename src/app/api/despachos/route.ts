import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo, EstadoDespacho, TipoDespacho } from "@prisma/client";
import { z } from "zod";

const createDespachoSchema = z.object({
  tipo: z.nativeEnum(TipoDespacho).default(TipoDespacho.RECOLECCION_OBRA),
  fechaProgramada: z.string().min(1),
  choferOperadorId: z.string().optional().nullable(),
  choferNombre: z.string().trim().min(1).optional().nullable(),
  vehiculo: z.string().optional().nullable(),
  placas: z.string().optional().nullable(),
  origen: z.string().optional().nullable(),
  destino: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  muestrasIds: z.array(z.string()).min(1, "Debe seleccionar al menos una muestra para el despacho"),
}).refine((data) => Boolean(data.choferOperadorId || data.choferNombre), {
  message: "Debe seleccionar o indicar el nombre del chofer u operador.",
  path: ["choferOperadorId"],
});

export async function GET(request: NextRequest) {
  const licenseError = await requireModule(CodigoModulo.LOGISTICA_SALIDAS);
  if (licenseError) return licenseError;

  const url = new URL(request.url);
  const estadoParam = url.searchParams.get("estado") as EstadoDespacho | null;

  try {
    const whereClause = estadoParam ? { estado: estadoParam } : {};

    const despachos = await prisma.despachoMuestra.findMany({
      where: whereClause,
      include: {
        choferOperador: { select: { id: true, nombre: true } },
        items: {
          include: {
            muestra: {
              select: {
                id: true,
                idMuestra: true,
                cliente: true,
                obra: true,
                fechaMuestreo: true,
                numeroEspecimenes: true,
              },
            },
          },
        },
      },
      orderBy: { fechaProgramada: "desc" },
    });

    return NextResponse.json(despachos);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.LOGISTICA_SALIDAS);
  if (licenseError) return licenseError;

  try {
    const body = await parseJson(request);
    const parsed = createDespachoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de manifiesto de despacho inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      tipo,
      fechaProgramada,
      choferOperadorId,
      choferNombre,
      vehiculo,
      placas,
      origen,
      destino,
      observaciones,
      muestrasIds,
    } = parsed.data;

    // Generar folio único tipo DESP-YYYYMMDD-XXXX
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const folio = `DESP-${datePrefix}-${randomSuffix}`;

    const created = await prisma.$transaction(async (tx) => {
      let resolvedOperadorId = choferOperadorId;
      if (!resolvedOperadorId && choferNombre) {
        const op = await tx.operador.upsert({
          where: { nombre: choferNombre },
          update: { activo: true },
          create: { nombre: choferNombre, activo: true },
        });
        resolvedOperadorId = op.id;
      } else if (resolvedOperadorId) {
        // Verificar si es un ID existente o un nombre pasado como ID
        const existing = await tx.operador.findUnique({ where: { id: resolvedOperadorId } });
        if (!existing) {
          const op = await tx.operador.upsert({
            where: { nombre: resolvedOperadorId },
            update: { activo: true },
            create: { nombre: resolvedOperadorId, activo: true },
          });
          resolvedOperadorId = op.id;
        }
      }

      if (!resolvedOperadorId) {
        throw new Error("No se pudo asignar el chofer u operador.");
      }

      const despacho = await tx.despachoMuestra.create({
        data: {
          folio,
          tipo,
          estado: EstadoDespacho.PROGRAMADO,
          fechaProgramada: new Date(fechaProgramada),
          choferOperadorId: resolvedOperadorId,
          vehiculo: vehiculo || null,
          placas: placas || null,
          origen: origen || "Laboratorio Central",
          destino: destino || "Obra / Planta",
          observaciones: observaciones || null,
        },
      });

      // Crear items para cada muestra seleccionada
      for (const muestraId of muestrasIds) {
        await tx.itemDespachoMuestra.create({
          data: {
            despachoId: despacho.id,
            muestraId,
            estadoItem: "PENDIENTE",
          },
        });
      }

      return await tx.despachoMuestra.findUniqueOrThrow({
        where: { id: despacho.id },
        include: {
          choferOperador: true,
          items: {
            include: {
              muestra: true,
            },
          },
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

