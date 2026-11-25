import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PROFILE_CONFIGURATION } from "../src/lib/config/defaults";
import { equipmentRuleError, validateConfiguredFields, validateSpecimenRules } from "../src/lib/config/operational";
import { profileConfigurationSchema } from "../src/lib/config/schema";

test("restaura campos bloqueados y rechaza columnas CSV desconocidas", () => {
  const hidden = structuredClone(DEFAULT_PROFILE_CONFIGURATION);
  hidden.formulario.campos.cliente.visible = false;
  hidden.formulario.campos.cliente.etiqueta = "Etiqueta alterada";
  const normalized = profileConfigurationSchema.parse(hidden);
  assert.equal(normalized.formulario.campos.cliente.visible, true);
  assert.equal(normalized.formulario.campos.cliente.etiqueta, "Cliente");
  const column = structuredClone(DEFAULT_PROFILE_CONFIGURATION);
  column.exportaciones[0].columnas.push("password");
  assert.equal(profileConfigurationSchema.safeParse(column).success, false);
});

test("detecta campos requeridos usando etiqueta personalizada", () => {
  const config = structuredClone(DEFAULT_PROFILE_CONFIGURATION);
  config.formulario.campos.localizacion = { visible: true, obligatorio: true, etiqueta: "Frente de obra", orden: 25 };
  assert.deepEqual(validateConfiguredFields(config, { cliente: "A", obra: "B", tipoConcreto: "C", localizacion: "" }), ["Frente de obra"]);
});

test("limita tipos de especimen por perfil", () => {
  const config = structuredClone(DEFAULT_PROFILE_CONFIGURATION);
  config.reglas.tiposEspecimenHabilitados = ["CILINDRO_15X30"];
  assert.equal(validateSpecimenRules(config, [{ tipo: "VIGA_50X15X15" }]), "VIGA_50X15X15");
});

test("evalua cantidades y asociaciones por especimen", () => {
  const config = structuredClone(DEFAULT_PROFILE_CONFIGURATION);
  config.reglas.equipos = [{ tipoEquipoCodigo: "MOLDE_CILINDRO_15X30", cantidadMinima: 1, cantidadMaxima: null, porEspecimen: true, tiposEspecimen: ["CILINDRO_15X30"], requiereCalibracion: false }];
  const specimens = [{ id: "uno", tipo: "CILINDRO_15X30" }, { id: "dos", tipo: "CILINDRO_15X30" }];
  const error = equipmentRuleError(config, [{ tipoCodigo: "MOLDE_CILINDRO_15X30", especimenId: "uno", calibracionValida: true }], specimens);
  assert.match(error || "", /se requieren 2/);
  assert.equal(equipmentRuleError(config, [
    { tipoCodigo: "MOLDE_CILINDRO_15X30", especimenId: "uno", calibracionValida: true },
    { tipoCodigo: "MOLDE_CILINDRO_15X30", especimenId: "dos", calibracionValida: true },
  ], specimens), null);
});
