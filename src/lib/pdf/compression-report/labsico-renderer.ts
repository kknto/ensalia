/**
 * RENDERIZADOR DEL INFORME OFICIAL DE ENSAYES A COMPRESIÓN LABSICO
 * ---------------------------------------------------------------------------
 * Formato Oficial: MC-LBS-CC-IE | REV 07 | Fecha Rev. 10/09/2026
 * Acreditación EMA: No. C-1861-357/24
 *
 * Implementado 100% en memoria con pdf-lib (cero dependencias de Chromium).
 * Genera el documento con cuadrícula milimétrica, gráfica de barras integrada,
 * esquemas vectoriales ASTM C39, marca de agua preliminar y firmas.
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, degrees } from "pdf-lib";
import { LabsicoReportData, LABSICO_DEFAULT_TEMPLATE } from "./labsico-template";
import { generateReportQr } from "./crypto-qr";

export class LabsicoPdfRenderer {
  public static async renderToPdf(
    data: LabsicoReportData,
    options?: { isPreliminary?: boolean }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter: 8.5 x 11 pulgadas a 72 dpi

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

    // Paleta de colores oficial
    const colorBlack = rgb(0, 0, 0);
    const colorWhite = rgb(1, 1, 1);
    const colorGrayLight = rgb(0.92, 0.92, 0.92);
    const colorGrayBorder = rgb(0.2, 0.2, 0.2);
    const colorGrayText = rgb(0.35, 0.35, 0.35);
    const colorRed = rgb(0.85, 0.15, 0.15);
    const colorGreen = rgb(0.08, 0.45, 0.3);

    // Margen general
    const ml = 20;
    const mr = 592;
    const width = mr - ml; // 572 pt

    // ------------------------------------------------------------------------
    // 1. ENCABEZADO PRINCIPAL (y: 775 a 725)
    // ------------------------------------------------------------------------
    let y = 772;

    // Logo texto LABSICO a la izquierda
    drawLabsicoLogo(page, ml + 5, y - 25);

    // Caja central: Titular y Nombre Comercial
    const centerBoxWidth = 330;
    const centerBoxX = ml + 95;
    page.drawRectangle({
      x: centerBoxX,
      y: y - 38,
      width: centerBoxWidth,
      height: 40,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: colorBlack,
      borderWidth: 1,
    });

    drawCenteredText(page, data.header.titular, centerBoxX, centerBoxWidth, y - 12, 11, fontBold, colorBlack);
    drawCenteredText(page, data.header.nombreComercial, centerBoxX, centerBoxWidth, y - 24, 9, fontBold, colorGreen);
    drawCenteredText(page, data.header.tituloReporte, centerBoxX, centerBoxWidth, y - 35, 8.5, fontBold, colorBlack);

    // Caja derecha: Código de formato y Sistema
    const rightBoxX = centerBoxX + centerBoxWidth + 6;
    const rightBoxWidth = mr - rightBoxX;
    page.drawRectangle({
      x: rightBoxX,
      y: y - 38,
      width: rightBoxWidth,
      height: 40,
      color: colorWhite,
      borderColor: colorBlack,
      borderWidth: 1,
    });

    page.drawRectangle({
      x: rightBoxX,
      y: y - 13,
      width: rightBoxWidth,
      height: 15,
      color: colorBlack,
    });
    drawCenteredText(page, data.header.codigoFormato, rightBoxX, rightBoxWidth, y - 10, 7.5, fontBold, colorWhite);

    drawCenteredText(page, `${data.header.revision}`, rightBoxX, rightBoxWidth, y - 22, 7, fontBold, colorBlack);
    drawCenteredText(page, `Fecha de Rev. ${data.header.fechaRevision}`, rightBoxX, rightBoxWidth, y - 29, 6.5, fontRegular, colorBlack);

    page.drawRectangle({
      x: rightBoxX,
      y: y - 38,
      width: rightBoxWidth,
      height: 9,
      color: rgb(0.88, 0.92, 0.98),
      borderColor: colorBlack,
      borderWidth: 0.5,
    });
    drawCenteredText(page, `Sistema: ${data.header.sistemaFolio}`, rightBoxX, rightBoxWidth, y - 36, 7, fontBold, rgb(0.1, 0.3, 0.7));

    y -= 46;

    // ------------------------------------------------------------------------
    // 2. TRES BLOQUES DE METADATOS (Identificación, Información, Resultados)
    // ------------------------------------------------------------------------
    const colWidth = (width - 8) / 3; // ~188 pt cada una
    const metaBoxHeight = 100;
    const metaTopY = y;

    // Columna 1: Identificación del Cliente
    drawMetadataBox(page, ml, metaTopY, colWidth, metaBoxHeight, "Identificación del Cliente", [
      { k: "Muestra:", v: data.cliente.muestra, bold: true },
      { k: "Reporte:", v: data.cliente.reporte },
      { k: "Remisión:", v: data.cliente.remision },
      { k: "Fecha de muestreo:", v: data.cliente.fechaMuestreo },
      { k: "Cliente:", v: data.cliente.cliente },
      { k: "Dirección:", v: data.cliente.direccion },
      { k: "Procedencia:", v: data.cliente.procedencia },
      { k: "Elaboración:", v: data.cliente.elaboracion },
      { k: "Obra:", v: data.cliente.obra },
    ], fontRegular, fontBold);

    // Columna 2: Información General
    drawMetadataBox(page, ml + colWidth + 4, metaTopY, colWidth, metaBoxHeight, "Información General", [
      { k: "Tipo:", v: data.general.tipoEspecimen },
      { k: "Curado:", v: data.general.curado },
      { k: "°C - Tanque:", v: data.general.tempTanqueC },
      { k: "f'c Proyecto:", v: data.general.fcProyectoKgCm2, bold: true },
      { k: "Revenimiento:", v: data.general.revenimientoDiseno },
      { k: "Elemento:", v: data.general.elemento },
      { k: "Volumen:", v: data.general.volumenM3 },
      { k: "Concretera:", v: data.general.concretera },
      { k: "Cemento:", v: data.general.cemento },
      { k: "No. Camión:", v: data.general.noCamion },
      { k: "Factor de Corrección:", v: data.general.factorCorreccion },
    ], fontRegular, fontBold);

    // Columna 3: Resultados Obtenidos en Sitio
    drawMetadataBox(page, ml + (colWidth * 2) + 8, metaTopY, colWidth, metaBoxHeight, "Resultados Obtenidos en Sitio", [
      { k: "Revenimiento:", v: data.sitio.revenimientoObtenido },
      { k: "°C - Concreto:", v: data.sitio.tempConcretoC },
      { k: "°C - Ambiente:", v: data.sitio.tempAmbienteC },
      { k: "Hora Muestra:", v: data.sitio.horaMuestra },
      { k: "TMA:", v: data.sitio.tma },
      { k: "Edad Garantia:", v: data.sitio.edadGarantia },
      { k: "Especificación:", v: data.sitio.especificacion },
      { k: "Vibrado:", v: data.sitio.vibrado },
    ], fontRegular, fontBold);

    y -= (metaBoxHeight + 6);

    // ------------------------------------------------------------------------
    // 3. TABLA TRANSPUESTA DE PARÁMETROS VS ITEMS + GRÁFICA DE BARRAS
    // ------------------------------------------------------------------------
    const tableTopY = y;
    const tableWidth = 380;
    const chartWidth = width - tableWidth - 4; // ~188 pt
    const tableHeight = 145;

    drawTransposedSpecimenTable(page, ml, tableTopY, tableWidth, tableHeight, data.especimenes, fontRegular, fontBold);
    drawResistanceBarChart(page, ml + tableWidth + 4, tableTopY, chartWidth, tableHeight, data.especimenes, data.general.fcProyectoKgCm2, fontRegular, fontBold);

    // ------------------------------------------------------------------------
    // 4. MARCA DE AGUA CONDICIONAL "PRELIMINAR"
    // ------------------------------------------------------------------------
    if (data.esPreliminar) {
      page.drawText("PRELIMINAR", {
        x: ml + 110,
        y: tableTopY - 70,
        size: 58,
        font: fontBold,
        color: rgb(0.85, 0.2, 0.2),
        opacity: 0.16,
        rotate: degrees(32),
      });
    }

    y -= (tableHeight + 6);

    // ------------------------------------------------------------------------
    // 5. UBICACIÓN, OBSERVACIONES, ESQUEMA DE FALLAS Y ANEXOS (y: ~475 a 365)
    // ------------------------------------------------------------------------
    const sectionMidHeight = 90;
    const secBoxY = y;
    const w1 = 180;
    const w2 = 175;
    const w3 = width - w1 - w2 - 8;

    // Caja 1: Ubicación del Elemento y Observaciones
    drawNotesBox(page, ml, secBoxY, w1, sectionMidHeight, data.ubicacionElemento, data.observaciones, fontRegular, fontBold);

    // Caja 2: Esquema de Fallas Típicas
    const fallasUsadas = data.especimenes.filter(e => e.estaEnsayado).map(e => e.tipoFallaNumero);
    const fallaPrincipal = fallasUsadas.length > 0 ? fallasUsadas[fallasUsadas.length - 1] : 1;
    drawFractureSchemesBox(page, ml + w1 + 4, secBoxY, w2, sectionMidHeight, fallaPrincipal, fontRegular, fontBold);

    // Caja 3: Anexos y Normas Técnicas
    drawAnnexesBox(page, ml + w1 + w2 + 8, secBoxY, w3, sectionMidHeight, LABSICO_DEFAULT_TEMPLATE.anexosTexto, fontRegular, fontBold);

    y -= (sectionMidHeight + 6);

    // ------------------------------------------------------------------------
    // 6. MÉTODOS DE PRUEBA (y: ~360 a 305)
    // ------------------------------------------------------------------------
    const metodosHeight = 46;
    drawTestMethodsBox(page, ml, y, width, metodosHeight, LABSICO_DEFAULT_TEMPLATE.metodosPrueba, fontRegular, fontBold);

    y -= (metodosHeight + 6);

    // ------------------------------------------------------------------------
    // 7. FIRMAS TRIPARTITAS Y CÓDIGO QR OFFLINE (y: ~300 a 200)
    // ------------------------------------------------------------------------
    const signaturesHeight = 72;

    // Generar código QR offline con SHA-256 canónico
    let qrPngBytes: Uint8Array | null = null;
    try {
      const qrRes = await generateReportQr({
        folio: data.cliente.reporte || "00000",
        idMuestra: data.cliente.muestra || "M-00",
        cliente: data.cliente.cliente || "CLIENTE",
        obra: data.cliente.obra || "OBRA",
        elemento: data.general.elemento || "ELEMENTO",
        fechaColadoUtc: new Date().toISOString(),
        fcDisenoKgCm2: parseFloat(data.general.fcProyectoKgCm2) || 250,
        edadGarantiaDias: parseInt(data.sitio.edadGarantia) || 28,
        fechaEmisionUtc: new Date().toISOString(),
        especimenes: data.especimenes.filter(e => e.estaEnsayado).map(e => ({
          numero: e.itemNumero,
          edadRealDias: e.edadDias,
          cargaMaximaKg: e.cargaMaximaKg,
          resistenciaKgCm2: e.fcCorregidaKgCm2,
          porcentajeFc: e.porcentajeFc,
          tipoFalla: e.tipoFallaTexto,
          factorLd: e.factorLd,
        })),
        prensaCodigoInterno: "PRENSA-LABSICO-01",
        operadorNombre: data.firmas.ensayaNombre,
        signatarioNombre: data.firmas.revisaNombre,
      });
      qrPngBytes = qrRes.qrPngBytes;
    } catch {
      // Continuar si falla generación QR
    }

    let qrImage = null;
    if (qrPngBytes) {
      qrImage = await pdfDoc.embedPng(qrPngBytes);
    }

    drawSignaturesSection(page, ml, y, width, signaturesHeight, data.firmas, qrImage, fontRegular, fontBold);

    y -= (signaturesHeight + 4);

    // Franja de Acreditación EMA
    page.drawRectangle({
      x: ml,
      y: y - 12,
      width,
      height: 12,
      color: colorBlack,
    });
    drawCenteredText(page, LABSICO_DEFAULT_TEMPLATE.acreditacionEma, ml, width, y - 9, 6.5, fontBold, colorWhite);

    y -= 16;

    // ------------------------------------------------------------------------
    // 8. PIE DE PÁGINA INSTITUCIONAL CON LOGOS Y CONTACTO
    // ------------------------------------------------------------------------
    drawInstitutionalFooter(page, ml, y, width, data.fechaElaboracionInforme, fontRegular, fontBold, fontMono);

    // Marca de agua si es preliminar
    const esPreliminar = data.esPreliminar || options?.isPreliminary;
    if (esPreliminar) {
      page.drawText("PRELIMINAR", {
        x: 140,
        y: 280,
        size: 64,
        font: fontBold,
        color: rgb(0.85, 0.2, 0.2),
        opacity: 0.16,
        rotate: degrees(42),
      });
    }

    return await pdfDoc.save();
  }
}

/**
 * Función de conveniencia para renderizar el informe LABSICO directamente a Uint8Array
 */
