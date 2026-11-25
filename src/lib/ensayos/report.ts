import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ScheduleItem } from "./schedule";

export type DailyTestReport = {
  fecha: string;
  operador: string;
  generadoEn: Date;
  folio: string;
  identidad: { nombreComercial?: string; razonSocial?: string; contacto?: string; domicilio?: string; leyendaDocumental?: string };
  documento: { titulo: string; codigo: string; revision: string; firmas: string[]; mostrarCamposManuales: boolean };
  logo?: { bytes: Uint8Array; mimeType: string } | null;
  items: ScheduleItem[];
};

const csvQuote = (value: unknown) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export function dailyTestCsv(input: Pick<DailyTestReport, "items">) {
  const headers = ["Fecha prevista", "Origen fecha", "Programacion", "Colado", "ID muestra", "No. muestra", "Especimen", "Tipo", "Edad dias", "Cliente", "Obra", "Elemento", "f'c kg/cm2", "Molde"];
  const lines = input.items.map((item) => [
    item.fechaProgramada, item.origenFecha, item.programacion, item.muestra.colado?.folio,
    item.muestra.idMuestra, item.muestra.noMuestra, item.numero, item.tipo, item.edadDias,
    item.muestra.cliente, item.muestra.obra, item.muestra.elemento, item.muestra.fcKgCm2, item.moldeCodigo,
  ].map(csvQuote).join(","));
  return "\uFEFF" + [headers.map(csvQuote).join(","), ...lines].join("\r\n");
}

const baseColumns = [78, 116, 76, 34, 42, 65, 52, 54];
const manualColumns = [45, 45, 48, 75];
function clipped(font: PDFFont, text: unknown, width: number) {
  let result = String(text ?? "-").replaceAll("_", " ");
  while (result.length > 1 && font.widthOfTextAtSize(result, 7) > width) result = `${result.slice(0, -4)}...`;
  return result;
}

function humanDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function localDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "America/Cancun", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(value);
}

const typeName = (value: string) => ({ CILINDRO_15X30: "Cilindro 15 x 30 cm", CILINDRO_10X20: "Cilindro 10 x 20 cm", VIGA_50X15X15: "Viga 50 x 15 x 15 cm" }[value] || value.replaceAll("_", " "));

