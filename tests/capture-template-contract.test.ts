import assert from "node:assert/strict";
import test from "node:test";
import { CONCRETE_CAPTURE_TEMPLATE_V1, CONCRETE_CAPTURE_TEMPLATE_V1_HEADERS } from "../src/lib/templates/capture-template";

const EXPECTED_HEADERS = [
  "Fecha de Muestreo", "Cliente", "Obra", "Localizacion", "Procedencia", "Elemento", "Revenimiento (cm)", "fc (Kg/cm2)",
  "Edad Cilindro", "Tipo de Concreto", "Concretera", "TMA (mm)", "Cemento", "No. Muestra", "Remision", "Camion", "Volumen (m3)",
  "Salida Planta", "Llegada Obra", "Inicio Descarga", "Fin Descarga", "Revenimiento obtenido 1 (cm)", "Temp. Ambiente (°C)",
  "Observaciones", "Contenido aire %", "Placa de Revenimiento", "Cono de revenimiento", "Varilla", "Cucharon", "Termometro", "Carretilla",
  "Equipo Contenido Aire", "Cilindro 15x30cm", "E-15x30", "Cilindro 10x20cm", "e-10x20", "Viga 50x15x15cm", "V-50",
  "No Especimenes", "Especimen 1 (Días)", "Especimen 2 (Días)", "Especimen 3 (Días)", "Especimen 4 (Días)",
  "Laboratorista de Campo", "Residente de Obra", "Fecha de Ensaye-Cilindro 1", "Fecha de Ensaye-Cilindro 2",
  "Fecha de Ensaye-Cilindro 3", "Fecha de Ensaye-Cilindro 4", "Temp. Concreto (°C)", "ID_Muestra", "Ubicacion",
  "Estatus Bitacora", "Estatus Recoleccion",
] as const;

test("la plantilla de captura V1 conserva exactamente sus 54 encabezados y orden", () => {
  assert.equal(CONCRETE_CAPTURE_TEMPLATE_V1.key, "ENSALIA_CONCRETO");
  assert.equal(CONCRETE_CAPTURE_TEMPLATE_V1.version, 1);
  assert.equal(CONCRETE_CAPTURE_TEMPLATE_V1.fields.length, 54);
  assert.deepEqual(CONCRETE_CAPTURE_TEMPLATE_V1_HEADERS, EXPECTED_HEADERS);
  assert.deepEqual(CONCRETE_CAPTURE_TEMPLATE_V1.fields.map((field) => field.position), Array.from({ length: 54 }, (_, index) => index + 1));
});

test("cada campo publicado tiene clave y origen únicos", () => {
  const keys = CONCRETE_CAPTURE_TEMPLATE_V1.fields.map((field) => field.key);
  const sources = CONCRETE_CAPTURE_TEMPLATE_V1.fields.map((field) => field.source);
  assert.equal(new Set(keys).size, 54);
  assert.equal(new Set(sources).size, 54);
});

test("la plantilla publicada no puede mutarse en tiempo de ejecución", () => {
  assert.equal(Object.isFrozen(CONCRETE_CAPTURE_TEMPLATE_V1), true);
  assert.equal(Object.isFrozen(CONCRETE_CAPTURE_TEMPLATE_V1.fields), true);
  assert.equal(Object.isFrozen(CONCRETE_CAPTURE_TEMPLATE_V1_HEADERS), true);
  assert.equal(CONCRETE_CAPTURE_TEMPLATE_V1.fields.every(Object.isFrozen), true);
});
