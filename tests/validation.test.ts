import assert from "node:assert/strict";
import test from "node:test";
import { muestraSchema, validateRanges } from "../src/lib/validation";

function validSample() {
  return {
    fechaMuestreo: "2026-10-13T00:00:00-05:00",
    cliente: "Cliente de prueba",
    obra: "Obra de prueba",
    tipoConcreto: "Concreto convencional",
    noMuestra: "TEST-001",
    estatusRecoleccion: "PENDIENTE" as const,
    numeroEspecimenes: 1,
    especimenes: [{ numero: 1, edadDias: 7, tipo: "CILINDRO_15X30" as const, fechaEnsaye: "2026-10-20T00:00:00-05:00" }],
  };
}

test("acepta fechas civiles con el huso horario de Cancun", () => {
  assert.equal(muestraSchema.safeParse(validSample()).success, true);
});

test("rechaza numeros de especimen repetidos", () => {
  const sample = validSample();
  const parsed = muestraSchema.safeParse({ ...sample, numeroEspecimenes: 2, especimenes: [sample.especimenes[0], sample.especimenes[0]] });
  assert.equal(parsed.success, false);
});

test("rechaza horarios de transporte fuera de orden", () => {
  const parsed = muestraSchema.safeParse({
    ...validSample(),
    salidaPlanta: "2026-10-13T10:00:00-05:00",
    llegadaObra: "2026-10-13T09:00:00-05:00",
  });
  assert.equal(parsed.success, false);
});

test("valida limites y concordancia de especimenes", () => {
  const parsed = muestraSchema.parse({ ...validSample(), tempAmbienteC: -31, numeroEspecimenes: 0 });
  const errors = validateRanges(parsed);
  assert.equal(errors.some((message) => message.includes("temperatura ambiente")), true);
  assert.equal(errors.some((message) => message.includes("especímenes")), true);
});

test("la plantilla de captura limita cada muestra a cuatro especimenes", () => {
  const sample = validSample();
  const especimenes = Array.from({ length: 5 }, (_, index) => ({ ...sample.especimenes[0], numero: index + 1 }));
  const parsed = muestraSchema.safeParse({ ...sample, numeroEspecimenes: 5, especimenes });
  assert.equal(parsed.success, false);
});
