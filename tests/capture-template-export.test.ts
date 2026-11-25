import assert from "node:assert/strict";
import test from "node:test";
import { CONCRETE_CAPTURE_TEMPLATE_V1_HEADERS } from "../src/lib/templates/capture-template";
import { concreteCaptureTemplateRow, renderConcreteCaptureTemplateCsv } from "../src/lib/templates/capture-template-csv";

test("exporta la plantilla fija con exactamente 54 columnas y sin columnas operativas", () => {
  const csv = renderConcreteCaptureTemplateCsv([]);
  const header = csv.slice(1).split("\r\n")[0];
  assert.equal(CONCRETE_CAPTURE_TEMPLATE_V1_HEADERS.length, 54);
  assert.equal(header, CONCRETE_CAPTURE_TEMPLATE_V1_HEADERS.map((item) => `"${item}"`).join(","));
  assert.doesNotMatch(header, /Equipos y series|"Especimenes"/);
});

test("coloca edades y fechas por numero de especimen y conserva los campos finales", () => {
  const row = concreteCaptureTemplateRow({
    fechaMuestreo: new Date("2026-10-27T05:00:00.000Z"), cliente: "Cliente", obra: "Obra", idMuestra: "ID-001",
    estatusBitacora: "BORRADOR", estatusRecoleccion: "PENDIENTE", numeroEspecimenes: 4,
    especimenes: [
      { numero: 2, edadDias: 14, fechaEnsaye: new Date("2026-11-10T05:00:00.000Z") },
      { numero: 1, edadDias: 7, fechaEnsaye: new Date("2026-11-03T05:00:00.000Z") },
      { numero: 4, edadDias: 56, fechaEnsaye: null },
      { numero: 3, edadDias: 28, fechaEnsaye: new Date("2026-11-24T05:00:00.000Z") },
    ],
  });
  const byHeader = Object.fromEntries(CONCRETE_CAPTURE_TEMPLATE_V1_HEADERS.map((header, index) => [header, row[index]]));
  assert.equal(byHeader["Especimen 1 (Días)"], 7);
  assert.equal(byHeader["Especimen 4 (Días)"], 56);
  assert.equal(byHeader["Fecha de Ensaye-Cilindro 1"], "2026-11-03");
  assert.equal(byHeader["Fecha de Ensaye-Cilindro 4"], "");
  assert.equal(byHeader.ID_Muestra, "ID-001");
  assert.equal(byHeader["Estatus Bitacora"], "BORRADOR");
});

test("protege celdas de formula sin cambiar el encabezado fijo", () => {
  const csv = renderConcreteCaptureTemplateCsv([{ cliente: "=CMD()", especimenes: [] }]);
  assert.match(csv, /"'=CMD\(\)"/);
});

