import { prisma } from "@/lib/prisma";
import { readLocalDocument } from "@/lib/storage/local-files";
import { resolveManagedProfileAsset } from "@/lib/config/resources";
import { profileConfigurationSchema } from "@/lib/config/schema";
import { readFile } from "node:fs/promises";
import {
  CompressionReportData,
  MetrologiaEspecimenInput,
  EspecimenCalculado,
} from "./types";
import { calculateSpecimen, calculateAciStatistics } from "./metrology";
import { renderCompressionReportPdf, RenderPdfOptions } from "./renderer";
import { LabsicoReportData, LABSICO_DEFAULT_TEMPLATE } from "./labsico-template";
import { LabsicoPdfRenderer } from "./labsico-renderer";

export class CompressionReportError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export async function buildCompressionReportDataForSample(
  muestraId: string,
  options: {
    operadorNombre?: string;
    signatarioNombre?: string;
    folioPersonalizado?: string;
  } = {}
): Promise<CompressionReportData> {
  const muestra = await prisma.muestra.findUnique({
    where: { id: muestraId },
    include: {
      colado: true,
      especimenes: {
        orderBy: { numero: "asc" },
        include: {
          ensayeCompresion: {
            include: {
              fotos: true,
              operadorEnsaye: true,
              equipoPrensa: true,
            },
          },
        },
      },
    },
  });

  if (!muestra) {
    throw new CompressionReportError("Muestra no encontrada.", 404);
  }

  // Filtrar especímenes que ya tengan ensaye de compresión registrado
  const especimenesConEnsaye = muestra.especimenes.filter((e) => e.ensayeCompresion !== null);
  if (especimenesConEnsaye.length === 0) {
    throw new CompressionReportError("La muestra no cuenta con ensayes de compresión registrados.", 400);
  }

  // Cargar configuración de perfil de laboratorio activo
  const activeProfile = await prisma.perfilCliente.findFirst({
    where: { activo: true, versionPublicadaId: { not: null } },
    include: {
      versionPublicada: {
        include: {
          recursos: { where: { tipo: "LOGO" }, take: 1 },
        },
      },
    },
    orderBy: { actualizadoEn: "desc" },
  });

  let labNombre = "ENSALIA CONTROL DE CALIDAD S.A. DE C.V.";
  let labRazon = "LABORATORIO DE CONTROL DE CALIDAD Y METROLOGÍA DE MATERIALES";
  let labEma = "Acreditación EMA No. C-0412-089/22 | Rama Concreto";
  let labDomicilio = "";
  let labTelefono = "";
  let logoBytes: Uint8Array | undefined;
  let logoMimeType: "image/png" | "image/jpeg" | undefined;

  if (activeProfile?.versionPublicada) {
    const configParsed = profileConfigurationSchema.safeParse(activeProfile.versionPublicada.configuracionJson);
    if (configParsed.success) {
      const ident = configParsed.data.identidad;
      if (ident.nombreComercial) labNombre = ident.nombreComercial;
      if (ident.razonSocial) labRazon = ident.razonSocial;
      if (ident.domicilio) labDomicilio = ident.domicilio;
      if (ident.contacto) labTelefono = ident.contacto;
    }

    const logoRecurso = activeProfile.versionPublicada.recursos[0];
    if (logoRecurso && ["image/png", "image/jpeg"].includes(logoRecurso.mimeType)) {
      try {
        const filePath = resolveManagedProfileAsset(logoRecurso.rutaRelativa);
        logoBytes = new Uint8Array(await readFile(filePath));
        logoMimeType = logoRecurso.mimeType as "image/png" | "image/jpeg";
      } catch {
        logoBytes = undefined;
      }
    }
  }

  const fcDiseno = Number(muestra.fcKgCm2) || 250;
  const fechaColado = muestra.fechaMuestreo;

  // Procesar cada espécimen y sus fotos
  const especimenesCalculados: EspecimenCalculado[] = [];
  let operadorDetectado = options.operadorNombre || "Técnico de Laboratorio";
  let prensaDetectada = "PRENSA-01";

  for (const esp of especimenesConEnsaye) {
    const ens = esp.ensayeCompresion!;
    if (ens.operadorEnsaye?.nombre && !options.operadorNombre) {
      operadorDetectado = ens.operadorEnsaye.nombre;
    }
    if (ens.equipoPrensa?.codigoInterno) {
      prensaDetectada = ens.equipoPrensa.codigoInterno;
    }

    // Buscar foto de fractura si existe
    let fotoBytes: Uint8Array | undefined;
    let fotoMime: "image/jpeg" | "image/png" | "image/webp" | undefined;

    const fotoRecord = ens.fotos.find((f) => f.tipo === "ROTURA_FRACTURA") || ens.fotos[0];
    if (fotoRecord) {
      try {
        const diskBuffer = await readLocalDocument(fotoRecord.rutaRelativa);
        if (diskBuffer && diskBuffer.length > 0) {
          fotoBytes = new Uint8Array(diskBuffer);
          fotoMime = (fotoRecord.mimeType as any) || "image/jpeg";
        }
      } catch {
        fotoBytes = undefined;
      }
    }

    const inputMet: MetrologiaEspecimenInput = {
      numero: esp.numero,
      fechaColado,
      fechaEnsaye: ens.fechaHoraEnsaye,
      edadProgramadaDias: esp.edadDias || 28,
      diametro1Mm: Number(ens.diametroMm),
      longitudMm: Number(ens.longitudMm),
      masaG: ens.masaG ? Number(ens.masaG) : null,
      cargaMaximaKn: Number(ens.cargaMaximaKn),
      cargaMaximaKg: Number(ens.cargaMaximaKg),
      tipoFalla: ens.tipoFalla,
      condicionHumedad: ens.condicionHumedad,
      fotoRoturaBytes: fotoBytes,
      fotoRoturaMimeType: fotoMime,
    };

    const calc = calculateSpecimen(inputMet, fcDiseno);
    especimenesCalculados.push(calc);
  }

  // Estadísticas ACI 214R / ACI 318
  const aciStats = calculateAciStatistics(especimenesCalculados, fcDiseno);

  const folio = options.folioPersonalizado || `INF-COMP-${muestra.idMuestra}`;

  const reportData: CompressionReportData = {
    folio,
    fechaEmision: new Date(),
    laboratorio: {
      nombre: labNombre,
      razonSocial: labRazon,
      acreditacionEma: labEma,
      domicilio: labDomicilio,
      telefono: labTelefono,
      logoBytes,
      logoMimeType,
    },
    proyecto: {
      cliente: muestra.cliente || "Cliente Particular",
      obra: muestra.obra || "Obra Particular",
      ubicacion: muestra.ubicacion || muestra.localizacion || muestra.colado?.localizacion || undefined,
      contratista: undefined,
      elemento: muestra.elemento || muestra.colado?.elemento || "Muestra de concreto",
    },
    mezcla: {
      fcDisenoKgCm2: fcDiseno,
      edadGarantiaDias: 28,
      revenimientoNominalCm: muestra.revenimientoCm ? Number(muestra.revenimientoCm) : undefined,
      tmaMm: muestra.tmaMm ? Number(muestra.tmaMm) : undefined,
      tipoConcreto: muestra.tipoConcreto || "CONVENCIONAL",
      tipoCemento: muestra.cemento || muestra.colado?.cemento || "CPC 40R",
      concretera: muestra.concretera || muestra.colado?.concretera || undefined,
      numeroRemision: muestra.remision || undefined,
      numeroCamion: muestra.camion || undefined,
      volumenM3: muestra.volumenM3 ? Number(muestra.volumenM3) : undefined,
    },
    muestreo: {
      idMuestra: muestra.idMuestra,
      fechaHoraMuestreo: fechaColado,
      revenimientoObtenidoCm: muestra.revenimientoObtenido ? Number(muestra.revenimientoObtenido) : undefined,
      temperaturaAmbienteC: muestra.tempAmbienteC ? Number(muestra.tempAmbienteC) : undefined,
      temperaturaConcretoC: muestra.tempConcretoC ? Number(muestra.tempConcretoC) : undefined,
      contenidoAirePct: muestra.contenidoAirePct ? Number(muestra.contenidoAirePct) : undefined,
      regimenCurado: "Cámara Húmeda NMX-C-148 (23 ± 2 °C, HR >= 95%)",
      metodoCabeceo: "Platos con almohadillas de neopreno (ASTM C1231)",
    },
    especimenes: especimenesCalculados,
    estadisticasAci: aciStats,
    firmas: {
      operadorNombre: operadorDetectado,
      operadorCargo: "Técnico de Ensayes",
      signatarioNombre: options.signatarioNombre || "Ing. Jefe de Control de Calidad",
      signatarioCargo: "Signatario Autorizado Acreditado EMA",
    },
    metadatos: {
      prensaCodigoInterno: prensaDetectada,
      observaciones: muestra.observaciones || undefined,
    },
  };

  return reportData;
}

