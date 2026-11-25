import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOperator, unauthorized } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api";
import { requireModule } from "@/lib/licensing/guard";
import { CodigoModulo, CondicionHumedad, TipoFallaConcreto } from "@prisma/client";
import { z } from "zod";

const createEnsayeSchema = z.object({
  especimenId: z.string().min(1),
  equipoPrensaId: z.string().optional().nullable(),
  fechaHoraEnsaye: z.string().min(1),
  edadRealDias: z.number().int().min(1),
  diametroMm: z.number().positive(),
  longitudMm: z.number().positive(),
  masaG: z.number().positive().optional().nullable(),
  cargaMaximaKn: z.number().positive().optional(),
  cargaMaximaKg: z.number().positive().optional(),
  tipoFalla: z.nativeEnum(TipoFallaConcreto).default(TipoFallaConcreto.CONO_TIPO_1),
  condicionHumedad: z.nativeEnum(CondicionHumedad).default(CondicionHumedad.HUMEDO_SATURADO),
  observaciones: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  const url = new URL(request.url);
  const cliente = url.searchParams.get("cliente");
  const obra = url.searchParams.get("obra");
  const edadDias = url.searchParams.get("edadDias");

  try {
    const where: Record<string, unknown> = {};
    if (cliente) where.especimen = { muestra: { cliente: { contains: cliente } } };
    if (obra) where.especimen = { ...(where.especimen as object || {}), muestra: { obra: { contains: obra } } };
    if (edadDias) where.edadRealDias = parseInt(edadDias, 10);

    const ensayes = await prisma.ensayeCompresion.findMany({
      where,
      include: {
        especimen: {
          include: {
            muestra: {
              select: {
                id: true,
                idMuestra: true,
                cliente: true,
                obra: true,
                fcKgCm2: true,
                tipoConcreto: true,
                fechaMuestreo: true,
              },
            },
          },
        },
        equipoPrensa: { select: { id: true, codigoInterno: true } },
        operadorEnsaye: { select: { id: true, nombre: true } },
        fotos: true,
      },
      orderBy: { fechaHoraEnsaye: "desc" },
    });

    // Calcular estadísticas ACI 214R / Gauss si hay registros
    const resistencias = ensayes.map((e) => Number(e.resistenciaKgCm2)).filter((r) => !isNaN(r) && r > 0);
    const n = resistencias.length;

    let media = 0;
    let desviacionEstandar = 0;
    let coefVariacion = 0;
    let min = 0;
    let max = 0;

    if (n > 0) {
      media = resistencias.reduce((acc, val) => acc + val, 0) / n;
      min = Math.min(...resistencias);
      max = Math.max(...resistencias);

      if (n > 1) {
        const sumaCuadrados = resistencias.reduce((acc, val) => acc + Math.pow(val - media, 2), 0);
        desviacionEstandar = Math.sqrt(sumaCuadrados / (n - 1));
        coefVariacion = media > 0 ? (desviacionEstandar / media) * 100 : 0;
      }
    }

    // Clasificación de control según ACI 214R (en kg/cm²):
    // Excelente: s < 28 | Buena: 28 <= s < 35 | Regular: 35 <= s < 42 | Pobre: s >= 42
    let calificacionAci = "INSUFICIENTE_DATOS";
    if (n >= 10) {
      if (desviacionEstandar < 28) calificacionAci = "EXCELENTE";
      else if (desviacionEstandar < 35) calificacionAci = "BUENA";
      else if (desviacionEstandar < 42) calificacionAci = "REGULAR";
      else calificacionAci = "DEFICIENTE";
    }

    return NextResponse.json({
      ensayes,
      estadisticas: {
        totalMuestras: n,
        media: Math.round(media * 10) / 10,
        desviacionEstandar: Math.round(desviacionEstandar * 10) / 10,
        coeficienteVariacionPct: Math.round(coefVariacion * 10) / 10,
        minimo: Math.round(min * 10) / 10,
        maximo: Math.round(max * 10) / 10,
        calificacionAci,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const operator = await getOperator(request);
  if (!operator) return unauthorized();

  const licenseError = await requireModule(CodigoModulo.CURVAS_FC_FOTOS);
  if (licenseError) return licenseError;

  try {
    const body = await parseJson(request);
    const parsed = createEnsayeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de ensaye de compresión inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      especimenId,
      equipoPrensaId,
      fechaHoraEnsaye,
      edadRealDias,
      diametroMm,
      longitudMm,
      masaG,
      cargaMaximaKn,
      cargaMaximaKg,
      tipoFalla,
      condicionHumedad,
      observaciones,
    } = parsed.data;

    // Calcular Área Transversal en cm²: A = (pi * (d / 10)^2) / 4
    const diametroCm = diametroMm / 10;
    const areaCm2 = (Math.PI * Math.pow(diametroCm, 2)) / 4;

    // Determinar carga en kg y en kN
    let finalKg = cargaMaximaKg || 0;
    let finalKn = cargaMaximaKn || 0;

    if (finalKn > 0 && finalKg === 0) {
      // 1 kN ≈ 101.97162129779 kgf
      finalKg = finalKn * 101.97162;
    } else if (finalKg > 0 && finalKn === 0) {
      finalKn = finalKg / 101.97162;
    }

    if (finalKg <= 0) {
      return NextResponse.json({ error: "Debe ingresar una carga máxima válida (kN o kg)" }, { status: 400 });
    }

    // Esfuerzo de rotura (Resistencia a compresión): f'c = Carga(kg) / Area(cm²)
    const resistenciaKgCm2 = finalKg / areaCm2;

    // Obtener f'c de diseño para calcular porcentaje de cumplimiento
    const especimen = await prisma.especimen.findUnique({
      where: { id: especimenId },
      include: { muestra: true },
    });

    if (!especimen) {
      return NextResponse.json({ error: "Especímen no encontrado" }, { status: 404 });
    }

    let porcentajeFc: number | null = null;
    let cumple = true;
    if (especimen.muestra.fcKgCm2) {
      const fcDiseno = Number(especimen.muestra.fcKgCm2);
      if (fcDiseno > 0) {
        porcentajeFc = Math.round((resistenciaKgCm2 / fcDiseno) * 1000) / 10;
        // Si el ensaye es a edad de garantía (28 días o edad especificada)
        if (edadRealDias >= (especimen.edadDias || 28)) {
          cumple = resistenciaKgCm2 >= fcDiseno;
        }
      }
    }

    // Densidad si se proporcionó masa: rho = (masa / volumen)
    let densidadKgM3: number | null = null;
    if (masaG && masaG > 0) {
      const volumenCm3 = areaCm2 * (longitudMm / 10);
      densidadKgM3 = Math.round((masaG / volumenCm3) * 1000); // g/cm3 * 1000 = kg/m3
    }

    const ensaye = await prisma.ensayeCompresion.upsert({
      where: { especimenId },
      update: {
        equipoPrensaId: equipoPrensaId || null,
        operadorEnsayeId: operator.id,
        fechaHoraEnsaye: new Date(fechaHoraEnsaye),
        edadRealDias,
        diametroMm,
        longitudMm,
        areaCm2: Math.round(areaCm2 * 100) / 100,
        masaG: masaG || null,
        densidadKgM3,
        cargaMaximaKn: Math.round(finalKn * 10) / 10,
        cargaMaximaKg: Math.round(finalKg),
        resistenciaKgCm2: Math.round(resistenciaKgCm2 * 10) / 10,
        porcentajeFc,
        tipoFalla,
        condicionHumedad,
        cumpleEspecificacion: cumple,
        observaciones: observaciones || null,
      },
      create: {
        especimenId,
        equipoPrensaId: equipoPrensaId || null,
        operadorEnsayeId: operator.id,
        fechaHoraEnsaye: new Date(fechaHoraEnsaye),
        edadRealDias,
        diametroMm,
        longitudMm,
        areaCm2: Math.round(areaCm2 * 100) / 100,
        masaG: masaG || null,
        densidadKgM3,
        cargaMaximaKn: Math.round(finalKn * 10) / 10,
        cargaMaximaKg: Math.round(finalKg),
        resistenciaKgCm2: Math.round(resistenciaKgCm2 * 10) / 10,
        porcentajeFc,
        tipoFalla,
        condicionHumedad,
        cumpleEspecificacion: cumple,
        observaciones: observaciones || null,
      },
      include: {
        especimen: { include: { muestra: true } },
        fotos: true,
        operadorEnsaye: true,
        equipoPrensa: true,
      },
    });

    return NextResponse.json(ensaye, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

