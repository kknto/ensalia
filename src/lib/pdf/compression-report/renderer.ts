import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import { CompressionReportData, CanonicalCompressionPayload, EspecimenCalculado } from "./types";
import { drawFractureVectorDiagram, getFractureInfo } from "./fracture-drawings";
import { generateReportQr } from "./crypto-qr";

export interface RenderPdfOptions {
  watermarkText?: string;
  isDraft?: boolean;
}

function truncateText(font: PDFFont, text: string, maxWidth: number, fontSize: number): string {
  if (!text) return "";
  let clean = text.replace(/[\r\n\t]/g, " ").trim();
  if (font.widthOfTextAtSize(clean, fontSize) <= maxWidth) return clean;
  while (clean.length > 3 && font.widthOfTextAtSize(clean + "...", fontSize) > maxWidth) {
    clean = clean.slice(0, -1);
  }
  return clean + "...";
}

function formatDateDmy(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatDateTime(date: Date): string {
  const dmy = formatDateDmy(date);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${dmy} ${hh}:${mm} h`;
}

export async function renderCompressionReportPdf(
  data: CompressionReportData,
  options: RenderPdfOptions = {}
): Promise<Uint8Array> {
  // 1. Crear documento Letter (612 x 792 pt)
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);

  // Tipografías estándar embebidas sin dependencias externas
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // Paleta de colores institucionales
  const colPrimary = rgb(0.06, 0.09, 0.16);     // #0F172A Pizarra corporativa
  const colAccent = rgb(0.09, 0.45, 0.30);      // #16734C Verde ingeniería
  const colAccentLight = rgb(0.93, 0.97, 0.95);
  const colBorder = rgb(0.75, 0.80, 0.85);
  const colBorderDark = rgb(0.35, 0.40, 0.45);
  const colZebra = rgb(0.97, 0.98, 0.99);
  const colText = rgb(0.08, 0.11, 0.15);
  const colMuted = rgb(0.40, 0.45, 0.50);
  const colAlert = rgb(0.85, 0.15, 0.15);
  const colSuccess = rgb(0.09, 0.50, 0.25);

  const marginX = 30;
  const contentWidth = 552; // 612 - 60

  // 2. Preparar payload canónico y generar QR offline
  const canonicalPayload: CanonicalCompressionPayload = {
    folio: data.folio,
    idMuestra: data.muestreo.idMuestra,
    cliente: data.proyecto.cliente,
    obra: data.proyecto.obra,
    elemento: data.proyecto.elemento,
    fechaColadoUtc: data.muestreo.fechaHoraMuestreo.toISOString(),
    fcDisenoKgCm2: data.mezcla.fcDisenoKgCm2,
    edadGarantiaDias: data.mezcla.edadGarantiaDias,
    fechaEmisionUtc: data.fechaEmision.toISOString(),
    especimenes: data.especimenes.map((e) => ({
      numero: e.numero,
      edadRealDias: e.edadRealDias,
      cargaMaximaKg: e.cargaMaximaKg,
      resistenciaKgCm2: e.resistenciaCorregidaKgCm2,
      porcentajeFc: e.porcentajeFc ?? null,
      tipoFalla: e.tipoFalla,
      factorLd: e.factorLd,
    })),
    prensaCodigoInterno: data.metadatos?.prensaCodigoInterno || "PRENSA-01",
    operadorNombre: data.firmas.operadorNombre,
    signatarioNombre: data.firmas.signatarioNombre,
  };

  const qrResult = await generateReportQr(
    canonicalPayload,
    data.metadatos?.urlVerificacionBase || "http://localhost:3000"
  );
  const qrImage = await doc.embedPng(qrResult.qrPngBytes);

  // Logo de laboratorio opcional
  let logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (data.laboratorio.logoBytes && data.laboratorio.logoBytes.length > 0) {
    try {
      if (data.laboratorio.logoMimeType === "image/jpeg") {
        logoImage = await doc.embedJpg(data.laboratorio.logoBytes);
      } else {
        logoImage = await doc.embedPng(data.laboratorio.logoBytes);
      }
    } catch {
      logoImage = null;
    }
  }

  // Firmas biométricas opcionales
  let operadorFirmaImg: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (data.firmas.operadorFirmaPng && data.firmas.operadorFirmaPng.length > 0) {
    try {
      operadorFirmaImg = await doc.embedPng(data.firmas.operadorFirmaPng);
    } catch {
      operadorFirmaImg = null;
    }
  }

  let signatarioFirmaImg: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (data.firmas.signatarioFirmaPng && data.firmas.signatarioFirmaPng.length > 0) {
    try {
      signatarioFirmaImg = await doc.embedPng(data.firmas.signatarioFirmaPng);
    } catch {
      signatarioFirmaImg = null;
    }
  }

  // Foto de rotura de espécimen (tomamos la primera probeta con foto)
  const espConFoto = data.especimenes.find((e) => e.fotoRoturaBytes && e.fotoRoturaBytes.length > 0);
  let fotoRoturaImg: Awaited<ReturnType<PDFDocument["embedJpg"]>> | null = null;
  if (espConFoto && espConFoto.fotoRoturaBytes) {
    try {
      if (espConFoto.fotoRoturaMimeType === "image/png") {
        fotoRoturaImg = await doc.embedPng(espConFoto.fotoRoturaBytes);
      } else {
        fotoRoturaImg = await doc.embedJpg(espConFoto.fotoRoturaBytes);
      }
    } catch {
      fotoRoturaImg = null;
    }
  }

  // =========================================================================
  // BLOQUE 0: ENCABEZADO INSTITUCIONAL (Y = 765 a 715)
  // =========================================================================
  const headerTop = 765;
  const headerHeight = 50;

  // Franja decorativa superior
  page.drawRectangle({
    x: marginX,
    y: headerTop - 2,
    width: contentWidth,
    height: 3,
    color: colAccent,
  });

  let textLeftX = marginX;
  if (logoImage) {
    const maxLogoW = 75;
    const maxLogoH = 40;
    const scale = Math.min(maxLogoW / logoImage.width, maxLogoH / logoImage.height);
    const logoW = logoImage.width * scale;
    const logoH = logoImage.height * scale;
    page.drawImage(logoImage, {
      x: marginX,
      y: headerTop - 10 - logoH,
      width: logoW,
      height: logoH,
    });
    textLeftX = marginX + logoW + 12;
  }

  // Nombre del Laboratorio y Razón Social
  const labNombre = data.laboratorio.nombre || "ENSALIA CONTROL DE CALIDAD";
  page.drawText(truncateText(helveticaBold, labNombre.toUpperCase(), 250, 11), {
    x: textLeftX,
    y: headerTop - 14,
    size: 11,
    font: helveticaBold,
    color: colPrimary,
  });

  const labSub = data.laboratorio.razonSocial || "LABORATORIO DE METROLOGÍA Y ENSAYES DE CONCRETO";
  page.drawText(truncateText(helvetica, labSub, 250, 7), {
    x: textLeftX,
    y: headerTop - 24,
    size: 7,
    font: helvetica,
    color: colMuted,
  });

  const emaText = data.laboratorio.acreditacionEma || "Acreditación EMA No. C-0412-089/22 | Rama Concreto";
  page.drawText(truncateText(helveticaBold, emaText, 250, 6.5), {
    x: textLeftX,
    y: headerTop - 34,
    size: 6.5,
    font: helveticaBold,
    color: colAccent,
  });

  // Caja de Certificado y Folio a la derecha
  const folioBoxW = 180;
  const folioBoxX = marginX + contentWidth - folioBoxW;
  page.drawRectangle({
    x: folioBoxX,
    y: headerTop - 44,
    width: folioBoxW,
    height: 42,
    borderColor: colPrimary,
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1.0),
  });

  page.drawText("CERTIFICADO OFICIAL DE COMPRESIÓN", {
    x: folioBoxX + 6,
    y: headerTop - 14,
    size: 7.5,
    font: helveticaBold,
    color: colPrimary,
  });

  page.drawText(`FOLIO: ${data.folio}`, {
    x: folioBoxX + 6,
    y: headerTop - 25,
    size: 8.5,
    font: helveticaBold,
    color: colAccent,
  });

  page.drawText(`Emisión: ${formatDateDmy(data.fechaEmision)}  |  ASTM C39 / NMX-C-083`, {
    x: folioBoxX + 6,
    y: headerTop - 37,
    size: 6.5,
    font: helvetica,
    color: colMuted,
  });

  // =========================================================================
  // BLOQUE 1: DATOS DEL CLIENTE Y DE LA OBRA (Y = 708 a 652)
  // =========================================================================
  const sec1Top = 708;
  const sec1Height = 52;

  // Fondo y título de sección
  page.drawRectangle({
    x: marginX,
    y: sec1Top - 12,
    width: contentWidth,
    height: 12,
    color: colPrimary,
  });
  page.drawText("1. INFORMACIÓN DEL PROYECTO Y LOCALIZACIÓN", {
    x: marginX + 6,
    y: sec1Top - 9,
    size: 7,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawRectangle({
    x: marginX,
    y: sec1Top - sec1Height,
    width: contentWidth,
    height: sec1Height - 12,
    borderColor: colBorder,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  const row1Y = sec1Top - 23;
  const row2Y = sec1Top - 35;
  const row3Y = sec1Top - 47;

  // Columna 1
  page.drawText("Cliente:", { x: marginX + 6, y: row1Y, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(truncateText(helvetica, data.proyecto.cliente, 210, 7.5), { x: marginX + 50, y: row1Y, size: 7.5, font: helvetica });

  page.drawText("Obra:", { x: marginX + 6, y: row2Y, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(truncateText(helvetica, data.proyecto.obra, 210, 7.5), { x: marginX + 50, y: row2Y, size: 7.5, font: helvetica });

  page.drawText("Elemento:", { x: marginX + 6, y: row3Y, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(truncateText(helveticaBold, data.proyecto.elemento, 210, 7.5), { x: marginX + 50, y: row3Y, size: 7.5, font: helveticaBold, color: colPrimary });

  // Columna 2
  const col2X = marginX + 280;
  page.drawText("Ubicación:", { x: col2X, y: row1Y, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(truncateText(helvetica, data.proyecto.ubicacion || "En obra", 200, 7.5), { x: col2X + 55, y: row1Y, size: 7.5, font: helvetica });

  page.drawText("Contratista:", { x: col2X, y: row2Y, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(truncateText(helvetica, data.proyecto.contratista || "No especificado", 200, 7.5), { x: col2X + 55, y: row2Y, size: 7.5, font: helvetica });

  // =========================================================================
  // BLOQUE 2: ESPECIFICACIÓN DEL CONCRETO Y MUESTREO (Y = 648 a 586)
  // =========================================================================
  const sec2Top = 648;
  const sec2Height = 60;

  page.drawRectangle({
    x: marginX,
    y: sec2Top - 12,
    width: contentWidth,
    height: 12,
    color: colPrimary,
  });
  page.drawText("2. ESPECIFICACIÓN DEL CONCRETO Y CONDICIONES DE MUESTREO", {
    x: marginX + 6,
    y: sec2Top - 9,
    size: 7,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawRectangle({
    x: marginX,
    y: sec2Top - sec2Height,
    width: contentWidth,
    height: sec2Height - 12,
    borderColor: colBorder,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  const mRow1 = sec2Top - 23;
  const mRow2 = sec2Top - 35;
  const mRow3 = sec2Top - 47;
  const mRow4 = sec2Top - 56;

  // Izquierda: Especificación de Mezcla
  const fcMpa = (data.mezcla.fcDisenoKgCm2 * 0.0980665).toFixed(1);
  page.drawText("f'c Diseño:", { x: marginX + 6, y: mRow1, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(`${data.mezcla.fcDisenoKgCm2} kg/cm² (${fcMpa} MPa)`, { x: marginX + 62, y: mRow1, size: 7.5, font: helveticaBold, color: colAccent });

  page.drawText("Garantía:", { x: marginX + 175, y: mRow1, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(`${data.mezcla.edadGarantiaDias} días`, { x: marginX + 215, y: mRow1, size: 7.5, font: helvetica });

  page.drawText("Rev. Nom.:", { x: marginX + 6, y: mRow2, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(`${data.mezcla.revenimientoNominalCm ?? "-"} cm`, { x: marginX + 62, y: mRow2, size: 7.5, font: helvetica });

  page.drawText("TMA:", { x: marginX + 115, y: mRow2, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(`${data.mezcla.tmaMm ?? "19"} mm (3/4")`, { x: marginX + 142, y: mRow2, size: 7.5, font: helvetica });

  page.drawText("Cemento:", { x: marginX + 6, y: mRow3, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(truncateText(helvetica, data.mezcla.tipoCemento || "CPC 40R", 180, 7.5), { x: marginX + 62, y: mRow3, size: 7.5, font: helvetica });

  page.drawText("Concretera:", { x: marginX + 6, y: mRow4, size: 7, font: helveticaBold, color: colMuted });
  const concreteraFull = [data.mezcla.concretera, data.mezcla.numeroRemision ? `Rem: ${data.mezcla.numeroRemision}` : ""].filter(Boolean).join("  |  ");
  page.drawText(truncateText(helvetica, concreteraFull || "En obra", 200, 7), { x: marginX + 62, y: mRow4, size: 7, font: helvetica });

  // Derecha: Datos de Muestreo en Campo
  const mCol2 = marginX + 280;
  page.drawText("ID Muestra:", { x: mCol2, y: mRow1, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(data.muestreo.idMuestra, { x: mCol2 + 65, y: mRow1, size: 7.5, font: helveticaBold, color: colPrimary });

  page.drawText("F. Muestreo:", { x: mCol2 + 150, y: mRow1, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(formatDateTime(data.muestreo.fechaHoraMuestreo), { x: mCol2 + 205, y: mRow1, size: 7, font: helvetica });

  page.drawText("Rev. Obtenido:", { x: mCol2, y: mRow2, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(`${data.muestreo.revenimientoObtenidoCm ?? "-"} cm`, { x: mCol2 + 65, y: mRow2, size: 7.5, font: helvetica });

  page.drawText("Temp. Concreto:", { x: mCol2 + 130, y: mRow2, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(`${data.muestreo.temperaturaConcretoC ?? "-"} °C`, { x: mCol2 + 195, y: mRow2, size: 7.5, font: helvetica });

  page.drawText("Curado:", { x: mCol2, y: mRow3, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(truncateText(helvetica, data.muestreo.regimenCurado || "Cámara Húmeda NMX-C-148 (23 ± 2 °C, HR >= 95%)", 200, 7), { x: mCol2 + 65, y: mRow3, size: 7, font: helvetica });

  page.drawText("Cabeceo:", { x: mCol2, y: mRow4, size: 7, font: helveticaBold, color: colMuted });
  page.drawText(truncateText(helvetica, data.muestreo.metodoCabeceo || "Platos con almohadillas de neopreno (ASTM C1231)", 200, 7), { x: mCol2 + 65, y: mRow4, size: 7, font: helvetica });

  // =========================================================================
  // BLOQUE 3: TABLA OFICIAL DE RESULTADOS DE ENSAYES (Y = 580 a 420)
  // =========================================================================
  const sec3Top = 580;
  const tableHeaders = [
    { title: "#", width: 18, align: "center" as const },
    { title: "F. Rotura", width: 48, align: "center" as const },
    { title: "Edad", width: 30, align: "center" as const },
    { title: "Masa g", width: 40, align: "right" as const },
    { title: "D1/D2 mm", width: 55, align: "center" as const },
    { title: "D mm", width: 35, align: "right" as const },
    { title: "L mm", width: 35, align: "right" as const },
    { title: "L/D", width: 28, align: "right" as const },
    { title: "Área cm²", width: 44, align: "right" as const },
    { title: "Carga kN", width: 46, align: "right" as const },
    { title: "Carga kg", width: 48, align: "right" as const },
    { title: "f'c kg/cm²", width: 55, align: "right" as const },
    { title: "% f'c", width: 40, align: "right" as const },
    { title: "Ok", width: 30, align: "center" as const },
  ];

  // Barra de cabecera de la tabla
  page.drawRectangle({
    x: marginX,
    y: sec3Top - 15,
    width: contentWidth,
    height: 15,
    color: colAccent,
  });

  let curX = marginX;
  for (const h of tableHeaders) {
    const textW = helveticaBold.widthOfTextAtSize(h.title, 6.5);
    const offsetX = h.align === "center" ? (h.width - textW) / 2 : h.align === "right" ? h.width - textW - 3 : 3;
    page.drawText(h.title, {
      x: curX + offsetX,
      y: sec3Top - 11,
      size: 6.5,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    curX += h.width;
  }

  // Filas de especímenes
  let rowY = sec3Top - 15;
  const rowHeight = 16;
  const itemsToRender = data.especimenes.slice(0, 5); // Hasta 5 especímenes por página

  for (let idx = 0; idx < itemsToRender.length; idx++) {
    const esp = itemsToRender[idx];
    rowY -= rowHeight;

    // Fondo alternado (Zebra)
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: marginX,
        y: rowY,
        width: contentWidth,
        height: rowHeight,
        color: colZebra,
      });
    }

    // Línea inferior de fila
    page.drawLine({
      start: { x: marginX, y: rowY },
      end: { x: marginX + contentWidth, y: rowY },
      thickness: 0.5,
      color: colBorder,
    });

    const d1d2 = `${esp.diametro1Mm.toFixed(0)}/${esp.diametro2Mm.toFixed(0)}`;
    const cumpleTexto = esp.cumpleEspecificacion ? "SI" : "NO";
    const cumpleColor = esp.cumpleEspecificacion ? colSuccess : colAlert;

    const rowValues = [
      { text: esp.numero.toString(), width: 18, align: "center" as const, color: colPrimary, font: helveticaBold },
      { text: formatDateDmy(esp.fechaEnsaye), width: 48, align: "center" as const, color: colText, font: helvetica },
      { text: `${esp.edadRealDias}d`, width: 30, align: "center" as const, color: esp.enToleranciaEdad ? colText : colAlert, font: esp.enToleranciaEdad ? helvetica : helveticaBold },
      { text: esp.masaG ? esp.masaG.toLocaleString("es-MX") : "-", width: 40, align: "right" as const, color: colText, font: helvetica },
      { text: d1d2, width: 55, align: "center" as const, color: esp.excentricidadValida ? colText : colAlert, font: helvetica },
      { text: esp.diametroPromedioMm.toFixed(1), width: 35, align: "right" as const, color: colText, font: helvetica },
      { text: esp.longitudMm.toFixed(1), width: 35, align: "right" as const, color: colText, font: helvetica },
      { text: esp.relacionLd.toFixed(2), width: 28, align: "right" as const, color: esp.factorLd < 1.0 ? colAlert : colText, font: helvetica },
      { text: esp.areaCm2.toFixed(2), width: 44, align: "right" as const, color: colText, font: helvetica },
      { text: esp.cargaMaximaKn.toFixed(1), width: 46, align: "right" as const, color: colText, font: helvetica },
      { text: esp.cargaMaximaKg.toLocaleString("es-MX"), width: 48, align: "right" as const, color: colText, font: helveticaBold },
      { text: esp.resistenciaCorregidaKgCm2.toFixed(1), width: 55, align: "right" as const, color: colPrimary, font: helveticaBold },
      { text: esp.porcentajeFc ? `${esp.porcentajeFc.toFixed(0)}%` : "-", width: 40, align: "right" as const, color: esp.porcentajeFc && esp.porcentajeFc >= 100 ? colSuccess : colAlert, font: helveticaBold },
      { text: cumpleTexto, width: 30, align: "center" as const, color: cumpleColor, font: helveticaBold },
    ];

    let cellX = marginX;
    for (const cell of rowValues) {
      const textW = cell.font.widthOfTextAtSize(cell.text, 7);
      const offX = cell.align === "center" ? (cell.width - textW) / 2 : cell.align === "right" ? cell.width - textW - 3 : 3;
      page.drawText(cell.text, {
        x: cellX + offX,
        y: rowY + 4,
        size: 7,
        font: cell.font,
        color: cell.color,
      });
      cellX += cell.width;
    }
  }

  // Borde externo de la tabla
  const tableTotalH = (itemsToRender.length * rowHeight) + 15;
  page.drawRectangle({
    x: marginX,
    y: sec3Top - tableTotalH,
    width: contentWidth,
    height: tableTotalH,
    borderColor: colBorderDark,
    borderWidth: 0.8,
  });

  // Fila de resumen de la tabla
  const summaryY = sec3Top - tableTotalH - 12;
  const esp28d = data.especimenes.filter((e) => e.edadProgramadaDias === 28 || e.edadRealDias >= 28);
  const prom28 = esp28d.length > 0 ? (esp28d.reduce((acc, v) => acc + v.resistenciaCorregidaKgCm2, 0) / esp28d.length) : null;
  const pct28 = prom28 && data.mezcla.fcDisenoKgCm2 > 0 ? (prom28 / data.mezcla.fcDisenoKgCm2) * 100 : null;

  if (prom28 !== null) {
    page.drawText(`Promedio Resistencia a 28 días:  ${prom28.toFixed(1)} kg/cm² (${pct28?.toFixed(1)}% de f'c)`, {
      x: marginX + 6,
      y: summaryY,
      size: 7.5,
      font: helveticaBold,
      color: colPrimary,
    });
  }

  // Alertas normativas de esbeltez o tolerancias al pie de la tabla
  const tieneFactorLd = data.especimenes.some((e) => e.factorLd < 1.0);
  const tieneFueraEdad = data.especimenes.some((e) => !e.enToleranciaEdad);
  if (tieneFactorLd || tieneFueraEdad) {
    const advertencias = [
      tieneFactorLd ? "* Resistencia corregida mediante factor L/D (ASTM C39 Tabla 1)." : "",
      tieneFueraEdad ? "* Espécimen ensayado fuera de la tolerancia horaria NMX-C-083." : "",
    ].filter(Boolean).join("  ");
    page.drawText(advertencias, {
      x: marginX + 260,
      y: summaryY,
      size: 6.5,
      font: helveticaOblique,
      color: colAlert,
    });
  }

  // =========================================================================
  // BLOQUE 4: MARCO DE EVIDENCIA FÍSICA (FRACTURA VECTORIAL + FOTO FORENSE)
  // (Y = 460 a 310)
  // =========================================================================
  const sec4Top = summaryY - 14;
  const sec4Height = 145;

  page.drawRectangle({
    x: marginX,
    y: sec4Top - 12,
    width: contentWidth,
    height: 12,
    color: colPrimary,
  });
  page.drawText("3. INSPECCIÓN FORENSE: PATRÓN DE FRACTURA Y EVIDENCIA FOTOGRÁFICA DE ROTURA", {
    x: marginX + 6,
    y: sec4Top - 9,
    size: 7,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawRectangle({
    x: marginX,
    y: sec4Top - sec4Height,
    width: contentWidth,
    height: sec4Height - 12,
    borderColor: colBorder,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  // Panel Izquierdo: Diagrama Vectorial de Fractura
  const vecBoxW = 220;
  const vecBoxH = sec4Height - 20;
  const vecBoxX = marginX + 8;
  const vecBoxY = sec4Top - sec4Height + 6;

  page.drawRectangle({
    x: vecBoxX,
    y: vecBoxY,
    width: vecBoxW,
    height: vecBoxH,
    borderColor: colBorder,
    borderWidth: 0.5,
    color: rgb(0.98, 0.99, 1.0),
  });

  // Tomar el tipo de falla del espécimen principal o representativo
  const espFalla = data.especimenes[0];
  const tipoFalla = espFalla ? espFalla.tipoFalla : "CONO_TIPO_1";
  const infoFalla = getFractureInfo(tipoFalla);

  // Dibujar diagrama vectorial procedural en el PDF
  drawFractureVectorDiagram(
    page,
    tipoFalla,
    vecBoxX + 16,
    vecBoxY + 30,
    1.1,
    helvetica
  );

  // Textos descriptivos de la falla
  const textFallaX = vecBoxX + 75;
  page.drawText(infoFalla.titulo, {
    x: textFallaX,
    y: vecBoxY + 95,
    size: 8,
    font: helveticaBold,
    color: colPrimary,
  });

  page.drawText(infoFalla.astmReferencia, {
    x: textFallaX,
    y: vecBoxY + 83,
    size: 7,
    font: helveticaBold,
    color: colAccent,
  });

  page.drawText("Descripción de la rotura:", {
    x: textFallaX,
    y: vecBoxY + 68,
    size: 6.5,
    font: helveticaBold,
    color: colMuted,
  });

  page.drawText(truncateText(helvetica, infoFalla.subtitulo, 135, 6.5), {
    x: textFallaX,
    y: vecBoxY + 56,
    size: 6.5,
    font: helvetica,
    color: colText,
  });

  page.drawText(`Probeta evaluada: Cilindro #${espFalla?.numero || 1}`, {
    x: textFallaX,
    y: vecBoxY + 40,
    size: 6.5,
    font: helvetica,
    color: colText,
  });

  page.drawText(`Condición: ${espFalla?.condicionHumedad || "Húmedo Saturado"}`, {
    x: textFallaX,
    y: vecBoxY + 28,
    size: 6.5,
    font: helvetica,
    color: colMuted,
  });

  // Panel Derecho: Fotografía Forense con Sello Indeleble
  const fotoBoxW = contentWidth - vecBoxW - 24;
  const fotoBoxH = vecBoxH;
  const fotoBoxX = vecBoxX + vecBoxW + 8;
  const fotoBoxY = vecBoxY;

  page.drawRectangle({
    x: fotoBoxX,
    y: fotoBoxY,
    width: fotoBoxW,
    height: fotoBoxH,
    borderColor: colBorder,
    borderWidth: 0.5,
    color: rgb(0.96, 0.97, 0.98),
  });

  if (fotoRoturaImg) {
    // Escalar la fotografía forense preservando proporción
    const maxPhotoW = fotoBoxW - 12;
    const maxPhotoH = fotoBoxH - 26; // Espacio para el cintillo de metadatos
    const scale = Math.min(maxPhotoW / fotoRoturaImg.width, maxPhotoH / fotoRoturaImg.height);
    const renderW = fotoRoturaImg.width * scale;
    const renderH = fotoRoturaImg.height * scale;
    const photoX = fotoBoxX + (fotoBoxW - renderW) / 2;
    const photoY = fotoBoxY + 18 + (maxPhotoH - renderH) / 2;

    page.drawImage(fotoRoturaImg, {
      x: photoX,
      y: photoY,
      width: renderW,
      height: renderH,
    });

    // Marco de foto
    page.drawRectangle({
      x: photoX,
      y: photoY,
      width: renderW,
      height: renderH,
      borderColor: colPrimary,
      borderWidth: 0.5,
    });

    // Sello forense indeleble (cintillo quemado en el pie de la imagen)
    page.drawRectangle({
      x: fotoBoxX + 4,
      y: fotoBoxY + 4,
      width: fotoBoxW - 8,
      height: 12,
      color: rgb(0.06, 0.09, 0.16),
    });

    const espNum = espConFoto?.numero || 1;
    const cargaKn = espConFoto?.cargaMaximaKn.toFixed(1) || "-";
    const fcVal = espConFoto?.resistenciaCorregidaKgCm2.toFixed(1) || "-";
    const pctVal = espConFoto?.porcentajeFc ? `${espConFoto.porcentajeFc.toFixed(0)}%` : "-";
    const watermarkStr = `FOLIO: ${data.folio} | CIL #${espNum} | ${cargaKn} kN | ${fcVal} kg/cm² (${pctVal}) | ${formatDateTime(data.fechaEmision)}`;

    page.drawText(truncateText(helveticaBold, watermarkStr, fotoBoxW - 14, 5.5), {
      x: fotoBoxX + 7,
      y: fotoBoxY + 7.5,
      size: 5.5,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
  } else {
    // Resguardo visual cuando no hay cámara conectada en la prensa
    page.drawText("EVIDENCIA FOTOGRÁFICA NO REGISTRADA", {
      x: fotoBoxX + 45,
      y: fotoBoxY + 68,
      size: 8,
      font: helveticaBold,
      color: colMuted,
    });
    page.drawText("Estación de ensayo sin cámara fotográfica vinculada", {
      x: fotoBoxX + 42,
      y: fotoBoxY + 54,
      size: 6.5,
      font: helvetica,
      color: colMuted,
    });
  }

  // =========================================================================
  // BLOQUE 5: TRAZABILIDAD CRIPTOGRÁFICA QR Y FIRMAS AUTORIZADAS (Y = 285 a 170)
  // =========================================================================
  const sec5Top = sec4Top - sec4Height - 8;
  const sec5Height = 95;

  page.drawRectangle({
    x: marginX,
    y: sec5Top - 12,
    width: contentWidth,
    height: 12,
    color: colPrimary,
  });
  page.drawText("4. TRAZABILIDAD CRIPTOGRÁFICA Y RESPONSABILIDAD TÉCNICA", {
    x: marginX + 6,
    y: sec5Top - 9,
    size: 7,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawRectangle({
    x: marginX,
    y: sec5Top - sec5Height,
    width: contentWidth,
    height: sec5Height - 12,
    borderColor: colBorder,
    borderWidth: 0.8,
    color: rgb(1, 1, 1),
  });

  // Panel Izquierdo: QR Code y Hash SHA-256
  const qrBoxW = 210;
  const qrBoxX = marginX + 6;
  const qrBoxY = sec5Top - sec5Height + 6;

  page.drawImage(qrImage, {
    x: qrBoxX + 4,
    y: qrBoxY + 4,
    width: 64,
    height: 64,
  });

  const qrTextX = qrBoxX + 74;
  page.drawText("VERIFICACIÓN INMUTABLE", {
    x: qrTextX,
    y: qrBoxY + 58,
    size: 6.5,
    font: helveticaBold,
    color: colPrimary,
  });

  page.drawText("Hash SHA-256 del documento:", {
    x: qrTextX,
    y: qrBoxY + 48,
    size: 5.5,
    font: helvetica,
    color: colMuted,
  });

  // Hash en dos líneas
  const hashPart1 = qrResult.sha256.slice(0, 32);
  const hashPart2 = qrResult.sha256.slice(32);
  page.drawText(hashPart1, {
    x: qrTextX,
    y: qrBoxY + 38,
    size: 5,
    font: helveticaBold,
    color: colAccent,
  });
  page.drawText(hashPart2, {
    x: qrTextX,
    y: qrBoxY + 30,
    size: 5,
    font: helveticaBold,
    color: colAccent,
  });

  page.drawText("Token Offline Autónomo:", {
    x: qrTextX,
    y: qrBoxY + 20,
    size: 5.5,
    font: helvetica,
    color: colMuted,
  });
  page.drawText(truncateText(helvetica, qrResult.offlineToken, 125, 5), {
    x: qrTextX,
    y: qrBoxY + 11,
    size: 5,
    font: helvetica,
    color: colPrimary,
  });

  // Panel Derecho: Bloques de Firmas Biométricas
  const signW = 155;
  const sign1X = marginX + 230;
  const sign2X = sign1X + signW + 10;
  const signLineY = qrBoxY + 28;

  // Firma 1: Técnico de Ensayes (Operador)
  if (operadorFirmaImg) {
    const scale = Math.min((signW - 20) / operadorFirmaImg.width, 32 / operadorFirmaImg.height);
    page.drawImage(operadorFirmaImg, {
      x: sign1X + (signW - operadorFirmaImg.width * scale) / 2,
      y: signLineY + 2,
      width: operadorFirmaImg.width * scale,
      height: operadorFirmaImg.height * scale,
    });
  }

  page.drawLine({
    start: { x: sign1X, y: signLineY },
    end: { x: sign1X + signW, y: signLineY },
    thickness: 0.8,
    color: colPrimary,
  });

  page.drawText(truncateText(helveticaBold, data.firmas.operadorNombre, signW, 7), {
    x: sign1X,
    y: signLineY - 9,
    size: 7,
    font: helveticaBold,
    color: colPrimary,
  });
  page.drawText(data.firmas.operadorCargo || "Técnico de Laboratorio", {
    x: sign1X,
    y: signLineY - 18,
    size: 6,
    font: helvetica,
    color: colMuted,
  });
  if (data.firmas.operadorCedula) {
    page.drawText(`Céd. Prof.: ${data.firmas.operadorCedula}`, {
      x: sign1X,
      y: signLineY - 26,
      size: 5.5,
      font: helvetica,
      color: colMuted,
    });
  }

  // Firma 2: Signatario Acreditado / Director Técnico
  if (signatarioFirmaImg) {
    const scale = Math.min((signW - 20) / signatarioFirmaImg.width, 32 / signatarioFirmaImg.height);
    page.drawImage(signatarioFirmaImg, {
      x: sign2X + (signW - signatarioFirmaImg.width * scale) / 2,
      y: signLineY + 2,
      width: signatarioFirmaImg.width * scale,
      height: signatarioFirmaImg.height * scale,
    });
  }

  page.drawLine({
    start: { x: sign2X, y: signLineY },
    end: { x: sign2X + signW, y: signLineY },
    thickness: 0.8,
    color: colPrimary,
  });

  page.drawText(truncateText(helveticaBold, data.firmas.signatarioNombre, signW, 7), {
    x: sign2X,
    y: signLineY - 9,
    size: 7,
    font: helveticaBold,
    color: colPrimary,
  });
  page.drawText(data.firmas.signatarioCargo || "Signatario Autorizado Acreditado", {
    x: sign2X,
    y: signLineY - 18,
    size: 6,
    font: helvetica,
    color: colMuted,
  });
  if (data.firmas.signatarioCedula) {
    page.drawText(`Céd. Prof.: ${data.firmas.signatarioCedula}`, {
      x: sign2X,
      y: signLineY - 26,
      size: 5.5,
      font: helvetica,
      color: colMuted,
    });
  }

  // =========================================================================
  // BLOQUE 6: RESUMEN ESTADÍSTICO ACI 214R Y DECLARACIÓN LEGAL (Y = 160 a 30)
  // =========================================================================
  const sec6Top = sec5Top - sec5Height - 6;

  // Franja resumen ACI 214R si está presente
  if (data.estadisticasAci) {
    page.drawRectangle({
      x: marginX,
      y: sec6Top - 20,
      width: contentWidth,
      height: 20,
      color: colAccentLight,
      borderColor: colAccent,
      borderWidth: 0.6,
    });

    const st = data.estadisticasAci;
    const aciText = [
      `EVALUACIÓN ACI 214R / ACI 318:`,
      `Media = ${st.promedioResistenciaKgCm2.toFixed(1)} kg/cm²`,
      `s = ${st.desviacionEstandarKgCm2.toFixed(1)} kg/cm²`,
      `V = ${st.coeficienteVariacionPct.toFixed(1)}%`,
      st.variacionDentroDelEnsayoPct !== undefined ? `V₁ (Dentro) = ${st.variacionDentroDelEnsayoPct.toFixed(1)}%` : "",
      st.resistenciaRequeridaFcr ? `f'cr = ${st.resistenciaRequeridaFcr.toFixed(1)} kg/cm²` : "",
      `Control: ${st.calificacionControl}`,
      st.cumpleCriterioAci318 ? "[CUMPLE ACI 318]" : "[NO CUMPLE ACI 318]",
    ].filter(Boolean).join("  |  ");

    page.drawText(truncateText(helveticaBold, aciText, contentWidth - 12, 6), {
      x: marginX + 6,
      y: sec6Top - 13,
      size: 6,
      font: helveticaBold,
      color: colPrimary,
    });
  }

  // Declaración legal de cumplimiento normativo y pie de página
  const legalY = sec6Top - (data.estadisticasAci ? 32 : 12);
  const legalText =
    "DECLARACIÓN DE CONFORMIDAD: Los resultados corresponden exclusivamente a las muestras ensayadas de conformidad con ASTM C39/C39M y NMX-C-083-ONNCCE. La reproducción parcial de este documento queda prohibida sin la autorización por escrito de la dirección del laboratorio.";

  page.drawText(legalText, {
    x: marginX,
    y: legalY,
    size: 5.5,
    font: helvetica,
    color: colMuted,
  });

  page.drawLine({
    start: { x: marginX, y: legalY - 6 },
    end: { x: marginX + contentWidth, y: legalY - 6 },
    thickness: 0.5,
    color: colBorder,
  });

  // Pie inferior: fecha, software y paginación
  const footerY = legalY - 14;
  page.drawText("ENSALIA Laboratory Automation Engine | Local-First Architecture | ASTM C39 Compliance", {
    x: marginX,
    y: footerY,
    size: 5.5,
    font: helveticaBold,
    color: colMuted,
  });

  page.drawText(`Página 1 de 1  |  Generado: ${formatDateTime(new Date())}`, {
    x: marginX + contentWidth - 140,
    y: footerY,
    size: 5.5,
    font: helvetica,
    color: colMuted,
  });

  // Marca de agua de borrador opcional
  if (options.isDraft || options.watermarkText) {
    const wmText = options.watermarkText || "BORRADOR / PRELIMINAR";
    page.drawText(wmText, {
      x: 120,
      y: 350,
      size: 42,
      font: helveticaBold,
      color: rgb(0.9, 0.2, 0.2),
      opacity: 0.12,
      rotate: { angle: 35, type: 0 as any },
    });
  }

  return await doc.save();
}

