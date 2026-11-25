import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo, EstadoDespacho, EstadoItemDespacho } from "@prisma/client";
import { z } from "zod";

type Context = {
  params: Promise<{ id: string }>;
};

const updateDespachoSchema = z.object({
  estado: z.nativeEnum(EstadoDespacho).optional(),
  vehiculo: z.string().optional().nullable(),
  placas: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        itemId: z.string(),
        estadoItem: z.nativeEnum(EstadoItemDespacho),
        tempRecoleccionC: z.number().optional().nullable(),
        condicionEspecimen: z.string().optional().nullable(),
        observaciones: z.string().optional().nullable(),
      })
    )
    .optional(),
});

export async function GET(request: NextRequest, context: Context) {
  const licenseError = await requireModule(CodigoModulo.LOGISTICA_SALIDAS);
  if (licenseError) return licenseError;

  const { id } = await context.params;

  try {
    const despacho = await prisma.despachoMuestra.findUnique({
      where: { id },
      include: {
        choferOperador: true,
        items: {
          include: {
            muestra: {
              include: {
                especimenes: true,
                asignacionesEquipo: {
                  where: { estado: "ASIGNADA" },
                  include: { equipo: true },
                },
              },
            },
          },
        },
      },
    });

    if (!despacho) {
      return NextResponse.json({ error: "Manifiesto de despacho no encontrado" }, { status: 404 });
    }

    return NextResponse.json(despacho);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.LOGISTICA_SALIDAS);
  if (licenseError) return licenseError;

  const { id } = await context.params;

  try {
    const body = await parseJson(request);
    const parsed = updateDespachoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de actualización inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { estado, vehiculo, placas, observaciones, items } = parsed.data;

    const current = await prisma.despachoMuestra.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};

      if (vehiculo !== undefined) updateData.vehiculo = vehiculo;
      if (placas !== undefined) updateData.placas = placas;
      if (observaciones !== undefined) updateData.observaciones = observaciones;

      if (estado && estado !== current.estado) {
        updateData.estado = estado;
        if (estado === "EN_TRANSITO" && !current.fechaSalida) {
          updateData.fechaSalida = new Date();
        } else if (estado === "COMPLETADO" && !current.fechaRetorno) {
          updateData.fechaRetorno = new Date();

          // Si el despacho se completa, actualizar el estatus de recolección de las muestras
          for (const item of current.items) {
            await tx.muestra.update({
              where: { id: item.muestraId },
              data: {
                estatusRecoleccion: "RECOLECTADA",
              },
            });
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        await tx.despachoMuestra.update({
          where: { id },
          data: updateData,
        });
      }

      // Actualizar items individuales si vienen en el payload
      if (items && items.length > 0) {
        for (const it of items) {
          await tx.itemDespachoMuestra.update({
            where: { id: it.itemId },
            data: {
              estadoItem: it.estadoItem,
              tempRecoleccionC: it.tempRecoleccionC != null ? it.tempRecoleccionC : null,
              condicionEspecimen: it.condicionEspecimen || null,
              observaciones: it.observaciones || null,
              horaRecoleccion: it.estadoItem === "RECOLECTADO" ? new Date() : undefined,
            },
          });
        }
      }

      return await tx.despachoMuestra.findUniqueOrThrow({
        where: { id },
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

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

