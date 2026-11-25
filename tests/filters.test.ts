import assert from "node:assert/strict";
import test from "node:test";
import { sampleFilters } from "../src/lib/api";

test("construye un rango diario usando America Cancun", () => {
  const result = sampleFilters(new URL("http://localhost/api/muestras?desde=2026-10-13&hasta=2026-10-13"));
  assert.equal("error" in result, false);
  if ("error" in result) return;
  const range = result.fechaMuestreo as { gte: Date; lte: Date };
  assert.equal(range.gte.toISOString(), "2026-10-13T05:00:00.000Z");
  assert.equal(range.lte.toISOString(), "2026-10-14T04:59:59.999Z");
});

test("rechaza estados y rangos de fecha invalidos", () => {
  assert.deepEqual(sampleFilters(new URL("http://localhost/api/muestras?estado=INVALIDO")), { error: "Filtros no válidos" });
  assert.deepEqual(sampleFilters(new URL("http://localhost/api/muestras?desde=2026-10-14&hasta=2026-10-13")), { error: "La fecha inicial no puede ser posterior a la fecha final" });
});
