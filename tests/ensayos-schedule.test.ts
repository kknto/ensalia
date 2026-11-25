import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import {
  addCivilDays,
  civilDate,
  defaultMonthRange,
  filtersFromUrl,
  scheduleFilterSchema,
  scheduleItem,
  testSchedule,
} from "../src/lib/ensayos/schedule";
import { dailyTestCsv, renderDailyTestPdf } from "../src/lib/ensayos/report";

type Source = Parameters<typeof scheduleItem>[0];

function source(options: Partial<Source> & { id: string; sampleId?: string; date?: string; age?: number | null; explicit?: string | null }): Source {
  const sampleId = options.sampleId || `M-${options.id}`;
  return {
    id: options.id,
    numero: options.numero ?? 1,
    tipo: options.tipo ?? "CILINDRO_15X30",
    edadDias: options.age === undefined ? 7 : options.age,
    fechaEnsaye: options.explicit ? new Date(`${options.explicit}T00:00:00-05:00`) : null,
    muestra: {
      id: sampleId,
      idMuestra: sampleId,
      noMuestra: `N-${sampleId}`,
      fechaMuestreo: new Date(`${options.date || "2024-01-01"}T00:00:00-05:00`),
      cliente: "Cliente",
      obra: "Obra",
      elemento: null,
      fcKgCm2: new Prisma.Decimal(250),
      estatusBitacora: "REVISADA",
      colado: { id: "COL-1", folio: "COLADO-1" },
      ...options.muestra,
    },
    asignacionesEquipo: options.asignacionesEquipo || [],
  };
}

test("suma edades como fechas civiles atravesando mes, anio y febrero bisiesto", () => {
  assert.equal(addCivilDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addCivilDays("2024-02-28", 2), "2024-03-01");
  assert.equal(addCivilDays("2024-12-31", 1), "2025-01-01");
  assert.throws(() => addCivilDays("28/02/2024", 1));
  assert.throws(() => addCivilDays("2024-02-28", 1.5));
});

test("interpreta la fecha en America Cancun sin desplazar el dia civil", () => {
  assert.equal(civilDate(new Date("2024-01-02T04:30:00Z")), "2024-01-01");
  assert.equal(civilDate(new Date("2024-01-02T05:00:00Z")), "2024-01-02");
});

test("la fecha registrada prevalece y conserva calculo, procedencia y programacion provisional", () => {
  const item = scheduleItem(source({
    id: "E-1",
    date: "2024-01-01",
    age: 7,
    explicit: "2024-01-09",
    muestra: { estatusBitacora: "BORRADOR" },
    asignacionesEquipo: [{ codigoInternoSnapshot: "C15-001", estado: "ASIGNADA" }],
  }));
  assert.equal(item.fechaProgramada, "2024-01-09");
  assert.equal(item.fechaCalculada, "2024-01-08");
  assert.equal(item.origenFecha, "REGISTRADA");
  assert.equal(item.programacion, "PROVISIONAL");
  assert.equal(item.moldeCodigo, "C15-001");
});

test("dos muestras del mismo colado y cuatro cilindros nunca se fusionan", async () => {
  const rows = [
    ...Array.from({ length: 4 }, (_, index) => source({ id: `A-${index}`, sampleId: "M-A", numero: index + 1, date: "2024-01-01", age: 7 })),
    ...Array.from({ length: 4 }, (_, index) => source({ id: `B-${index}`, sampleId: "M-B", numero: index + 1, date: "2024-01-01", age: 7 })),
  ];
  const result = await testSchedule({ especimen: { findMany: async () => rows } }, scheduleFilterSchema.parse({ desde: "2024-01-08", hasta: "2024-01-08" }));
  assert.equal(result.items.length, 8);
  assert.deepEqual(new Set(result.items.map((item) => item.muestra.idMuestra)), new Set(["M-A", "M-B"]));
  assert.equal(result.resumen.porFecha["2024-01-08"], 8);
  assert.equal(result.resumen.total, result.items.length);
});

