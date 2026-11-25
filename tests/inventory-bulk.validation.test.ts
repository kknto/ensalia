import assert from "node:assert/strict";
import test from "node:test";
import { bulkInventoryHash, bulkInventorySchema, validateBulkInventory } from "../src/lib/inventory/bulk";

function client(options: { requiresSerial?: boolean; existing?: string[] } = {}) {
  return {
    tipoEquipo: { findFirst: async () => ({ id: "cm00000000000000000000001", codigo: "MOLDE_C15", nombre: "Molde 15 x 30", requiereSerie: options.requiresSerial ?? false, requiereCalibracion: false }) },
    equipo: { findMany: async () => (options.existing ?? []).map((codigoInterno) => ({ codigoInterno })) },
  } as Parameters<typeof validateBulkInventory>[0];
}

function input(quantity = 100) {
  return bulkInventorySchema.parse({
    idempotencyKey: "bulk-test-0001",
    tipoId: "cm00000000000000000000001",
    metodo: "RANGO",
    items: Array.from({ length: quantity }, (_, index) => ({ codigoInterno: `c15-${String(index + 1).padStart(3, "0")}` })),
  });
}

test("valida y normaliza un lote consecutivo de 100 equipos", async () => {
  const parsed = input();
  const result = await validateBulkInventory(client(), parsed);
  assert.equal(result.valido, true);
  assert.equal(result.resumen.total, 100);
  assert.equal(result.filas[0].codigoInterno, "C15-001");
  assert.equal(result.filas[99].codigoInterno, "C15-100");
});

test("rechaza duplicados internos sin distinguir mayusculas", async () => {
  const parsed = bulkInventorySchema.parse({ ...input(1), items: [{ codigoInterno: "C15-001" }, { codigoInterno: "c15-001" }] });
  const result = await validateBulkInventory(client(), parsed);
  assert.equal(result.valido, false);
  assert.match(result.errores[0].mensaje, /repite/);
});

test("rechaza un codigo existente aunque cambie mayusculas", async () => {
  const result = await validateBulkInventory(client({ existing: ["c15-001"] }), input(1));
  assert.equal(result.valido, false);
  assert.match(result.errores[0].mensaje, /ya existe/);
});

test("exige serie solo cuando el tipo de equipo la configura", async () => {
  const result = await validateBulkInventory(client({ requiresSerial: true }), input(1));
  assert.equal(result.valido, false);
  assert.equal(result.errores[0].campo, "numeroSerie");
});

test("limita la carga a 500 filas y rechaza codigos inseguros", () => {
  assert.equal(bulkInventorySchema.safeParse({ ...input(1), items: Array.from({ length: 501 }, (_, index) => ({ codigoInterno: `X-${index}` })) }).success, false);
  assert.equal(bulkInventorySchema.safeParse({ ...input(1), items: [{ codigoInterno: "=FORMULA" }] }).success, false);
});

test("el checksum es estable para reintentos del mismo contenido", () => {
  const parsed = input(2);
  assert.equal(bulkInventoryHash(parsed), bulkInventoryHash(parsed));
  assert.notEqual(bulkInventoryHash(parsed), bulkInventoryHash({ ...parsed, items: [...parsed.items, { ...parsed.items[0], codigoInterno: "C15-999" }] }));
});
