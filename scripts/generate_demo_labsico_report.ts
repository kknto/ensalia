import fs from "node:fs";
import path from "node:path";
import {
  LABSICO_DEFAULT_TEMPLATE,
  LabsicoReportData,
  renderLabsicoReportPdf,
} from "../src/lib/pdf/compression-report";

async function main() {
  const sampleData: LabsicoReportData = {
    header: {
      titular: LABSICO_DEFAULT_TEMPLATE.titular,
      nombreComercial: LABSICO_DEFAULT_TEMPLATE.nombreComercial,
      tituloReporte: LABSICO_DEFAULT_TEMPLATE.tituloReporte,
      codigoFormato: LABSICO_DEFAULT_TEMPLATE.codigoFormato,
      revision: LABSICO_DEFAULT_TEMPLATE.revision,
      fechaRevision: LABSICO_DEFAULT_TEMPLATE.fechaRevision,
      sistemaFolio: "8794",
    },
    cliente: {
      muestra: "00147",
      reporte: "00147",
      remision: "REM-88412",
      fechaMuestreo: "01/10/2026",
      cliente: "IGNITIA DESARROLLOS S.A. DE C.V.",
      direccion: "AV. HUAYACAN SM 313, CANCUN, Q. ROO",
      procedencia: "PLANTA CANCUN 2",
      elaboracion: "TÉCNICO DE LABORATORIO",
      obra: "TORRE IGNITIA RESIDENCIAL",
    },
    general: {
      tipoEspecimen: "CILINDRICO (15 x 30 cm)",
      curado: "HÚMEDO EN TANQUE BAJO NORMA",
      tempTanqueC: "23.0 °C",
      fcProyectoKgCm2: "250 kg/cm²",
      revenimientoDiseno: "14.0 cm",
      elemento: "LOSA DE ENTREPISO NIVEL 4",
      volumenM3: "7.5 m³",
      concretera: "CONCRETERA DEL CARIBE",
      cemento: "CPC 40",
      noCamion: "OLLA-14",
      factorCorreccion: "1.00",
    },
    sitio: {
      revenimientoObtenido: "14.5 cm",
      tempConcretoC: "29.5 °C",
      tempAmbienteC: "28.0 °C",
      horaMuestra: "10:30 h",
      tma: "20 mm",
      edadGarantia: "28 días",
      especificacion: "Normal Bombeable",
      vibrado: "Inmersión",
    },
    especimenes: [
      {
        itemNumero: 1,
        alturaCm: 30.0,
        diametroCm: 15.0,
        areaCm2: 176.71,
        fechaEnsaye: "08/10/2026",
        edadDias: 7,
        cargaMaximaKg: 33575,
        factorLd: 1.0,
        fcObtenidaKgCm2: 190.0,
        fcCorregidaKgCm2: 190.0,
        fcMpa: 18.63,
        porcentajeFc: 76.0,
        tipoFallaTexto: "Cono",
        tipoFallaNumero: 1,
        estaEnsayado: true,
      },
      {
        itemNumero: 2,
        alturaCm: 30.0,
        diametroCm: 15.0,
        areaCm2: 176.71,
        fechaEnsaye: "15/10/2026",
        edadDias: 14,
        cargaMaximaKg: 40643,
        factorLd: 1.0,
        fcObtenidaKgCm2: 230.0,
        fcCorregidaKgCm2: 230.0,
        fcMpa: 22.56,
        porcentajeFc: 92.0,
        tipoFallaTexto: "Cono y Hendidura",
        tipoFallaNumero: 2,
        estaEnsayado: true,
      },
      {
        itemNumero: 3,
        alturaCm: 30.0,
        diametroCm: 15.0,
        areaCm2: 176.71,
        fechaEnsaye: "29/10/2026",
        edadDias: 28,
        cargaMaximaKg: 46828,
        factorLd: 1.0,
        fcObtenidaKgCm2: 265.0,
        fcCorregidaKgCm2: 265.0,
        fcMpa: 25.99,
        porcentajeFc: 106.0,
        tipoFallaTexto: "Cono",
        tipoFallaNumero: 1,
        estaEnsayado: true,
      },
      {
        itemNumero: 4,
        alturaCm: 30.0,
        diametroCm: 15.0,
        areaCm2: 176.71,
        fechaEnsaye: "29/10/2026",
        edadDias: 28,
        cargaMaximaKg: 47712,
        factorLd: 1.0,
        fcObtenidaKgCm2: 270.0,
        fcCorregidaKgCm2: 270.0,
        fcMpa: 26.48,
        porcentajeFc: 108.0,
        tipoFallaTexto: "Columna",
        tipoFallaNumero: 3,
        estaEnsayado: true,
      },
    ],
    ubicacionElemento: "Losa de Entrepiso Nivel 4 Eje C-D",
    observaciones: "Concreto Normal Bombeable, curado estandar en agua.",
    esPreliminar: false,
    fechaElaboracionInforme: "29/10/2026",
    firmas: {
      ensayaNombre: "MIGUEL A. CANCHE",
      ensayaCargo: "Técnico de Ensayes",
      revisaNombre: "ING. CONTROL DE CALIDAD",
      revisaCargo: "Signatario Operativo",
      autorizaNombre: "CARLOS ANTONIO CANTO SANSORES",
      autorizaCargo: "Director General",
    },
  };

  const outputDir = path.join(process.cwd(), "dist_report");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pdfBytes = await renderLabsicoReportPdf(sampleData);
  const outputPath = path.join(outputDir, "Informe_LABSICO_MC-LBS-CC-IE_Demo.pdf");
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`[SUCCESS] PDF generado exitosamente: ${outputPath} (${pdfBytes.byteLength} bytes)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
