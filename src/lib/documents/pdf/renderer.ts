import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

export type FieldSheetSnapshot = Record<string, unknown> & {
  idMuestra: string; fechaMuestreo: string; cliente: string; obra: string; noMuestra: string;
  especimenes?: Array<Record<string, unknown>>; asignacionesEquipo?: Array<Record<string, unknown>>;
};

export type FieldSheetRenderInput = {
  numeroControl: string; revision: number; tokenQr: string; emitidaEn: Date;
  identidad: { nombreComercial?: string; razonSocial?: string; domicilio?: string; contacto?: string; leyendaDocumental?: string };
  muestra: FieldSheetSnapshot; copyLabel?: string; filasEspecimenObjetivo?: number;
  contextoPaquete?: { folioColado: string; indiceMuestra: number; totalMuestras: number };
};

export type PourFieldSheetPackageInput = {
  folioColado: string;
  datosComunes: Partial<FieldSheetSnapshot>;
  muestras: FieldSheetRenderInput[];
};

const WIDTH = 612;
const HEIGHT = 792;
const MARGIN = 36;
const ink = rgb(0.08, 0.15, 0.2);
const muted = rgb(0.35, 0.4, 0.44);

export function fieldSheetQrPayload(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Token QR de hoja de campo no valido.");
  return `ENSALIA:HC:1:${token}`;
}

function safe(value: unknown, fallback = "") { return value == null || value === "" ? fallback : String(value); }
function date(value: unknown) { const text = safe(value); return text ? text.slice(0, 10) : ""; }
function label(page: PDFPage, font: PDFFont, text: string, x: number, y: number) { page.drawText(text, { x, y, size: 7, font, color: muted }); }
function value(page: PDFPage, font: PDFFont, text: unknown, x: number, y: number, maxWidth: number) {
  let output = safe(text, " ");
  while (output.length > 1 && font.widthOfTextAtSize(output, 9) > maxWidth) output = `${output.slice(0, -2)}...`;
  page.drawText(output, { x, y, size: 9, font, color: ink });
}
function box(page: PDFPage, font: PDFFont, title: string, text: unknown, x: number, y: number, width: number, height = 34) {
  page.drawRectangle({ x, y, width, height, borderWidth: 0.7, borderColor: muted });
  label(page, font, title.toUpperCase(), x + 5, y + height - 10);
  value(page, font, text, x + 5, y + 8, width - 10);
}
function line(page: PDFPage, font: PDFFont, title: string, x: number, y: number, width: number) {
  label(page, font, title.toUpperCase(), x, y + 4);
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.6, color: muted });
}
function footer(page: PDFPage, font: PDFFont, control: string, revision: number, pageNumber: number, total: number) {
  page.drawLine({ start: { x: MARGIN, y: 27 }, end: { x: WIDTH - MARGIN, y: 27 }, thickness: 0.5, color: muted });
  page.drawText(`Documento controlado ${control} | Rev. ${revision} | Pagina ${pageNumber} de ${total}`, { x: MARGIN, y: 15, size: 7, font, color: muted });
}

function sectionTitle(page: PDFPage, font: PDFFont, title: string, cursorTop: number) {
  // Reserve a real header band above the following table. Keeping the title
  // baseline only ten points from the first row made it look embedded in the
  // row border in browser PDF viewers and at common print scaling.
  page.drawText(title, { x: MARGIN, y: cursorTop - 10, size: 9, font, color: ink });
  return cursorTop - 28;
}

function drawBoxRow(page: PDFPage, font: PDFFont, cursorTop: number, height: number, cells: Array<{ title: string; text: unknown; width: number }>) {
  let x = MARGIN;
  const bottom = cursorTop - height;
  for (const cell of cells) {
    box(page, font, cell.title, cell.text, x, bottom, cell.width, height);
    x += cell.width;
  }
  return bottom;
}

function continuationHeader(page: PDFPage, regular: PDFFont, bold: PDFFont, control: string, revision: number) {
  page.drawRectangle({ x: MARGIN, y: HEIGHT - 76, width: WIDTH - MARGIN * 2, height: 40, borderWidth: 0.8, borderColor: ink });
  page.drawText("HOJA DE CAMPO - CONCRETO", { x: MARGIN + 10, y: HEIGHT - 55, size: 11, font: bold, color: ink });
  page.drawText(`${control} | Revision ${revision} | Continuacion`, { x: MARGIN + 280, y: HEIGHT - 55, size: 8, font: regular, color: ink });
  return HEIGHT - 92;
}

