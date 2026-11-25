import { MetrologiaEspecimenInput, EspecimenCalculado } from "./types";
import { TipoFallaConcreto } from "@prisma/client";

export const KN_TO_KGF = 101.97162129779;
export const KGF_TO_KN = 0.00980665;

export interface DimensionResult {
  diametro1Mm: number;
  diametro2Mm: number;
  diametroPromedioMm: number;
  excentricidadPct: number;
  excentricidadValida: boolean;
  alertaExcentricidad?: string;
  areaCm2: number;
}

export function calculateDimensionsAndArea(d1Mm: number, d2Mm?: number): DimensionResult {
  const d1 = Number(d1Mm.toFixed(2));
  const d2 = d2Mm && d2Mm > 0 ? Number(d2Mm.toFixed(2)) : d1;
  const dProm = Number(((d1 + d2) / 2).toFixed(2));

  const minD = Math.min(d1, d2);
  const diffD = Math.abs(d1 - d2);
  const excentricidadPct = minD > 0 ? Number(((diffD / minD) * 100).toFixed(2)) : 0;
  const excentricidadValida = excentricidadPct <= 2.0;

  let alertaExcentricidad: string | undefined;
  if (!excentricidadValida) {
    alertaExcentricidad = `Excentricidad excesiva (${excentricidadPct}% > 2.0% ASTM C39 §6.2)`;
  }

  // Área = pi * (D / 10)^2 / 4 en cm²
  const diametroCm = dProm / 10;
  const areaCm2 = Number(((Math.PI * Math.pow(diametroCm, 2)) / 4).toFixed(2));

  return {
    diametro1Mm: d1,
    diametro2Mm: d2,
    diametroPromedioMm: dProm,
    excentricidadPct,
    excentricidadValida,
    alertaExcentricidad,
    areaCm2,
  };
}

export interface SlendernessResult {
  relacionLd: number;
  factorLd: number;
  especimenRechazadoLd: boolean;
  alertaLd?: string;
}

export function calculateSlendernessCorrection(longitudMm: number, diametroMm: number): SlendernessResult {
  if (diametroMm <= 0 || longitudMm <= 0) {
    return {
      relacionLd: 0,
      factorLd: 1.0,
      especimenRechazadoLd: true,
      alertaLd: "Dimensiones geométricas inválidas para cálculo L/D",
    };
  }

  const ld = Number((longitudMm / diametroMm).toFixed(2));

  if (ld < 1.0) {
    return {
      relacionLd: ld,
      factorLd: 0.87,
      especimenRechazadoLd: true,
      alertaLd: `Relación L/D = ${ld.toFixed(2)} < 1.00. Espécimen RECHAZADO según ASTM C39 Tabla 1`,
    };
  }

  if (ld >= 2.0) {
    return {
      relacionLd: ld,
      factorLd: 1.0,
      especimenRechazadoLd: false,
    };
  }

  // Interpolación lineal continua según ASTM C39 / NMX-C-083 Tabla 1
  // Puntos de calibración:
  // 1.00 -> 0.87
  // 1.25 -> 0.93
  // 1.50 -> 0.96
  // 1.75 -> 0.98
  // 2.00 -> 1.00
  let factor: number;
  if (ld >= 1.75) {
    factor = 0.98 + ((ld - 1.75) / (2.0 - 1.75)) * (1.0 - 0.98);
  } else if (ld >= 1.5) {
    factor = 0.96 + ((ld - 1.5) / (1.75 - 1.5)) * (0.98 - 0.96);
  } else if (ld >= 1.25) {
    factor = 0.93 + ((ld - 1.25) / (1.5 - 1.25)) * (0.96 - 0.93);
  } else {
    factor = 0.87 + ((ld - 1.0) / (1.25 - 1.0)) * (0.93 - 0.87);
  }

  const factorLd = Number(factor.toFixed(3));
  return {
    relacionLd: ld,
    factorLd,
    especimenRechazadoLd: false,
    alertaLd: factorLd < 1.0 ? `Factor de corrección L/D aplicado: ${factorLd.toFixed(3)}` : undefined,
  };
}

export interface AgeToleranceResult {
  edadRealDias: number;
  diferenciaHoras: number;
  toleranciaPermitidaHoras: number;
  enTolerancia: boolean;
  alertaEdad?: string;
}