export async function generateCompressionReportPdfBySample(
  muestraId: string,
  options: {
    operadorNombre?: string;
    signatarioNombre?: string;
    folioPersonalizado?: string;
    renderOptions?: RenderPdfOptions;
  } = {}
): Promise<{ bytes: Uint8Array; reportData: CompressionReportData }> {
  const reportData = await buildCompressionReportDataForSample(muestraId, options);
  const bytes = await renderCompressionReportPdf(reportData, options.renderOptions);
  return { bytes, reportData };
}

/**
 * Construye la estructura de datos para el Informe Oficial de Ensayes LABSICO (MC-LBS-CC-IE Rev. 07)
 */
export async function buildLabsicoReportDataForSample(
  muestraId: string,
  options: {
    operadorNombre?: string;
    signatarioNombre?: string;
    signatarioAdminNombre?: string;
    sistemaFolio?: string;
    isPreliminary?: boolean;
  } = {}
): Promise<LabsicoReportData> {
  const muestra = await prisma.muestra.findUnique({
    where: { id: muestraId },
    include: {
      colado: true,
      especimenes: {
        orderBy: { numero: "asc" },
        include: {
          ensayeCompresion: {
            include: {
              operadorEnsaye: true,
            },
          },
        },
      },
    },
  });

  if (!muestra) {
    throw new CompressionReportError("Muestra no encontrada.", 404);
  }

  const fcDiseno = Number(muestra.fcKgCm2) || 200;
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const fm = new Date(muestra.fechaMuestreo);
  const fechaMuestreoTexto = `${fm.getDate()}${meses[fm.getMonth()]}${fm.getFullYear()}`;

  const hoy = new Date();
  const fechaElab = `${String(hoy.getDate()).padStart(2, "0")}/${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`;

  // Procesar especímenes (hasta 4 o 6)
  const esCilindro10x20 = Boolean(muestra.cilindro10x20 || muestra.e10x20);

  const especimenesData = muestra.especimenes.map((esp, idx) => {
    const ens = esp.ensayeCompresion;
    const estaEnsayado = ens !== null;

    let fechaEns = "---";
    let edad = esp.edadDias || 28;
    let cargaKg = 0;
    let diametroCm = 0;
    let alturaCm = 0;
    let areaCm2 = 0;
    let factorLd = 0;
    let fcObt = 0;
    let fcCorregida = 0;
    let fcMpa = 0;
    let pctFc = 0;
    let tipoFallaTexto = "---";
    let tipoFallaNumero = 0;

    if (ens) {
      const fe = new Date(ens.fechaHoraEnsaye);
      fechaEns = `${String(fe.getDate()).padStart(2, "0")}/${String(fe.getMonth() + 1).padStart(2, "0")}/${fe.getFullYear()}`;
      edad = ens.edadRealDias;
      cargaKg = Number(ens.cargaMaximaKg);
      diametroCm = Number((Number(ens.diametroMm) / 10).toFixed(2));
      alturaCm = Number((Number(ens.longitudMm) / 10).toFixed(2));
      areaCm2 = Number(ens.areaCm2);
      factorLd = diametroCm > 0 && Math.abs(alturaCm / diametroCm - 2.0) < 0.05 ? 0.95 : 1.0;
      fcObt = areaCm2 > 0 ? cargaKg / areaCm2 : 0;
      fcCorregida = Number(ens.resistenciaKgCm2);
      fcMpa = Number((fcCorregida / 10.1972).toFixed(1));
      pctFc = fcDiseno > 0 ? Number(((fcCorregida / fcDiseno) * 100).toFixed(1)) : 0;
      tipoFallaTexto = ens.tipoFalla;

      switch (ens.tipoFalla) {
        case "CONO_TIPO_1": tipoFallaNumero = 1; break;
        case "CONO_Y_DIVIDIDO_TIPO_2": tipoFallaNumero = 2; break;
        case "COLUMNA_TIPO_3": tipoFallaNumero = 3; break;
        case "CIZALLA_TIPO_4": tipoFallaNumero = 4; break;
        case "ESQUINA_TIPO_5": tipoFallaNumero = 5; break;
        case "PUNTUAL_TIPO_6": tipoFallaNumero = 6; break;
        default: tipoFallaNumero = 1; break;
      }
    } else {
      // Probeta aún no ensayada pero programada
      if (esp.fechaEnsaye) {
        const fe = new Date(esp.fechaEnsaye);
        fechaEns = `${String(fe.getDate()).padStart(2, "0")}/${String(fe.getMonth() + 1).padStart(2, "0")}/${fe.getFullYear()}`;
      }
    }

    return {
      itemNumero: idx + 1,
      alturaCm,
      diametroCm,
      areaCm2,
      fechaEnsaye: fechaEns,
      edadDias: edad,
      cargaMaximaKg: cargaKg,
      factorLd: estaEnsayado ? factorLd : 0,
      fcObtenidaKgCm2: Number(fcObt.toFixed(1)),
      fcCorregidaKgCm2: fcCorregida,
      fcMpa,
      porcentajeFc: pctFc,
      tipoFallaTexto: estaEnsayado ? tipoFallaTexto : "---",
      tipoFallaNumero,
      estaEnsayado,
    };
  });

  const totalEnsayados = especimenesData.filter((e) => e.estaEnsayado).length;
  const esPreliminar = totalEnsayados < especimenesData.length || muestra.estatusBitacora !== "CERRADA";

  const primerOperador = muestra.especimenes.find(e => e.ensayeCompresion?.operadorEnsaye)?.ensayeCompresion?.operadorEnsaye?.nombre;

  // Formato de hora de muestreo a partir de inicioDescarga o salidaPlanta
  let horaMuestreoStr = "---";
  const fechaHora = muestra.inicioDescarga || muestra.llegadaObra || muestra.fechaMuestreo;
  if (fechaHora) {
    const d = new Date(fechaHora);
    horaMuestreoStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} h`;
  }

  const labsicoData: LabsicoReportData = {
    header: {
      titular: LABSICO_DEFAULT_TEMPLATE.titular,
      nombreComercial: LABSICO_DEFAULT_TEMPLATE.nombreComercial,
      tituloReporte: LABSICO_DEFAULT_TEMPLATE.tituloReporte,
      codigoFormato: LABSICO_DEFAULT_TEMPLATE.codigoFormato,
      revision: LABSICO_DEFAULT_TEMPLATE.revision,
      fechaRevision: LABSICO_DEFAULT_TEMPLATE.fechaRevision,
      sistemaFolio: options.sistemaFolio || muestra.noMuestra || "8794",
    },
    cliente: {
      muestra: muestra.idMuestra,
      reporte: muestra.noMuestra || String(fm.getFullYear()),
      remision: muestra.remision || "---",
      fechaMuestreo: fechaMuestreoTexto,
      cliente: muestra.cliente || "---",
      direccion: muestra.localizacion || muestra.ubicacion || "---",
      procedencia: muestra.procedencia || "---",
      elaboracion: muestra.laboratoristaCampo ? `Muestreado por ${muestra.laboratoristaCampo}` : "Tomada en Obra",
      obra: muestra.obra || "---",
    },
    general: {
      tipoEspecimen: esCilindro10x20 ? "Cilindro de Concreto 10x20 cm" : "Cilindro de Concreto 15x30 cm",
      curado: "Pileta de Curado",
      tempTanqueC: "23 ± 2 °C",
      fcProyectoKgCm2: `${fcDiseno} kgf/cm²`,
      revenimientoDiseno: muestra.revenimientoCm ? `${muestra.revenimientoCm} ± 3.5 cm` : "---",
      elemento: muestra.elemento || "---",
      volumenM3: muestra.volumenM3 ? `${muestra.volumenM3} m³` : "---",
      concretera: muestra.concretera || "---",
      cemento: muestra.cemento || "---",
      noCamion: muestra.camion || "---",
      factorCorreccion: esCilindro10x20 ? "0.95" : "1.00",
    },
    sitio: {
      revenimientoObtenido: muestra.revenimientoObtenido ? `${muestra.revenimientoObtenido} cm` : "---",
      tempConcretoC: muestra.tempConcretoC ? `${muestra.tempConcretoC} °C` : "---",
      tempAmbienteC: muestra.tempAmbienteC ? `${muestra.tempAmbienteC} °C` : "---",
      horaMuestra: horaMuestreoStr,
      tma: muestra.tmaMm ? `${muestra.tmaMm} mm` : "---",
      edadGarantia: `${muestra.edadCilindro || 28} días`,
      especificacion: muestra.tipoConcreto || "---",
      vibrado: "Inmersión",
    },
    especimenes: especimenesData,
    ubicacionElemento: muestra.localizacion || muestra.ubicacion || "---",
    observaciones: muestra.observaciones || "---",
    esPreliminar: options.isPreliminary !== undefined ? options.isPreliminary : esPreliminar,
    fechaElaboracionInforme: fechaElab,
    firmas: {
      ensayaNombre: options.operadorNombre || primerOperador || "---",
      ensayaCargo: "Técnico de Operaciones",
      revisaNombre: options.signatarioNombre || "---",
      revisaCargo: "Signatario Operativo Autorizado",
      autorizaNombre: options.signatarioAdminNombre || LABSICO_DEFAULT_TEMPLATE.titular,
      autorizaCargo: "Director Técnico",
    },
  };

  return labsicoData;
}

/**
 * Genera el buffer binario PDF del Informe Oficial LABSICO
 */
export async function generateLabsicoReportPdfBySample(
  muestraId: string,
  options: {
    operadorNombre?: string;
    signatarioNombre?: string;
    signatarioAdminNombre?: string;
    sistemaFolio?: string;
    isPreliminary?: boolean;
  } = {}
): Promise<{ bytes: Uint8Array; reportData: LabsicoReportData }> {
  const reportData = await buildLabsicoReportDataForSample(muestraId, options);
  const bytes = await LabsicoPdfRenderer.renderToPdf(reportData, {
    isPreliminary: options.isPreliminary !== undefined ? options.isPreliminary : reportData.esPreliminar,
  });
  return { bytes, reportData };
}
