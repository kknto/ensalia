import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo } from "@prisma/client";

export async function GET(request: NextRequest) {
  const licenseError = await requireModule(CodigoModulo.LOGISTICA_SALIDAS);
  if (licenseError) return licenseError;

  try {
    const now = new Date();

    // Muestras que aún no están cerradas ni anuladas y cuyo estatus de recolección está pendiente
    const muestras = await prisma.muestra.findMany({
      where: {
        estatusBitacora: { not: "ANULADA" },
        estatusRecoleccion: { in: ["PENDIENTE", "NO_RECOLECTADA"] },
      },
      include: {
        creador: { select: { id: true, nombre: true } },
        especimenes: true,
        asignacionesEquipo: {
          where: { estado: "ASIGNADA" },
          include: { equipo: { select: { id: true, codigoInterno: true, tipo: true } } },
        },
        itemsDespacho: {
          include: { despacho: { select: { id: true, folio: true, estado: true, fechaProgramada: true } } },
        },
      },
      orderBy: { fechaMuestreo: "asc" },
    });

    // Calcular delta de tiempo y semáforo normativo ASTM C31 / NMX-C-109 (<48 horas para inicio de curado húmedo)
    const result = muestras.map((m) => {
      const fechaMuestreo = new Date(m.fechaMuestreo);
      const horasTranscurridas = (now.getTime() - fechaMuestreo.getTime()) / (1000 * 60 * 60);

      let estadoCurado: "NORMAL" | "ADVERTENCIA" | "CRITICO" | "VENCIDO" = "NORMAL";
      if (horasTranscurridas > 48) {
        estadoCurado = "VENCIDO";
      } else if (horasTranscurridas >= 36) {
        estadoCurado = "CRITICO";
      } else if (horasTranscurridas >= 24) {
        estadoCurado = "ADVERTENCIA";
      }

      const enDespacho = m.itemsDespacho.some(
        (it) => it.despacho.estado === "PROGRAMADO" || it.despacho.estado === "EN_TRANSITO"
      );

      return {
        id: m.id,
        idMuestra: m.idMuestra,
        cliente: m.cliente,
        obra: m.obra,
        localizacion: m.localizacion,
        elemento: m.elemento,
        fechaMuestreo: m.fechaMuestreo,
        fcKgCm2: m.fcKgCm2,
        tipoConcreto: m.tipoConcreto,
        laboratoristaCampo: m.laboratoristaCampo,
        numeroEspecimenes: m.numeroEspecimenes || m.especimenes.length,
        moldesAsignados: m.asignacionesEquipo.map((a) => a.equipo.codigoInterno),
        horasTranscurridas: Math.round(horasTranscurridas * 10) / 10,
        estadoCurado,
        enDespacho,
        ultimoDespacho: m.itemsDespacho[0]?.despacho || null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