export function checkAgeTolerance(
  fechaColado: Date,
  fechaEnsaye: Date,
  edadProgramadaDias: number
): AgeToleranceResult {
  const diffMs = fechaEnsaye.getTime() - fechaColado.getTime();
  const horasTranscurridas = diffMs / (1000 * 60 * 60);
  const edadRealDias = Math.max(1, Math.round(horasTranscurridas / 24));
  const nominalHours = edadProgramadaDias * 24;

  // Tolerancias horarias fijadas por NMX-C-083-ONNCCE
  let toleranciaPermitidaHoras: number;
  switch (edadProgramadaDias) {
    case 1:
      toleranciaPermitidaHoras = 0.5; // ±30 min
      break;
    case 3:
      toleranciaPermitidaHoras = 2.0;
      break;
    case 7:
      toleranciaPermitidaHoras = 6.0;
      break;
    case 14:
      toleranciaPermitidaHoras = 12.0;
      break;
    case 28:
      toleranciaPermitidaHoras = 20.0;
      break;
    case 60:
      toleranciaPermitidaHoras = 36.0;
      break;
    case 90:
      toleranciaPermitidaHoras = 48.0;
      break;
    default:
      // Tolerancia relativa por defecto: ±3%
      toleranciaPermitidaHoras = Number((nominalHours * 0.03).toFixed(1));
      break;
  }

  const desfaseHoras = horasTranscurridas - nominalHours;
  const enTolerancia = Math.abs(desfaseHoras) <= toleranciaPermitidaHoras;

  let alertaEdad: string | undefined;
  if (!enTolerancia) {
    const signo = desfaseHoras > 0 ? "+" : "";
    alertaEdad = `FUERA DE TOLERANCIA NMX-C-083 (${signo}${desfaseHoras.toFixed(1)} h vs ±${toleranciaPermitidaHoras} h)`;
  }

  return {
    edadRealDias,
    diferenciaHoras: Number(desfaseHoras.toFixed(2)),
    toleranciaPermitidaHoras,
    enTolerancia,
    alertaEdad,
  };
}

export function calculateSpecimen(
  input: MetrologiaEspecimenInput,
  fcDisenoKgCm2?: number
): EspecimenCalculado {
  const dim = calculateDimensionsAndArea(input.diametro1Mm, input.diametro2Mm);
  const slenderness = calculateSlendernessCorrection(input.longitudMm, dim.diametroPromedioMm);
  const age = checkAgeTolerance(input.fechaColado, input.fechaEnsaye, input.edadProgramadaDias);

  // Normalización de carga mecánica
  let finalKg = input.cargaMaximaKg || 0;
  let finalKn = input.cargaMaximaKn || 0;

  if (finalKn > 0 && finalKg === 0) {
    finalKg = finalKn * KN_TO_KGF;
  } else if (finalKg > 0 && finalKn === 0) {
    finalKn = finalKg * KGF_TO_KN;
  }

  finalKg = Math.round(finalKg);
  finalKn = Number(finalKn.toFixed(1));

  // Resistencia nominal = P / A
  const resNominal = dim.areaCm2 > 0 ? finalKg / dim.areaCm2 : 0;
  // Resistencia corregida por factor L/D
  const resCorregida = resNominal * slenderness.factorLd;

  const resistenciaNominalKgCm2 = Number(resNominal.toFixed(1));
  const resistenciaCorregidaKgCm2 = Number(resCorregida.toFixed(1));

  let porcentajeFc: number | null = null;
  let cumple = true;
  if (fcDisenoKgCm2 && fcDisenoKgCm2 > 0) {
    porcentajeFc = Number(((resistenciaCorregidaKgCm2 / fcDisenoKgCm2) * 100).toFixed(1));
    if (age.edadRealDias >= input.edadProgramadaDias && input.edadProgramadaDias >= 28) {
      cumple = resistenciaCorregidaKgCm2 >= fcDisenoKgCm2;
    }
  }

  // Densidad aparente volumétrica si se aportó masa
  let densidadKgM3: number | null = null;
  if (input.masaG && input.masaG > 0 && dim.areaCm2 > 0 && input.longitudMm > 0) {
    const volumenCm3 = dim.areaCm2 * (input.longitudMm / 10);
    if (volumenCm3 > 0) {
      densidadKgM3 = Math.round((input.masaG / volumenCm3) * 1000);
    }
  }

  return {
    numero: input.numero,
    fechaColado: input.fechaColado,
    fechaEnsaye: input.fechaEnsaye,
    edadRealDias: age.edadRealDias,
    edadProgramadaDias: input.edadProgramadaDias,
    enToleranciaEdad: age.enTolerancia,
    alertaEdad: age.alertaEdad,
    diametro1Mm: dim.diametro1Mm,
    diametro2Mm: dim.diametro2Mm,
    diametroPromedioMm: dim.diametroPromedioMm,
    excentricidadPct: dim.excentricidadPct,
    excentricidadValida: dim.excentricidadValida,
    alertaExcentricidad: dim.alertaExcentricidad,
    longitudMm: input.longitudMm,
    relacionLd: slenderness.relacionLd,
    factorLd: slenderness.factorLd,
    especimenRechazadoLd: slenderness.especimenRechazadoLd,
    alertaLd: slenderness.alertaLd,
    areaCm2: dim.areaCm2,
    masaG: input.masaG,
    densidadKgM3,
    cargaMaximaKn: finalKn,
    cargaMaximaKg: finalKg,
    resistenciaNominalKgCm2,
    resistenciaCorregidaKgCm2,
    porcentajeFc,
    cumpleEspecificacion: cumple,
    tipoFalla: input.tipoFalla || TipoFallaConcreto.CONO_TIPO_1,
    condicionHumedad: input.condicionHumedad || "HUMEDO_SATURADO",
    fotoRoturaBytes: input.fotoRoturaBytes,
    fotoRoturaMimeType: input.fotoRoturaMimeType,
  };
}

