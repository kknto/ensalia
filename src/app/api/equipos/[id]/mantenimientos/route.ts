import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo, EstadoMantenimiento, TipoMantenimiento } from "@prisma/client";
import { z } from "zod";

type Context = {
  params: Promise<{ id: string }>;
};

const mantenimientoSchema = z.object({
  tipo: z.nativeEnum(TipoMantenimiento).default(TipoMantenimiento.PREVENTIVO),
  estado: z.nativeEnum(EstadoMantenimiento).default(EstadoMantenimiento.PROGRAMADO),
  fechaProgramada: z.string().min(1),
  fechaRealizada: z.string().optional().nullable(),
  proximoMantenimiento: z.string().optional().nullable(),
  proveedor: z.string().optional().nullable(),
  costo: z.number().optional().nullable(),
  descripcion: z.string().min(3),
  tareasRealizadas: z.string().optional().nullable(),
  piezasReemplazadas: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, context: Context) {
  const licenseError = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (licenseError) return licenseError;

  const { id } = await context.params;

  try {
    const records = await prisma.mantenimientoEquipo.findMany({
      where: { equipoId: id },
      include: {
        registradoPor: true,
        documentos: true,
      },
      orderBy: { fechaProgramada: "desc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CALIBRACION_MANTENIMIENTO);
  if (licenseError) return licenseError;

  const { id: equipoId } = await context.params;

  try {
    const body = await parseJson(request);
    const parsed = mantenimientoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de mantenimiento inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const equipo = await prisma.equipo.findUnique({ where: { id: equipoId } });
    if (!equipo) {
      return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }

    const {
      tipo,
      estado,
      fechaProgramada,
      fechaRealizada,
      proximoMantenimiento,
      proveedor,
      costo,
      descripcion,
      tareasRealizadas,
      piezasReemplazadas,
    } = parsed.data;

    const maintenance = await prisma.$transaction(async (tx) => {
      const created = await tx.mantenimientoEquipo.create({
        data: {
          equipoId,
          tipo,
          estado,
          fechaProgramada: new Date(fechaProgramada),
          fechaRealizada: fechaRealizada ? new Date(fechaRealizada) : null,
          proximoMantenimiento: proximoMantenimiento ? new Date(proximoMantenimiento) : null,
          proveedor: proveedor || null,
          costo: costo != null ? costo : null,
          descripcion,
          tareasRealizadas: tareasRealizadas || null,
          piezasReemplazadas: piezasReemplazadas || null,
          registradoPorId: operator.id,
        },
        include: {
          registradoPor: true,
          documentos: true,
        },
      });

      // Si el mantenimiento concluye o se actualiza la próxima fecha
      if (proximoMantenimiento) {
        await tx.equipo.update({
          where: { id: equipoId },
          data: {
            mantenimientoVigenteHasta: new Date(proximoMantenimiento),
            version: { increment: 1 },
          },
        });
      }

      // Registrar en bitácora de movimientos de equipo
      await tx.movimientoEquipo.create({
        data: {
          equipoId,
          operadorId: operator.id,
          tipo: "MANTENIMIENTO",
          estadoAntes: equipo.estado,
          estadoDespues: estado === "EN_PROCESO" ? "MANTENIMIENTO" : equipo.estado,
          detalleJson: {
            mantenimientoId: created.id,
            tipo: created.tipo,
            estado: created.estado,
            descripcion: created.descripcion,
          },
        },
      });

      return created;
    });

    return NextResponse.json(maintenance, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

