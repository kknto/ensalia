import { prisma } from "@/lib/prisma";
import { TipoFallaConcreto } from "@prisma/client";
import { ParsedBlockResult, CorporateExcelDataset, CorporateExcelSpecimenItem } from "./types";
import { generateCorporateExcelWorkbook } from "./exporter";

export interface ReconciliationResult {
  creados: number;
  actualizados: number;
  duplicadosDetectados: number;
  muestraId?: string;
  idMuestra?: string;
  diagnosticos: string[];
}

export async function reconcileAndPersistImportedBatch(
  parsed: ParsedBlockResult,
  operatorId: string,
  options: {
    forzarSobrescritura?: boolean;
    muestraIdDestino?: string;
  } = {}
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    creados: 0,
    actualizados: 0,
    duplicadosDetectados: 0,
    diagnosticos: [],
  };

  const meta = parsed.metadata;
  const cliente = String(meta.cliente || "Cliente Importado Excel").trim();
  const obra = String(meta.obra || "Obra Importada Excel").trim();
  const rawIdMuestra = String(meta.id || meta.muestra || meta.folio || `IMP-${Date.now().toString(36).toUpperCase()}`).trim();
  const fcDiseno = typeof meta.fc === "number" ? meta.fc : parseFloat(String(meta.fc || "250")) || 250;

  // 1. Verificar si existe la muestra por idMuestra
  let muestra = options.muestraIdDestino
    ? await prisma.muestra.findUnique({ where: { id: options.muestraIdDestino }, include: { especimenes: true } })
    : await prisma.muestra.findFirst({
        where: { idMuestra: rawIdMuestra },
        include: { especimenes: true },
      });

  if (muestra && !options.forzarSobrescritura && !options.muestraIdDestino) {
    result.duplicadosDetectados++;
    result.diagnosticos.push(`La muestra con identificador '${rawIdMuestra}' ya existe en el sistema. Utilice forzarSobrescritura si desea actualizar.`);
    return result;
  }

  // 2. Si no existe, crear la Muestra
  if (!muestra) {
    const primerColado = parsed.specimens[0]?.fechaColado || new Date();
    muestra = await prisma.muestra.create({
      data: {
        idMuestra: rawIdMuestra,
        noMuestra: rawIdMuestra,
        cliente,
        obra,
        elemento: String(meta.elemento || "Concreto importado Excel"),
        fechaMuestreo: primerColado,
        fcKgCm2: fcDiseno,
        tipoConcreto: String(meta.tipo || "CONVENCIONAL"),
        cemento: String(meta.cemento || "CPC 40R"),
        concretera: meta.concretera ? String(meta.concretera) : null,
        creadorId: operatorId,
        version: 0,
      },
      include: { especimenes: true },
    });
    result.diagnosticos.push(`Muestra '${muestra.idMuestra}' creada exitosamente.`);
  }

  result.muestraId = muestra.id;
  result.idMuestra = muestra.idMuestra;

  // 3. Procesar cada espécimen y su ensaye
  for (const esp of parsed.specimens) {
    // Buscar si existe el espécimen por número
    let especimen = muestra.especimenes.find((e) => e.numero === esp.numero);

    if (!especimen) {
      especimen = await prisma.especimen.create({
        data: {
          muestraId: muestra.id,
          numero: esp.numero,
          edadDias: esp.edadDias,
          tipo: "CILINDRO_15X30",
        },
      });
    }

    const fechaEns = esp.fechaEnsaye || new Date();
    const pctFc = fcDiseno > 0 ? Number(((esp.resistenciaCalculadaKgCm2 / fcDiseno) * 100).toFixed(1)) : null;
    const cumple = fcDiseno > 0 ? esp.resistenciaCalculadaKgCm2 >= fcDiseno : true;

    // Upsert EnsayeCompresion
    await prisma.ensayeCompresion.upsert({
      where: { especimenId: especimen.id },
      update: {
        operadorEnsayeId: operatorId,
        fechaHoraEnsaye: fechaEns,
        edadRealDias: esp.edadDias,
        diametroMm: esp.diametroMm,
        longitudMm: esp.longitudMm,
        areaCm2: esp.areaCm2,
        cargaMaximaKn: esp.cargaMaximaKn,
        cargaMaximaKg: esp.cargaMaximaKg,
        resistenciaKgCm2: esp.resistenciaCalculadaKgCm2,
        porcentajeFc: pctFc,
        tipoFalla: esp.tipoFalla,
        cumpleEspecificacion: cumple,
      },
      create: {
        especimenId: especimen.id,
        operadorEnsayeId: operatorId,
        fechaHoraEnsaye: fechaEns,
        edadRealDias: esp.edadDias,
        diametroMm: esp.diametroMm,
        longitudMm: esp.longitudMm,
        areaCm2: esp.areaCm2,
        cargaMaximaKn: esp.cargaMaximaKn,
        cargaMaximaKg: esp.cargaMaximaKg,
        resistenciaKgCm2: esp.resistenciaCalculadaKgCm2,
        porcentajeFc: pctFc,
        tipoFalla: esp.tipoFalla,
        cumpleEspecificacion: cumple,
      },
    });

    result.creados++;
  }

  return result;
}