export interface AciStatisticsResult {
  promedioResistenciaKgCm2: number;
  desviacionEstandarKgCm2: number;
  coeficienteVariacionPct: number;
  variacionDentroDelEnsayoPct?: number;
  resistenciaRequeridaFcr?: number;
  calificacionControl: "EXCELENTE" | "MUY_BUENO" | "BUENO" | "DEFICIENTE" | "INSUFICIENTE_DATOS";
  cumpleCriterioAci318: boolean;
}

export function calculateAciStatistics(
  especimenes: EspecimenCalculado[],
  fcDisenoKgCm2: number
): AciStatisticsResult {
  const valores = especimenes
    .map((e) => e.resistenciaCorregidaKgCm2)
    .filter((v) => typeof v === "number" && !isNaN(v) && v > 0);

  const n = valores.length;
  if (n === 0) {
    return {
      promedioResistenciaKgCm2: 0,
      desviacionEstandarKgCm2: 0,
      coeficienteVariacionPct: 0,
      calificacionControl: "INSUFICIENTE_DATOS",
      cumpleCriterioAci318: false,
    };
  }

  const media = valores.reduce((acc, val) => acc + val, 0) / n;
  let s = 0;
  let v = 0;

  if (n > 1) {
    const sumaCuadrados = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0);
    s = Math.sqrt(sumaCuadrados / (n - 1));
    v = media > 0 ? (s / media) * 100 : 0;
  }

  // Variación dentro del ensayo (ACI 214R s1, V1) para pares de probetas gemelas
  let variacionDentro: number | undefined;
  if (n === 2) {
    const rango = Math.abs(valores[0] - valores[1]);
    const s1 = rango / 1.128; // d2 = 1.128 para n = 2
    variacionDentro = media > 0 ? Number(((s1 / media) * 100).toFixed(2)) : 0;
  }

  // Calificación del control del laboratorio según ACI 214R Tabla 4.3
  let calificacion: AciStatisticsResult["calificacionControl"] = "INSUFICIENTE_DATOS";
  const metricaCalificacion = variacionDentro !== undefined ? variacionDentro : v;
  if (metricaCalificacion > 0) {
    if (metricaCalificacion < 3.0) calificacion = "EXCELENTE";
    else if (metricaCalificacion <= 4.0) calificacion = "MUY_BUENO";
    else if (metricaCalificacion <= 5.0) calificacion = "BUENO";
    else calificacion = "DEFICIENTE";
  }

  // Resistencia de dosificación requerida f'cr (ACI 318-19 / ACI 214R)
  let fcr: number | undefined;
  if (fcDisenoKgCm2 > 0) {
    if (n >= 15 && s > 0) {
      // Ajuste k para 15 <= n < 30
      let k = 1.0;
      if (n < 20) k = 1.16;
      else if (n < 25) k = 1.08;
      else if (n < 30) k = 1.03;
      const sAjustada = s * k;

      if (fcDisenoKgCm2 <= 350) {
        fcr = Math.max(fcDisenoKgCm2 + 1.34 * sAjustada, fcDisenoKgCm2 + 2.33 * sAjustada - 35);
      } else {
        fcr = Math.max(fcDisenoKgCm2 + 1.34 * sAjustada, 0.9 * fcDisenoKgCm2 + 2.33 * sAjustada);
      }
    } else {
      // Historial insuficiente n < 15: Margen fijo según Tabla 26.12.1.1(b)
      if (fcDisenoKgCm2 < 210) fcr = fcDisenoKgCm2 + 70;
      else if (fcDisenoKgCm2 <= 350) fcr = fcDisenoKgCm2 + 85;
      else fcr = 1.1 * fcDisenoKgCm2 + 50;
    }
  }

  // Criterio estructural ACI 318-19 §26.12.3:
  // 1. Promedio de ensayos >= f'c
  // 2. Ningún ensayo cae por debajo de f'c por más de 35 kg/cm² (o 0.10 f'c)
  const toleranciaBaja = fcDisenoKgCm2 <= 350 ? 35 : 0.1 * fcDisenoKgCm2;
  const umbralIndividual = fcDisenoKgCm2 - toleranciaBaja;
  const cumpleAci318 = media >= fcDisenoKgCm2 && valores.every((val) => val >= umbralIndividual);

  return {
    promedioResistenciaKgCm2: Number(media.toFixed(1)),
    desviacionEstandarKgCm2: Number(s.toFixed(1)),
    coeficienteVariacionPct: Number(v.toFixed(1)),
    variacionDentroDelEnsayoPct: variacionDentro,
    resistenciaRequeridaFcr: fcr ? Number(fcr.toFixed(1)) : undefined,
    calificacionControl: calificacion,
    cumpleCriterioAci318: cumpleAci318,
  };
}