export async function renderFieldSheetPdf(input: FieldSheetRenderInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Hoja de campo ${input.numeroControl}`);
  pdf.setAuthor("Ensalia");
  pdf.setSubject("Documento controlado para captura de campo");
  pdf.setCreationDate(input.emitidaEn);
  pdf.setModificationDate(input.emitidaEn);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrPayload = fieldSheetQrPayload(input.tokenQr);
  const qrData = await QRCode.toDataURL(qrPayload, { errorCorrectionLevel: "Q", margin: 4, width: 300 });
  const qr = await pdf.embedPng(Buffer.from(qrData.split(",")[1], "base64"));
  let page = pdf.addPage([WIDTH, HEIGHT]);
  page.drawRectangle({ x: MARGIN, y: 680, width: WIDTH - MARGIN * 2, height: 76, borderWidth: 1, borderColor: ink });
  page.drawText(safe(input.identidad.nombreComercial, "Ensalia"), { x: MARGIN + 10, y: HEIGHT - 58, size: 17, font: bold, color: ink });
  page.drawText("HOJA DE CAMPO - CONCRETO", { x: MARGIN + 10, y: HEIGHT - 78, size: 12, font: bold, color: ink });
  value(page, regular, input.identidad.razonSocial, MARGIN + 10, HEIGHT - 95, 260);
  page.drawText(input.numeroControl, { x: MARGIN + 315, y: HEIGHT - 60, size: 9, font: bold, color: ink });
  page.drawText(`Revision ${input.revision}`, { x: MARGIN + 315, y: HEIGHT - 76, size: 8, font: regular, color: ink });
  page.drawText(`Emitida ${input.emitidaEn.toISOString().slice(0, 16).replace("T", " ")} UTC`, { x: MARGIN + 315, y: HEIGHT - 91, size: 7, font: regular, color: muted });
  page.drawImage(qr, { x: WIDTH - MARGIN - 78, y: 682, width: 72, height: 72 });
  if (input.contextoPaquete) page.drawText(`Colado ${input.contextoPaquete.folioColado} | Muestra ${input.contextoPaquete.indiceMuestra} de ${input.contextoPaquete.totalMuestras}`, { x: MARGIN, y: 669, size: 7, font: bold, color: ink });
  const instructionY = input.contextoPaquete ? 659 : 669;
  page.drawText("Escanea el QR para consultar este documento.", { x: MARGIN, y: instructionY, size: 7, font: bold, color: ink });
  page.drawText(`Si no puedes escanearlo, busca el numero de control: ${input.numeroControl}.`, { x: MARGIN, y: instructionY - 10, size: 7, font: regular, color: ink });
  if (input.copyLabel) page.drawText(input.copyLabel, { x: 350, y: 646, size: 9, font: bold, color: rgb(0.65, 0.1, 0.1) });

  const s = input.muestra;
  let y = input.contextoPaquete ? 636 : 646;
  y = drawBoxRow(page, regular, y, 30, [{ title: "Folio de muestra", text: s.idMuestra, width: 170 }, { title: "Fecha de muestreo", text: date(s.fechaMuestreo), width: 140 }, { title: "No. muestra cliente", text: s.noMuestra, width: 230 }]);
  y = drawBoxRow(page, regular, y, 30, [{ title: "Cliente", text: s.cliente, width: 270 }, { title: "Obra", text: s.obra, width: 270 }]);
  y = drawBoxRow(page, regular, y, 30, [{ title: "Localizacion", text: s.localizacion, width: 270 }, { title: "Elemento / colado", text: s.elemento, width: 270 }]);
  y = drawBoxRow(page, regular, y, 30, [{ title: "Tipo de concreto", text: s.tipoConcreto, width: 180 }, { title: "Resistencia kg/cm2", text: s.fcKgCm2, width: 120 }, { title: "Edad dias", text: s.edadCilindro, width: 100 }, { title: "TMA mm", text: s.tmaMm, width: 140 }]);
  y -= 6;
  y = sectionTitle(page, bold, "MEDICIONES EN CAMPO", y);
  const fields = ["Salida planta", "Llegada obra", "Inicio descarga", "Fin descarga", "Revenimiento cm", "Temp. ambiente C", "Temp. concreto C", "Contenido aire %"];
  for (let row = 0; row < 2; row++) {
    y = drawBoxRow(page, regular, y, 31, fields.slice(row * 4, row * 4 + 4).map((title) => ({ title, text: "", width: 135 })));
  }
  y -= 8;
  const specimens = Array.isArray(s.especimenes) ? s.especimenes : [];
  const assignments = Array.isArray(s.asignacionesEquipo) ? s.asignacionesEquipo : [];
  const targetRows = Math.max(1, Math.min(12, Math.trunc(input.filasEspecimenObjetivo ?? 4)));
  const specimenRows: Array<Record<string, unknown>> = specimens.length >= targetRows ? specimens : [...specimens, ...Array.from({ length: targetRows - specimens.length }, () => ({}))];
  let specimenIndex = 0;
  while (specimenIndex < specimenRows.length) {
    y = sectionTitle(page, bold, specimenIndex === 0 ? "ESPECIMENES Y MOLDES UTILIZADOS" : "ESPECIMENES Y MOLDES UTILIZADOS - CONTINUACION", y);
    const remaining = specimenRows.length - specimenIndex;
    const finalCapacity = Math.max(1, Math.floor((y - 265) / 28));
    const rowsThisPage = remaining <= finalCapacity ? remaining : Math.min(Math.max(1, Math.floor((y - 55) / 28)), remaining - 1);
    for (let row = 0; row < rowsThisPage; row++, specimenIndex++) {
      const item = specimenRows[specimenIndex] || {};
      const mold = assignments.find((assignment) => assignment.especimenId === item.id);
      y = drawBoxRow(page, regular, y, 28, [
        { title: `Especimen ${safe(item.numero, String(specimenIndex + 1))} - tipo / edad`, text: `${safe(item.tipo)}  ${safe(item.edadDias)} dias`, width: 260 },
        { title: "Codigo del molde", text: mold?.codigoInternoSnapshot, width: 160 },
        { title: "Fecha prevista ensayo", text: date(item.fechaEnsaye), width: 120 },
      ]);
    }
    if (specimenIndex < specimenRows.length) {
      page = pdf.addPage([WIDTH, HEIGHT]);
      y = continuationHeader(page, regular, bold, input.numeroControl, input.revision);
    }
  }
  y -= 8;
  y = sectionTitle(page, bold, "EQUIPO GENERAL UTILIZADO", y);
  const sharedEquipment = assignments.filter((assignment) => !assignment.especimenId).map((assignment) => `${safe(assignment.tipoNombreSnapshot)}: ${safe(assignment.codigoInternoSnapshot)}`).join(" | ");
  y = drawBoxRow(page, regular, y, 26, [{ title: "Codigos de equipo", text: sharedEquipment, width: 540 }]);
  y -= 8;
  y = sectionTitle(page, bold, "OBSERVACIONES E INCIDENCIAS", y);
  page.drawRectangle({ x: MARGIN, y: y - 45, width: 540, height: 45, borderWidth: 0.7, borderColor: muted });
  y -= 67;
  line(page, regular, "Tecnico de campo (nombre y firma)", MARGIN, y, 245);
  line(page, regular, "Responsable de obra (nombre y firma)", MARGIN + 295, y, 245);
  y -= 30;
  line(page, regular, "Fecha y hora de entrega", MARGIN, y, 245);
  line(page, regular, "Fecha y hora de recepcion en laboratorio", MARGIN + 295, y, 245);
  const pages = pdf.getPages();
  pages.forEach((item, index) => footer(item, regular, input.numeroControl, input.revision, index + 1, pages.length));
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}

export async function renderPourFieldSheetPackage(input: PourFieldSheetPackageInput) {
  if (!input.muestras.length) throw new Error("El paquete de colado requiere al menos una muestra.");
  const packagePdf = await PDFDocument.create();
  packagePdf.setTitle(`Hoja de campo del colado ${input.folioColado}`);
  packagePdf.setAuthor("Ensalia");
  packagePdf.setSubject("Paquete controlado de hojas de campo por colado");
  for (let index = 0; index < input.muestras.length; index++) {
    const item = input.muestras[index];
    const rendered = await renderFieldSheetPdf({
      ...item,
      muestra: { ...item.muestra, ...input.datosComunes } as FieldSheetSnapshot,
      contextoPaquete: { folioColado: input.folioColado, indiceMuestra: index + 1, totalMuestras: input.muestras.length },
    });
    const source = await PDFDocument.load(rendered);
    const pages = await packagePdf.copyPages(source, source.getPageIndices());
    pages.forEach((itemPage) => packagePdf.addPage(itemPage));
  }
  return new Uint8Array(await packagePdf.save({ useObjectStreams: false }));
}

export async function mergeIssuedFieldSheetPdfs(documents: Uint8Array[], folioColado: string) {
  if (!documents.length) throw new Error("El paquete de colado requiere al menos un documento emitido.");
  const packagePdf = await PDFDocument.create();
  packagePdf.setTitle(`Hojas de campo del colado ${folioColado}`);
  packagePdf.setAuthor("Ensalia");
  packagePdf.setSubject("Compilacion de documentos controlados emitidos por muestra");
  for (const document of documents) {
    const source = await PDFDocument.load(document, { updateMetadata: false });
    const pages = await packagePdf.copyPages(source, source.getPageIndices());
    pages.forEach((itemPage) => packagePdf.addPage(itemPage));
  }
  return new Uint8Array(await packagePdf.save({ useObjectStreams: false }));
}

export async function stampControlledCopy(original: Uint8Array, copyNumber: number) {
  const pdf = await PDFDocument.load(original, { updateMetadata: false });
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.getPages()[0];
  page.drawRectangle({ x: 344, y: 638, width: 210, height: 16, color: rgb(1, 1, 1), borderColor: rgb(0.65, 0.1, 0.1), borderWidth: 0.8 });
  page.drawText(`COPIA CONTROLADA ${copyNumber}`, { x: 376, y: 643, size: 9, font: bold, color: rgb(0.65, 0.1, 0.1) });
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}