test("la consulta solicita excluir anuladas y puede excluir borradores", async () => {
  let captured: Record<string, unknown> | undefined;
  await testSchedule({ especimen: { findMany: async (args) => { captured = args as Record<string, unknown>; return []; } } }, scheduleFilterSchema.parse({ desde: "2024-01-01", hasta: "2024-01-31", incluirBorradores: "false" }));
  const where = captured?.where as { muestra: { estatusBitacora: unknown; NOT?: unknown } };
  assert.deepEqual(where.muestra.estatusBitacora, { not: "ANULADA" });
  assert.deepEqual(where.muestra.NOT, { estatusBitacora: "BORRADOR" });
});

test("filtra por rango y texto y mantiene consistentes agenda y conteos", async () => {
  const rows = [
    source({ id: "E-1", sampleId: "M-1", date: "2024-03-01", age: 7, muestra: { cliente: "Laboratorio Norte" } }),
    source({ id: "E-2", sampleId: "M-2", date: "2024-03-01", age: 14, muestra: { cliente: "Otro" } }),
    source({ id: "E-3", sampleId: "M-3", date: "2024-04-01", age: 7, muestra: { cliente: "Laboratorio Norte" } }),
  ];
  const result = await testSchedule({ especimen: { findMany: async () => rows } }, scheduleFilterSchema.parse({ desde: "2024-03-01", hasta: "2024-03-31", q: "norte" }));
  assert.deepEqual(result.items.map((item) => item.especimenId), ["E-1"]);
  assert.equal(Object.values(result.resumen.porFecha).reduce((sum, value) => sum + value, 0), result.resumen.total);
});

test("valida rangos y construye correctamente el ultimo dia del mes", () => {
  assert.deepEqual(defaultMonthRange("2024-02-10"), { desde: "2024-02-01", hasta: "2024-02-29" });
  assert.equal(filtersFromUrl(new URL("http://local/?desde=2024-03-02&hasta=2024-03-01")).success, false);
  assert.equal(filtersFromUrl(new URL("http://local/?desde=2024-01-01&hasta=2025-02-01")).success, false);
  assert.equal(filtersFromUrl(new URL("http://local/?tipo=TIPO_INEXISTENTE")).success, false);
  const daily = filtersFromUrl(new URL("http://local/?fecha=2024-03-01"), true);
  assert.equal(daily.success && daily.data.incluirBorradores, false);
});

test("el CSV diario coincide con los items y neutraliza formulas", () => {
  const item = scheduleItem(source({ id: "CSV-1", explicit: "2024-01-08", muestra: { cliente: "=PELIGRO" } }));
  const csv = dailyTestCsv({ items: [item] });
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /Fecha prevista/);
  assert.match(csv, /2024-01-08/);
  assert.match(csv, /"'=PELIGRO"/);
  assert.equal(csv.split("\r\n").length, 2);
});

test("el PDF diario genera una hoja vacia valida y pagina lotes grandes", async () => {
  const base = {
    fecha: "2024-01-08", operador: "QA", generadoEn: new Date("2024-01-08T12:00:00Z"), folio: "PE-TEST-001",
    identidad: { nombreComercial: "Ensalia" },
    documento: { titulo: "Programa diario de retiro y ensaye", codigo: "FO-LAB-PE", revision: "00", firmas: ["Preparo", "Tecnico", "Reviso"], mostrarCamposManuales: true },
  };
  const empty = await PDFDocument.load(await renderDailyTestPdf({ ...base, items: [] }));
  assert.equal(empty.getPageCount(), 1);
  const items = Array.from({ length: 18 }, (_, index) => scheduleItem(source({ id: `PDF-${index}`, numero: index + 1, explicit: "2024-01-08" })));
  const paged = await PDFDocument.load(await renderDailyTestPdf({ ...base, items }));
  assert.equal(paged.getPageCount(), 2);
});
