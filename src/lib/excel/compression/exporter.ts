import ExcelJS from "exceljs";
import { CorporateExcelDataset } from "./types";

export async function generateCorporateExcelWorkbook(
  dataset: CorporateExcelDataset
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ENSALIA Automation Engine";
  wb.lastModifiedBy = "ENSALIA Metrology Core";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("Informe de Ensaye f'c", {
    views: [{ showGridLines: true }],
  });

  // 1. Paleta de Colores Institucionales
  const COLOR_HEADER_BG = "0F172A"; // Pizarra oscura corporativa
  const COLOR_HEADER_TXT = "FFFFFF";
  const COLOR_ACCENT_BG = "16734C"; // Verde esmeralda ingeniería
  const COLOR_ZEBRA_BG = "F8FAFC";
  const COLOR_BORDER = "CBD5E1";

  // Configuración de anchos de columna
  ws.columns = [
    { key: "num", width: 6 },
    { key: "fColado", width: 14 },
    { key: "fEnsaye", width: 14 },
    { key: "edad", width: 10 },
    { key: "d1", width: 12 },
    { key: "d2", width: 12 },
    { key: "long", width: 12 },
    { key: "area", width: 14 },
    { key: "carga", width: 15 },
    { key: "fc", width: 15 },
    { key: "pct", width: 12 },
  ];

  // 2. Encabezado Institucional (Fila 1)
  ws.mergeCells("A1:K1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "CERTIFICADO DE CONTROL DE CALIDAD - RESISTENCIA A LA COMPRESIÓN";
  titleCell.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: COLOR_HEADER_TXT } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_HEADER_BG } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  // 3. Metadatos de la Obra y Mezcla (Filas 3 a 6)
  const metaLabels = [
    { cell: "B3", val: "Cliente:", target: "C3", targetVal: dataset.cliente },
    { cell: "B4", val: "Obra:", target: "C4", targetVal: dataset.obra },
    { cell: "B5", val: "Elemento:", target: "C5", targetVal: dataset.elemento || "-" },
    { cell: "B6", val: "Concretera:", target: "C6", targetVal: dataset.concretera || "-" },
    { cell: "G3", val: "f'c Proyecto:", target: "H3", targetVal: dataset.fcDisenoKgCm2, isNum: true },
    { cell: "G4", val: "Edad Garantía:", target: "H4", targetVal: `${dataset.edadGarantiaDias} días` },
    { cell: "G5", val: "Folio:", target: "H5", targetVal: dataset.folio },
    { cell: "G6", val: "Norma:", target: "H6", targetVal: "ASTM C39 / NMX-C-083" },
  ];

  for (const m of metaLabels) {
    const lbl = ws.getCell(m.cell);
    lbl.value = m.val;
    lbl.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "475569" } };

    const valCell = ws.getCell(m.target);
    valCell.value = m.targetVal;
    valCell.font = { name: "Segoe UI", size: 9, bold: m.isNum || m.cell === "G5" };
    if (m.isNum) {
      valCell.numFmt = "#,##0";
    }
  }

  // 4. Tabla de Especímenes (Encabezados en Fila 9)
  const headers = [
    "#",
    "F. Colado",
    "F. Ensaye",
    "Edad (d)",
    "D1 (mm)",
    "D2 (mm)",
    "L (mm)",
    "Área (cm²)",
    "Carga (kg)",
    "f'c (kg/cm²)",
    "% f'c",
  ];
  const headerRow = ws.getRow(9);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: COLOR_HEADER_TXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ACCENT_BG } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: COLOR_BORDER } },
      bottom: { style: "medium", color: { argb: COLOR_HEADER_BG } },
      left: { style: "thin", color: { argb: COLOR_BORDER } },
      right: { style: "thin", color: { argb: COLOR_BORDER } },
    };
  });

  // 5. Inyección de Filas con FÓRMULAS ACTIVAS VIVAS de Excel
  let currentRow = 10;
  for (const item of dataset.especimenes) {
    const r = ws.getRow(currentRow);
    r.height = 20;

    r.getCell(1).value = item.numero;
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

    // Fechas
    const formatDateStr = (d?: Date | string) => {
      if (!d) return "-";
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      return String(d).slice(0, 10);
    };

    r.getCell(2).value = formatDateStr(item.fechaColado);
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };

    r.getCell(3).value = formatDateStr(item.fechaEnsaye);
    r.getCell(3).alignment = { horizontal: "center", vertical: "middle" };

    r.getCell(4).value = item.edadDias;
    r.getCell(4).alignment = { horizontal: "center", vertical: "middle" };

    r.getCell(5).value = item.diametro1Mm;
    r.getCell(5).numFmt = "0.0";
    r.getCell(5).alignment = { horizontal: "right", vertical: "middle" };

    r.getCell(6).value = item.diametro2Mm;
    r.getCell(6).numFmt = "0.0";
    r.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

    r.getCell(7).value = item.longitudMm;
    r.getCell(7).numFmt = "0.0";
    r.getCell(7).alignment = { horizontal: "right", vertical: "middle" };

    // FÓRMULA VIVA: Área Transversal A = pi * ((D1+D2)/20)^2 / 4
    r.getCell(8).value = {
      formula: `ROUND(PI()*POWER(((E${currentRow}+F${currentRow})/2)/10, 2)/4, 2)`,
      result: item.areaCm2,
    };
    r.getCell(8).numFmt = "0.00";
    r.getCell(8).alignment = { horizontal: "right", vertical: "middle" };

    r.getCell(9).value = item.cargaMaximaKg;
    r.getCell(9).numFmt = "#,##0";
    r.getCell(9).alignment = { horizontal: "right", vertical: "middle" };

    // FÓRMULA VIVA: Resistencia Corregida f_c = (Carga / Área) * Factor L/D (ASTM C39 / NMX-C-083)
    const factorLd = typeof item.factorLd === "number" ? item.factorLd : 1.0;
    r.getCell(10).value = {
      formula:
        factorLd < 1.0
          ? `ROUND((I${currentRow}/H${currentRow})*${factorLd.toFixed(3)}, 1)`
          : `ROUND(I${currentRow}/H${currentRow}, 1)`,
      result: item.resistenciaKgCm2,
    };
    r.getCell(10).numFmt = "0.0";
    r.getCell(10).font = { bold: true };
    r.getCell(10).alignment = { horizontal: "right", vertical: "middle" };

    // FÓRMULA VIVA: Porcentaje de Cumplimiento respecto a celda fija $H$3
    r.getCell(11).value = {
      formula: `ROUND((J${currentRow}/$H$3)*100, 1)`,
      result: item.porcentajeFc,
    };
    r.getCell(11).numFmt = '0.0"%"';
    r.getCell(11).font = { bold: true };
    r.getCell(11).alignment = { horizontal: "right", vertical: "middle" };

    // Bordes y zebra striping
    r.eachCell((c) => {
      c.border = {
        top: { style: "thin", color: { argb: COLOR_BORDER } },
        bottom: { style: "thin", color: { argb: COLOR_BORDER } },
        left: { style: "thin", color: { argb: COLOR_BORDER } },
        right: { style: "thin", color: { argb: COLOR_BORDER } },
      };
      if (currentRow % 2 === 0) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA_BG } };
      }
    });

    currentRow++;
  }

  // 6. Resumen Estadístico al Pie con Fórmulas ACI 214R
  const summaryRow = currentRow + 1;
  const lastDataRow = currentRow - 1;

  ws.getCell(`I${summaryRow}`).value = "Promedio 28d:";
  ws.getCell(`I${summaryRow}`).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "0F172A" } };
  ws.getCell(`I${summaryRow}`).alignment = { horizontal: "right", vertical: "middle" };

  const promVal = dataset.promedio28d ?? (dataset.especimenes[0]?.resistenciaKgCm2 || 0);
  ws.getCell(`J${summaryRow}`).value = {
    formula: `AVERAGEIF(D10:D${lastDataRow}, 28, J10:J${lastDataRow})`,
    result: promVal,
  };
  ws.getCell(`J${summaryRow}`).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "16734C" } };
  ws.getCell(`J${summaryRow}`).numFmt = "0.0";
  ws.getCell(`J${summaryRow}`).alignment = { horizontal: "right", vertical: "middle" };

  // 7. Formato Condicional Semafórico sobre Columna K (% f'c)
  if (lastDataRow >= 10) {
    ws.addConditionalFormatting({
      ref: `K10:K${lastDataRow}`,
      rules: [
        {
          priority: 1,
          type: "cellIs",
          operator: "lessThan",
          formulae: ["85"],
          style: {
            fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FEE2E2" } },
            font: { color: { argb: "991B1B" }, bold: true },
          },
        },
        {
          priority: 2,
          type: "cellIs",
          operator: "between",
          formulae: ["85", "99.9"],
          style: {
            fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FEF3C7" } },
            font: { color: { argb: "92400E" } },
          },
        },
        {
          priority: 3,
          type: "cellIs",
          operator: "greaterThan",
          formulae: ["99.9"],
          style: {
            fill: { type: "pattern", pattern: "solid", bgColor: { argb: "DCFCE7" } },
            font: { color: { argb: "166534" }, bold: true },
          },
        },
      ],
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

