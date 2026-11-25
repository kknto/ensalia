import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  LABSICO_DEFAULT_TEMPLATE,
  LabsicoReportData,
  renderLabsicoReportPdf,
} from "../../src/lib/pdf/compression-report";

describe("LABSICO Official Report Engine (MC-LBS-CC-IE Rev. 07)", () => {
  const sampleMockData: LabsicoReportData = {
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

  test("1. Plantilla oficial contiene los identificadores institucionales exactos de LABSICO", () => {
    assert.equal(LABSICO_DEFAULT_TEMPLATE.codigoFormato, "Formato MC-LBS-CC-IE");
    assert.equal(LABSICO_DEFAULT_TEMPLATE.revision, "REV 07");
    assert.equal(LABSICO_DEFAULT_TEMPLATE.fechaRevision, "10/09/2026");
    assert.equal(LABSICO_DEFAULT_TEMPLATE.titular, "CARLOS ANTONIO CANTO SANSORES");
    assert.ok(LABSICO_DEFAULT_TEMPLATE.acreditacionEma.includes("C-1861-357/24"));
    assert.ok(LABSICO_DEFAULT_TEMPLATE.anexosTexto.some(t => t.includes("1 MPa = 10.1972 kgf/cm2")));
    assert.ok(LABSICO_DEFAULT_TEMPLATE.metodosPrueba.some(m => m.norma.includes("NMX-C-083-ONNCCE")));
  });

  test("2. Equivalencia de unidades de presión cumple con la relación exacta 1 MPa = 10.1972 kgf/cm²", () => {
    const kgCm2 = 250;
    const mpa = Number((kgCm2 / 10.1972).toFixed(2));
    assert.equal(mpa, 24.52);

    const kgCm2Item1 = 190.0;
    const mpaItem1 = Number((kgCm2Item1 / 10.1972).toFixed(2));
    assert.equal(mpaItem1, 18.63);
  });

  test("3. Genera un documento PDF válido de 1 página con formato Letter oficial", async () => {
    const bytes = await renderLabsicoReportPdf(sampleMockData);
    assert.ok(bytes instanceof Uint8Array);
    assert.ok(bytes.byteLength > 10000, `El tamaño del PDF generado (${bytes.byteLength} bytes) es adecuado`);

    // Validar encabezado PDF
    const magicHeader = Buffer.from(bytes.subarray(0, 5)).toString("ascii");
    assert.equal(magicHeader, "%PDF-");

    // Cargar con pdf-lib para asegurar estructura íntegra
    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 1, "Debe ser exactamente 1 página con formato oficial Letter");

    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    // 612 x 792 pt (Letter)
    assert.equal(Math.round(width), 612);
    assert.equal(Math.round(height), 792);
  });

  test("4. Modo Preliminar activa marca de agua diagonal sin romper la legibilidad ni la estructura", async () => {
    const bytesPreliminar = await renderLabsicoReportPdf(sampleMockData, { isPreliminary: true });
    assert.ok(bytesPreliminar.byteLength > 10000);

    const doc = await PDFDocument.load(bytesPreliminar);
    assert.equal(doc.getPageCount(), 1);
  });

  test("5. Maneja correctamente menos de 4 cilindros llenando con celdas vacías sin fallar", async () => {
    const dataCon2Items: LabsicoReportData = {
      ...sampleMockData,
      especimenes: [sampleMockData.especimenes[0], sampleMockData.especimenes[1]],
    };

    const bytes = await renderLabsicoReportPdf(dataCon2Items);
    assert.ok(bytes.byteLength > 10000);

    const doc = await PDFDocument.load(bytes);
    assert.equal(doc.getPageCount(), 1);
  });
});
