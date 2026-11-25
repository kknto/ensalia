import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PROFILE_CONFIGURATION } from "../src/lib/config/defaults";
import { importProfileSchema, profileConfigurationSchema } from "../src/lib/config/schema";
import { canonicalConfiguration, configurationChecksum, configurationSnapshot } from "../src/lib/config/service";

test("la configuracion Ensalia por defecto cumple el contrato", () => {
  const parsed = profileConfigurationSchema.parse(DEFAULT_PROFILE_CONFIGURATION);
  assert.equal(parsed.identidad.nombreComercial, "Ensalia");
  assert.equal(parsed.modulos.personalizacion, true);
  assert.equal(parsed.reglas.especimenesObjetivoPorMuestra, 4);
  assert.equal(parsed.reglas.especimenesMaximosPorMuestra, 4);
});

test("normaliza perfiles anteriores al limite publicado de cuatro especimenes", () => {
  const legacy = structuredClone(DEFAULT_PROFILE_CONFIGURATION) as unknown as Record<string, unknown>;
  const rules = legacy.reglas as Record<string, unknown>;
  rules.especimenesObjetivoPorMuestra = 12;
  rules.especimenesMaximosPorMuestra = 100;
  const parsed = profileConfigurationSchema.parse(legacy);
  assert.equal(parsed.reglas.especimenesObjetivoPorMuestra, 4);
  assert.equal(parsed.reglas.especimenesMaximosPorMuestra, 4);
});

test("el checksum es estable aunque cambie el orden de las propiedades", () => {
  const reordered = JSON.parse(JSON.stringify(DEFAULT_PROFILE_CONFIGURATION)) as typeof DEFAULT_PROFILE_CONFIGURATION;
  reordered.identidad = { ...reordered.identidad, nombreComercial: "Ensalia" };
  assert.equal(configurationChecksum(reordered), configurationChecksum(DEFAULT_PROFILE_CONFIGURATION));
  assert.equal(canonicalConfiguration(reordered), canonicalConfiguration(DEFAULT_PROFILE_CONFIGURATION));
});

test("el snapshot conserva modulos, reglas y evidencia documental", () => {
  const snapshot = configurationSnapshot(DEFAULT_PROFILE_CONFIGURATION);
  assert.equal(snapshot.modulos.captura, true);
  assert.deepEqual(snapshot.reglas.equipos, []);
  assert.equal(snapshot.identidad.nombreComercial, "Ensalia");
  assert.equal(snapshot.exportaciones.length, 1);
});

test("rechaza colores, campos y formatos de folio inseguros", () => {
  const invalid = structuredClone(DEFAULT_PROFILE_CONFIGURATION);
  invalid.identidad.colorPrimario = "red";
  invalid.operacion.formatoFolio = "<script>";
  assert.equal(profileConfigurationSchema.safeParse(invalid).success, false);
});

test("un paquete de importacion exige checksum SHA-256", () => {
  const result = importProfileSchema.safeParse({ formato: "ENSALIA_PROFILE", versionFormato: 1, perfil: { clave: "CLIENTE", nombreInterno: "Cliente" }, configuracion: DEFAULT_PROFILE_CONFIGURATION, checksum: "incorrecto" });
  assert.equal(result.success, false);
});