export async function renderDailyTestPdf(input: DailyTestReport) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (input.logo?.mimeType === "image/png") logo = await pdf.embedPng(input.logo.bytes);
  if (input.logo?.mimeType === "image/jpeg") logo = await pdf.embedJpg(input.logo.bytes);
  const rowsPerPage = 9;
  const pages = Math.max(1, Math.ceil(input.items.length / rowsPerPage));
  const provisional = input.items.filter((item) => item.programacion === "PROVISIONAL").length;
  const confirmed = input.items.length - provisional;
  const ages = [...new Set(input.items.map((item) => item.edadDias).filter((age): age is number => age != null))].sort((a, b) => a - b);
  const ageSummary = ages.map((age) => `${age} dias: ${input.items.filter((item) => item.edadDias === age).length}`).join("  |  ") || "Sin edades registradas";
  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const page = pdf.addPage([792, 612]);
    if (logo) {
      const scale = Math.min(78 / logo.width, 42 / logo.height);
      page.drawImage(logo, { x: 30, y: 543, width: logo.width * scale, height: logo.height * scale });
    }
    const identityX = logo ? 115 : 30;
    page.drawText(clipped(bold, input.identidad.nombreComercial || "Ensalia", 210), { x: identityX, y: 574, size: 15, font: bold, color: rgb(0.05, 0.18, 0.16) });
    if (input.identidad.razonSocial) page.drawText(clipped(regular, input.identidad.razonSocial, 210), { x: identityX, y: 560, size: 7, font: regular });
    const identityContact = [input.identidad.domicilio, input.identidad.contacto].filter(Boolean).join(" | ");
    if (identityContact) page.drawText(clipped(regular, identityContact, 210), { x: identityX, y: 549, size: 7, font: regular });
    page.drawText(clipped(bold, input.documento.titulo.toUpperCase(), 300), { x: 265, y: 573, size: 13, font: bold });
    page.drawRectangle({ x: 650, y: 535, width: 112, height: 55, borderWidth: 0.8, borderColor: rgb(0.25, 0.3, 0.32), color: rgb(1, 1, 1) });
    page.drawText(`Codigo: ${input.documento.codigo}`, { x: 656, y: 575, size: 7, font: bold });
    page.drawText(`Revision: ${input.documento.revision}`, { x: 656, y: 561, size: 7, font: regular });
    page.drawText(`Folio: ${input.folio}`, { x: 656, y: 547, size: 6.5, font: regular });
    page.drawText(`Fecha de trabajo: ${humanDate(input.fecha)}  |  Preparo: ${input.operador}  |  Emitido: ${localDateTime(input.generadoEn)} h`, { x: 30, y: 520, size: 8, font: regular });
    page.drawRectangle({ x: 30, y: 486, width: 732, height: 24, color: rgb(0.93, 0.96, 0.95), borderColor: rgb(0.45, 0.5, 0.48), borderWidth: 0.5 });
    page.drawText(`Total: ${input.items.length}  |  Confirmados: ${confirmed}  |  Provisionales: ${provisional}  |  ${ageSummary}`, { x: 38, y: 495, size: 8, font: bold });
    if (provisional) {
      page.drawRectangle({ x: 30, y: 458, width: 732, height: 20, color: rgb(1, 0.96, 0.84), borderColor: rgb(0.7, 0.48, 0.1), borderWidth: 0.6 });
      page.drawText("ATENCION: incluye programaciones provisionales. Verificar antes de retirar o ensayar.", { x: 38, y: 465, size: 8, font: bold, color: rgb(0.45, 0.24, 0.02) });
    }
    const columns = input.documento.mostrarCamposManuales ? [...baseColumns, ...manualColumns] : [88, 170, 92, 42, 50, 82, 72, 70];
    const titles = input.documento.mostrarCamposManuales
      ? ["Muestra / esp.", "Cliente / obra", "Tipo", "Edad", "f'c", "Colado", "Molde", "Estado", "Retiro", "Ensaye", "Tecnico", "Condicion"]
      : ["Muestra / esp.", "Cliente / obra", "Tipo", "Edad", "f'c", "Colado", "Molde", "Estado"];
    let x = 30, y = provisional ? 427 : 454;
    titles.forEach((title, index) => { page.drawRectangle({ x, y, width: columns[index], height: 22, borderWidth: 0.7, borderColor: rgb(0.25, 0.3, 0.32), color: rgb(0.9, 0.93, 0.94) }); page.drawText(title, { x: x + 3, y: y + 7, size: 6.5, font: bold }); x += columns[index]; });
    y -= 28;
    const items = input.items.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    if (!items.length) page.drawText("Sin ensayes programados para la fecha seleccionada.", { x: 30, y: y - 10, size: 11, font: regular });
    for (const item of items) {
      const values: unknown[] = [`${item.muestra.idMuestra} / ${item.numero}`, `${item.muestra.cliente} / ${item.muestra.obra}`, typeName(item.tipo), item.edadDias ?? "-", item.muestra.fcKgCm2 ?? "-", item.muestra.colado?.folio || "-", item.moldeCodigo || "-", item.programacion === "PROVISIONAL" ? "PROVISIONAL" : "CONFIRMADO"];
      if (input.documento.mostrarCamposManuales) values.push("", "", "", "");
      x = 30;
      values.forEach((value, index) => {
        page.drawRectangle({
          x, y, width: columns[index], height: 30,
          color: rgb(1, 1, 1), borderColor: rgb(0.35, 0.4, 0.43), borderWidth: 0.6,
        });
        page.drawText(clipped(regular, value, columns[index] - 6), { x: x + 3, y: y + 12, size: 6.5, font: regular, color: rgb(0.05, 0.08, 0.1) });
        x += columns[index];
      });
      y -= 30;
    }
    if (pageIndex === pages - 1) {
      page.drawText("Observaciones generales:", { x: 30, y: 103, size: 7, font: bold });
      page.drawLine({ start: { x: 30, y: 88 }, end: { x: 762, y: 88 }, thickness: 0.5, color: rgb(0.45, 0.48, 0.5) });
      page.drawLine({ start: { x: 30, y: 74 }, end: { x: 762, y: 74 }, thickness: 0.5, color: rgb(0.45, 0.48, 0.5) });
      const signatureWidth = 170; const gap = 55; const total = input.documento.firmas.length * signatureWidth + (input.documento.firmas.length - 1) * gap; let signatureX = (792 - total) / 2;
      input.documento.firmas.forEach((label) => { page.drawLine({ start: { x: signatureX, y: 43 }, end: { x: signatureX + signatureWidth, y: 43 }, thickness: 0.6 }); page.drawText(clipped(regular, label, signatureWidth), { x: signatureX, y: 31, size: 7, font: regular }); signatureX += signatureWidth + gap; });
    }
    page.drawText("Documento operativo - No constituye un informe de resultados de ensaye.", { x: 30, y: 14, size: 6.5, font: bold });
    page.drawText(`${input.documento.codigo} | Rev. ${input.documento.revision} | Generado por Ensalia`, { x: 330, y: 14, size: 6.5, font: regular });
    page.drawText(`Pagina ${pageIndex + 1} de ${pages}`, { x: 700, y: 14, size: 6.5, font: regular });
  }
  pdf.setTitle(`Programa de ensayes ${input.fecha}`);
  pdf.setAuthor(input.identidad.nombreComercial || "Ensalia");
  pdf.setCreationDate(input.generadoEn);
  return pdf.save();
}