export async function exportCorporateExcelForSample(muestraId: string): Promise<Buffer> {
  const muestra = await prisma.muestra.findUnique({
    where: { id: muestraId },
    include: {
      colado: true,
      especimenes: {
        orderBy: { numero: "asc" },
        include: {
          ensayeCompresion: true,
        },
      },
    },
  });

  if (!muestra) {
    throw new Error("Muestra no encontrada para exportar a Excel.");
  }

  const fcDiseno = Number(muestra.fcKgCm2) || 250;
  const items: CorporateExcelSpecimenItem[] = [];

  for (const esp of muestra.especimenes) {
    const ens = esp.ensayeCompresion;
    if (ens) {
      items.push({
        numero: esp.numero,
        fechaColado: muestra.fechaMuestreo,
        fechaEnsaye: ens.fechaHoraEnsaye,
        edadDias: ens.edadRealDias,
        diametro1Mm: Number(ens.diametroMm),
        diametro2Mm: Number(ens.diametroMm),
        longitudMm: Number(ens.longitudMm),
        areaCm2: Number(ens.areaCm2),
        cargaMaximaKg: Number(ens.cargaMaximaKg),
        cargaMaximaKn: Number(ens.cargaMaximaKn),
        resistenciaKgCm2: Number(ens.resistenciaKgCm2),
        porcentajeFc: ens.porcentajeFc ? Number(ens.porcentajeFc) : Number(((Number(ens.resistenciaKgCm2) / fcDiseno) * 100).toFixed(1)),
        tipoFalla: ens.tipoFalla,
        cumple: ens.cumpleEspecificacion,
      });
    }
  }

  const esp28 = items.filter((i) => i.edadDias === 28);
  const prom28 = esp28.length > 0 ? esp28.reduce((a, b) => a + b.resistenciaKgCm2, 0) / esp28.length : undefined;

  const dataset: CorporateExcelDataset = {
    folio: `INF-COMP-${muestra.idMuestra}`,
    cliente: muestra.cliente,
    obra: muestra.obra,
    elemento: muestra.elemento || undefined,
    ubicacion: muestra.ubicacion || muestra.localizacion || undefined,
    fcDisenoKgCm2: fcDiseno,
    edadGarantiaDias: 28,
    tipoConcreto: muestra.tipoConcreto,
    tipoCemento: muestra.cemento || "CPC 40R",
    concretera: muestra.concretera || undefined,
    remision: muestra.remision || undefined,
    fechaMuestreo: muestra.fechaMuestreo,
    especimenes: items,
    promedio28d: prom28 ? Number(prom28.toFixed(1)) : undefined,
  };

  return await generateCorporateExcelWorkbook(dataset);
}