export async function renderLabsicoReportPdf(
  data: LabsicoReportData,
  options?: { isPreliminary?: boolean }
): Promise<Uint8Array> {
  return LabsicoPdfRenderer.renderToPdf(data, options);
}

// ============================================================================
// FUNCIONES AUXILIARES DE RENDERIZADO GRÁFICO Y TABULAR
// ============================================================================

function drawCenteredText(page: PDFPage, text: string, x: number, width: number, y: number, size: number, font: PDFFont, color: any) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: x + (width - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawLabsicoLogo(page: PDFPage, x: number, y: number) {
  // Isotipo triangular estilizado de LABSICO (3 barras diagonales rojas)
  page.drawLine({ start: { x: x + 2, y: y + 2 }, end: { x: x + 16, y: y + 28 }, thickness: 3.5, color: rgb(0.85, 0.15, 0.15) });
  page.drawLine({ start: { x: x + 9, y: y + 2 }, end: { x: x + 23, y: y + 28 }, thickness: 3.5, color: rgb(0.85, 0.15, 0.15) });
  page.drawLine({ start: { x: x + 16, y: y + 2 }, end: { x: x + 30, y: y + 28 }, thickness: 3.5, color: rgb(0.85, 0.15, 0.15) });

  // Texto "LABSICO" debajo
  page.drawText("LABSICO", {
    x: x - 4,
    y: y - 8,
    size: 9.5,
    font: undefined as any,
    color: rgb(0.1, 0.4, 0.28),
  });
}

function drawMetadataBox(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  title: string,
  rows: Array<{ k: string; v: string; bold?: boolean }>,
  fontReg: PDFFont,
  fontBold: PDFFont
) {
  // Borde exterior
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Barra de título negro
  page.drawRectangle({
    x,
    y: topY - 14,
    width: w,
    height: 14,
    color: rgb(0, 0, 0),
  });
  drawCenteredText(page, title, x, w, topY - 10.5, 7.5, fontBold, rgb(1, 1, 1));

  // Filas
  const rowHeight = (h - 14) / rows.length;
  let currY = topY - 14;

  rows.forEach((row, i) => {
    currY -= rowHeight;
    // Línea divisoria suave
    if (i > 0) {
      page.drawLine({
        start: { x, y: currY + rowHeight },
        end: { x: x + w, y: currY + rowHeight },
        thickness: 0.4,
        color: rgb(0.8, 0.8, 0.8),
      });
    }

    // Clave
    page.drawText(row.k, {
      x: x + 4,
      y: currY + 2.5,
      size: 6.2,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Valor recortado a la derecha
    const valText = String(row.v || "---");
    page.drawText(valText.length > 26 ? valText.slice(0, 25) + "…" : valText, {
      x: x + (w * 0.46),
      y: currY + 2.5,
      size: 6.2,
      font: row.bold ? fontBold : fontReg,
      color: row.bold ? rgb(0.08, 0.45, 0.3) : rgb(0.2, 0.2, 0.2),
    });
  });
}

function drawTransposedSpecimenTable(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  especimenes: any[],
  fontReg: PDFFont,
  fontBold: PDFFont
) {
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  const numItems = Math.max(4, especimenes.length);
  const paramColW = 95;
  const itemColW = (w - paramColW) / numItems;

  const rowLabels = [
    "Altura",
    "Diametro",
    "Area",
    "Fecha Ensaye",
    "Edad",
    "Carga Máxima",
    "Factor",
    "F'C Obtenida",
    "F'C Corregida",
    "*F'C MPa",
    "% Resistencia",
    "Falla",
  ];

  const rowHeight = (h - 15) / rowLabels.length;

  // Header de la tabla
  page.drawRectangle({
    x,
    y: topY - 15,
    width: w,
    height: 15,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText("Parámetros", {
    x: x + 8,
    y: topY - 11,
    size: 7.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  for (let i = 0; i < numItems; i++) {
    const colX = x + paramColW + i * itemColW;
    drawCenteredText(page, `Item ${i + 1}`, colX, itemColW, topY - 11, 7.5, fontBold, rgb(1, 1, 1));
  }

  // Filas de datos
  let currY = topY - 15;
  rowLabels.forEach((label, rIdx) => {
    currY -= rowHeight;
    const isEven = rIdx % 2 === 0;

    // Fondo alternado
    page.drawRectangle({
      x,
      y: currY,
      width: w,
      height: rowHeight,
      color: isEven ? rgb(0.97, 0.97, 0.97) : rgb(1, 1, 1),
    });

    // Línea horizontal
    page.drawLine({
      start: { x, y: currY + rowHeight },
      end: { x: x + w, y: currY + rowHeight },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Etiqueta del parámetro
    page.drawText(label, {
      x: x + 6,
      y: currY + 2.5,
      size: 6.5,
      font: label.includes("F'C") ? fontBold : fontReg,
      color: label.includes("F'C") ? rgb(0.08, 0.45, 0.3) : rgb(0.1, 0.1, 0.1),
    });

    // Valores por Item
    for (let c = 0; c < numItems; c++) {
      const esp = especimenes[c];
      const colX = x + paramColW + c * itemColW;

      let val = "---";
      let isHighlight = false;

      if (esp) {
        switch (label) {
          case "Altura": val = esp.alturaCm > 0 ? `${esp.alturaCm.toFixed(2)} cm` : "---"; break;
          case "Diametro": val = esp.diametroCm > 0 ? `${esp.diametroCm.toFixed(2)} cm` : "---"; break;
          case "Area": val = esp.areaCm2 > 0 ? `${esp.areaCm2.toFixed(2)} cm²` : "---"; break;
          case "Fecha Ensaye": val = esp.fechaEnsaye || "---"; break;
          case "Edad": val = esp.edadDias ? `${esp.edadDias} días` : "---"; break;
          case "Carga Máxima": val = esp.cargaMaximaKg > 0 ? `${Math.round(esp.cargaMaximaKg)} kg` : "---"; break;
          case "Factor": val = esp.estaEnsayado && esp.factorLd > 0 ? esp.factorLd.toFixed(2) : "---"; break;
          case "F'C Obtenida": val = esp.fcObtenidaKgCm2 > 0 ? `${Math.round(esp.fcObtenidaKgCm2)} kg/cm²` : "---"; break;
          case "F'C Corregida":
            val = esp.fcCorregidaKgCm2 > 0 ? `${Math.round(esp.fcCorregidaKgCm2)} kg/cm²` : "---";
            isHighlight = esp.fcCorregidaKgCm2 > 0;
            break;
          case "*F'C MPa": val = esp.fcMpa > 0 ? `${esp.fcMpa.toFixed(1)} MPa` : "---"; break;
          case "% Resistencia": val = esp.porcentajeFc > 0 ? `${esp.porcentajeFc.toFixed(1)}%` : "---"; isHighlight = esp.porcentajeFc > 0; break;
          case "Falla": val = esp.estaEnsayado && esp.tipoFallaNumero > 0 ? `Tipo ${esp.tipoFallaNumero}` : "---"; break;
        }
      }

      drawCenteredText(page, val, colX, itemColW, currY + 2.5, 6.2, isHighlight ? fontBold : fontReg, isHighlight ? rgb(0.85, 0.15, 0.15) : rgb(0.2, 0.2, 0.2));
    }
  });

  // Líneas divisorias verticales
  for (let c = 0; c <= numItems; c++) {
    const lx = c === 0 ? x + paramColW : x + paramColW + c * itemColW;
    page.drawLine({
      start: { x: lx, y: topY },
      end: { x: lx, y: topY - h },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
  }
}

function drawResistanceBarChart(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  especimenes: any[],
  fcProyectoStr: string,
  fontReg: PDFFont,
  fontBold: PDFFont
) {
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // Título "Detalle Gráfico"
  page.drawRectangle({
    x,
    y: topY - 15,
    width: w,
    height: 15,
    color: rgb(0.2, 0.2, 0.2),
  });
  drawCenteredText(page, "Detalle Gráfico", x, w, topY - 11, 7.5, fontBold, rgb(1, 1, 1));

  // Área de gráfica
  const chartMarginL = 36;
  const chartMarginB = 18;
  const chartX = x + chartMarginL;
  const chartY = topY - h + chartMarginB;
  const chartPlotW = w - chartMarginL - 10;
  const chartPlotH = h - 15 - chartMarginB - 8;

  const maxAxisVal = 400; // 0 a 400 kg/cm2
  const steps = [0, 50, 100, 150, 200, 250, 300, 350, 400];

  // Ejes y líneas de cuadrícula
  steps.forEach((val) => {
    const yPos = chartY + (val / maxAxisVal) * chartPlotH;
    page.drawLine({
      start: { x: chartX, y: yPos },
      end: { x: chartX + chartPlotW, y: yPos },
      thickness: 0.3,
      color: rgb(0.85, 0.85, 0.85),
    });

    // Etiquetas eje Y
    const label = `${val} kg/cm²`;
    page.drawText(label, {
      x: x + 2,
      y: yPos - 2.5,
      size: 5.2,
      font: fontReg,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  // Línea de f'c Proyecto (ej. 200)
  const fcNum = parseFloat(fcProyectoStr) || 200;
  const fcY = chartY + (fcNum / maxAxisVal) * chartPlotH;
  page.drawLine({
    start: { x: chartX, y: fcY },
    end: { x: chartX + chartPlotW, y: fcY },
    thickness: 1,
    color: rgb(0.85, 0.15, 0.15),
  });

  // Barras para cada Item
  const numItems = Math.max(4, especimenes.length);
  const barSlotW = chartPlotW / numItems;
  const barW = barSlotW * 0.45;

  for (let i = 0; i < numItems; i++) {
    const esp = especimenes[i];
    const bx = chartX + i * barSlotW + (barSlotW - barW) / 2;
    const resKgCm2 = esp && esp.estaEnsayado ? esp.fcCorregidaKgCm2 : 0;
    const barH = Math.min(chartPlotH, (resKgCm2 / maxAxisVal) * chartPlotH);

    if (barH > 0) {
      const cumple = resKgCm2 >= fcNum;
      page.drawRectangle({
        x: bx,
        y: chartY,
        width: barW,
        height: barH,
        color: cumple ? rgb(0.08, 0.45, 0.3) : rgb(0.85, 0.2, 0.2),
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.5,
      });
    }

    // Etiqueta eje X (1, 2, 3, 4)
    drawCenteredText(page, String(i + 1), chartX + i * barSlotW, barSlotW, chartY - 11, 7, fontBold, rgb(0.2, 0.2, 0.2));
  }
}

function drawNotesBox(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  ubicacion: string,
  observaciones: string,
  fontReg: PDFFont,
  fontBold: PDFFont
) {
  // Ubicación del elemento
  page.drawRectangle({
    x,
    y: topY - 38,
    width: w,
    height: 38,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page.drawRectangle({
    x,
    y: topY - 11,
    width: w,
    height: 11,
    color: rgb(0.2, 0.2, 0.2),
  });
  drawCenteredText(page, "Ubicación del Elemento:", x, w, topY - 8.5, 6.5, fontBold, rgb(1, 1, 1));

  page.drawText(ubicacion || "Castillos, Mza 23, 17, 22", {
    x: x + 6,
    y: topY - 26,
    size: 7.5,
    font: fontBold,
    color: rgb(0.15, 0.35, 0.65),
  });

  // Observaciones
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h - 42,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page.drawRectangle({
    x,
    y: topY - 53,
    width: w,
    height: 11,
    color: rgb(0.2, 0.2, 0.2),
  });
  drawCenteredText(page, "Observaciones", x, w, topY - 50.5, 6.5, fontBold, rgb(1, 1, 1));

  page.drawText(observaciones || "Concreto Normal", {
    x: x + 6,
    y: topY - 70,
    size: 7.5,
    font: fontBold,
    color: rgb(0.15, 0.35, 0.65),
  });
}

function drawFractureSchemesBox(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  fallaSeleccionada: number,
  fontReg: PDFFont,
  fontBold: PDFFont
) {
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page.drawRectangle({
    x,
    y: topY - 11,
    width: w,
    height: 11,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  drawCenteredText(page, "Esquema de Fallas Típicas", x, w, topY - 8.5, 7, fontBold, rgb(0, 0, 0));

  // Cuadrícula 2 filas x 3 columnas
  const cellW = w / 3;
  const cellH = (h - 11) / 2;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const typeNum = row * 3 + col + 1;
      const cx = x + col * cellW;
      const cy = topY - 11 - (row + 1) * cellH;

      page.drawRectangle({
        x: cx,
        y: cy,
        width: cellW,
        height: cellH,
        color: typeNum === fallaSeleccionada ? rgb(0.9, 0.96, 0.92) : rgb(1, 1, 1),
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 0.5,
      });

      page.drawText(`Tipo ${typeNum}`, {
        x: cx + 4,
        y: cy + cellH - 7,
        size: 5.5,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      // Dibujo esquemático vectorial del cilindro y fisuras
      const cylX = cx + cellW / 2 - 7;
      const cylY = cy + 4;
      page.drawRectangle({
        x: cylX,
        y: cylY,
        width: 14,
        height: cellH - 12,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 0.6,
      });

      // Fisuras rojas según tipo
      if (typeNum === 1) {
        // Conos
        page.drawLine({ start: { x: cylX, y: cylY + cellH - 12 }, end: { x: cylX + 7, y: cylY + 12 }, thickness: 0.7, color: rgb(0.85, 0.15, 0.15) });
        page.drawLine({ start: { x: cylX + 14, y: cylY + cellH - 12 }, end: { x: cylX + 7, y: cylY + 12 }, thickness: 0.7, color: rgb(0.85, 0.15, 0.15) });
      } else if (typeNum === 2) {
        // Hendidura y cono
        page.drawLine({ start: { x: cylX + 7, y: cylY + cellH - 12 }, end: { x: cylX + 7, y: cylY + 10 }, thickness: 0.7, color: rgb(0.85, 0.15, 0.15) });
        page.drawLine({ start: { x: cylX, y: cylY }, end: { x: cylX + 7, y: cylY + 10 }, thickness: 0.7, color: rgb(0.85, 0.15, 0.15) });
      } else if (typeNum === 3) {
        // Columnar
        page.drawLine({ start: { x: cylX + 4, y: cylY }, end: { x: cylX + 4, y: cylY + cellH - 12 }, thickness: 0.7, color: rgb(0.85, 0.15, 0.15) });
        page.drawLine({ start: { x: cylX + 10, y: cylY }, end: { x: cylX + 10, y: cylY + cellH - 12 }, thickness: 0.7, color: rgb(0.85, 0.15, 0.15) });
      } else if (typeNum === 4) {
        // Cizalla
        page.drawLine({ start: { x: cylX + 2, y: cylY + cellH - 12 }, end: { x: cylX + 12, y: cylY }, thickness: 0.7, color: rgb(0.85, 0.15, 0.15) });
      }

      // Si es la falla seleccionada, marcar con cruz/check
      if (typeNum === fallaSeleccionada) {
        page.drawLine({ start: { x: cylX - 2, y: cylY - 2 }, end: { x: cylX + 16, y: cylY + cellH - 10 }, thickness: 0.8, color: rgb(0.1, 0.45, 0.25) });
        page.drawLine({ start: { x: cylX - 2, y: cylY + cellH - 10 }, end: { x: cylX + 16, y: cylY - 2 }, thickness: 0.8, color: rgb(0.1, 0.45, 0.25) });
      }
    }
  }
}

function drawAnnexesBox(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  anexos: string[],
  fontReg: PDFFont,
  fontBold: PDFFont
) {
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page.drawRectangle({
    x,
    y: topY - 11,
    width: w,
    height: 11,
    color: rgb(0.85, 0.85, 0.85),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  drawCenteredText(page, "Anexos", x, w, topY - 8.5, 7, fontBold, rgb(0, 0, 0));

  let ay = topY - 22;
  anexos.forEach((line) => {
    page.drawText(line, {
      x: x + 5,
      y: ay,
      size: 5.6,
      font: line.startsWith("*") ? fontBold : fontReg,
      color: line.startsWith("*") ? rgb(0.08, 0.45, 0.3) : rgb(0.1, 0.1, 0.1),
    });
    ay -= 11.5;
  });
}

function drawTestMethodsBox(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  metodos: Array<{ norma: string; titulo: string }>,
  fontReg: PDFFont,
  fontBold: PDFFont
) {
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page.drawRectangle({
    x,
    y: topY - 11,
    width: w,
    height: 11,
    color: rgb(0, 0, 0),
  });
  drawCenteredText(page, "Metodos de Prueba", x, w, topY - 8.5, 7, fontBold, rgb(1, 1, 1));

  const half = Math.ceil(metodos.length / 2);
  const col1 = metodos.slice(0, half);
  const col2 = metodos.slice(half);
  const colW = w / 2;

  let y1 = topY - 21;
  col1.forEach((m) => {
    page.drawText(m.norma, { x: x + 6, y: y1, size: 5.8, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText(m.titulo, { x: x + 90, y: y1, size: 5.8, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    y1 -= 10;
  });

  let y2 = topY - 21;
  col2.forEach((m) => {
    page.drawText(m.norma, { x: x + colW + 6, y: y2, size: 5.8, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText(m.titulo, { x: x + colW + 90, y: y2, size: 5.8, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
    y2 -= 10;
  });

  // Línea divisoria central
  page.drawLine({
    start: { x: x + colW, y: topY - 11 },
    end: { x: x + colW, y: topY - h },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
}

function drawSignaturesSection(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  h: number,
  firmas: any,
  qrImage: any,
  fontReg: PDFFont,
  fontBold: PDFFont
) {
  // Borde exterior
  page.drawRectangle({
    x,
    y: topY - h,
    width: w,
    height: h,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  const qrBoxW = 60;
  const sigAreaW = w - qrBoxW;
  const sigColW = sigAreaW / 3;

  const roles = [
    { label: "Ensaya", cargo: firmas.ensayaCargo, nombre: firmas.ensayaNombre },
    { label: "Revisó", cargo: firmas.revisaCargo, nombre: firmas.revisaNombre },
    { label: "Autorizó", cargo: firmas.autorizaCargo, nombre: firmas.autorizaNombre },
  ];

  roles.forEach((r, idx) => {
    const colX = x + idx * sigColW;

    // Encabezado del rol (ej. "Ensaya")
    page.drawRectangle({
      x: colX,
      y: topY - 11,
      width: sigColW,
      height: 11,
      color: rgb(0.85, 0.85, 0.85),
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 0.5,
    });
    drawCenteredText(page, r.label, colX, sigColW, topY - 8.5, 7, fontBold, rgb(0, 0, 0));

    // Línea de firma
    page.drawLine({
      start: { x: colX + 12, y: topY - 48 },
      end: { x: colX + sigColW - 12, y: topY - 48 },
      thickness: 0.6,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Cargo y nombre
    drawCenteredText(page, r.cargo, colX, sigColW, topY - 58, 5.8, fontBold, rgb(0.1, 0.1, 0.1));
    drawCenteredText(page, r.nombre || "(nombre y firma)", colX, sigColW, topY - 67, 5.5, fontReg, rgb(0.3, 0.3, 0.3));

    // Divisor vertical
    page.drawLine({
      start: { x: colX + sigColW, y: topY },
      end: { x: colX + sigColW, y: topY - h },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
  });

  // Código QR en caja lateral
  const qrX = x + sigAreaW;
  if (qrImage) {
    page.drawImage(qrImage, {
      x: qrX + 4,
      y: topY - h + 6,
      width: qrBoxW - 8,
      height: qrBoxW - 8,
    });
  }
}

function drawInstitutionalFooter(
  page: PDFPage,
  x: number,
  topY: number,
  w: number,
  fechaElab: string,
  fontReg: PDFFont,
  fontBold: PDFFont,
  fontMono: PDFFont
) {
  // Fecha elaboración del informe
  page.drawRectangle({
    x: x + w - 210,
    y: topY - 12,
    width: 210,
    height: 12,
    color: rgb(0.88, 0.92, 0.98),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.6,
  });
  page.drawText("Fecha elaboración del informe", { x: x + w - 204, y: topY - 9, size: 6.2, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText(fechaElab || "03/11/2026", { x: x + w - 75, y: topY - 9, size: 6.5, font: fontBold, color: rgb(0.1, 0.3, 0.7) });

  // Logos de Acreditación (EMA y FEMIAC)
  const logoY = topY - 38;

  // Sello EMA
  page.drawRectangle({ x, y: logoY, width: 90, height: 22, color: rgb(0.96, 0.96, 0.96), borderColor: rgb(0.1, 0.6, 0.4), borderWidth: 1 });
  page.drawText("ema", { x: x + 8, y: logoY + 6, size: 13, font: fontBold, color: rgb(0.1, 0.6, 0.4) });
  page.drawText("LABORATORIO ACREDITADO", { x: x + 38, y: logoY + 12, size: 3.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText("C-1861-357/24", { x: x + 38, y: logoY + 5, size: 4.8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  // Sello FEMIAC
  page.drawRectangle({ x: x + 95, y: logoY, width: 70, height: 22, color: rgb(0.96, 0.96, 0.96), borderColor: rgb(0.85, 0.5, 0.1), borderWidth: 1 });
  page.drawText("FEMIAC", { x: x + 104, y: logoY + 6, size: 10, font: fontBold, color: rgb(0.85, 0.5, 0.1) });

  // Datos de Contacto (Dirección, Teléfono, Web)
  page.drawText("SM. 99, MZA. 58, LT. 21 Calle 6, Cancun, Quintana Roo, CP 77536", { x: x + 172, y: logoY + 14, size: 5.5, font: fontReg, color: rgb(0.2, 0.2, 0.2) });
  page.drawText("Tel: 998 604 4075 / 984 309 3578 | www.labsico.mx | contacto@labsico.mx", { x: x + 172, y: logoY + 5, size: 5.5, font: fontBold, color: rgb(0.08, 0.45, 0.3) });

  // Procedimiento de quejas y paginación
  page.drawText("Labsico, cuenta con un procedimiento de quejas, solicitar en el momento que lo requiera.", {
    x,
    y: logoY - 12,
    size: 5.2,
    font: fontReg,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText("Página 1 de 1", {
    x: x + w - 50,
    y: logoY - 12,
    size: 6,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
}
