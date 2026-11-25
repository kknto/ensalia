import assert from "node:assert/strict";
import test from "node:test";
import {
  asignarEquiposSchema,
  calibracionEquipoSchema,
  cambioEstadoEquipoSchema,
  devolverEquiposSchema,
  equipoSchema,
  tipoEquipoSchema,
} from "../src/lib/validation";

const cuidA = "cm12345678901234567890123";
const cuidB = "cm22345678901234567890123";

test("normaliza los textos y valida los datos base del inventario", () => {
  const tipo = tipoEquipoSchema.parse({ codigo: "  molde_15x30  ", nombre: "  Molde 15 x 30  " });
  assert.equal(tipo.codigo, "molde_15x30");
  assert.equal(tipo.nombre, "Molde 15 x 30");

  const equipo = equipoSchema.parse({ tipoId: cuidA, numeroSerie: "  SER-001  ", codigoInterno: "  EQ-001  " });
  assert.equal(equipo.numeroSerie, "SER-001");
  assert.equal(equipo.codigoInterno, "EQ-001");
});

test("rechaza equipos duplicados en un mismo lote", () => {
  const parsed = asignarEquiposSchema.safeParse({
    versionMuestra: 0,
    equipos: [{ equipoId: cuidA }, { equipoId: cuidA, especimenId: cuidB }],
  });
  assert.equal(parsed.success, false);
});

test("acepta exactamente cuatro moldes distintos para cuatro especímenes", () => {
  const equipos = Array.from({ length: 4 }, (_, index) => ({
    equipoId: `cm${index + 3}2345678901234567890123`,
    especimenId: `cm${index + 7}2345678901234567890123`,
  }));
  assert.equal(asignarEquiposSchema.safeParse({ versionMuestra: 0, equipos }).success, true);
});

test("rechaza vigencia anterior a la fecha de calibración", () => {
  const parsed = calibracionEquipoSchema.safeParse({
    fecha: "2026-10-14T09:00:00-05:00",
    venceEn: "2026-10-13T09:00:00-05:00",
    resultado: "APROBADO",
  });
  assert.equal(parsed.success, false);
});

test("la devolución exige asignaciones y limita el estado final", () => {
  assert.equal(devolverEquiposSchema.safeParse({ versionMuestra: 0, asignacionIds: [] }).success, false);
  assert.equal(devolverEquiposSchema.safeParse({ versionMuestra: 0, asignacionIds: [cuidA], estadoFinal: "BAJA" }).success, false);
});

test("un cambio de estado exige versión y motivo", () => {
  assert.equal(cambioEstadoEquipoSchema.safeParse({ estado: "MANTENIMIENTO", version: 0, motivo: "" }).success, false);
  assert.equal(cambioEstadoEquipoSchema.safeParse({ estado: "MANTENIMIENTO", version: 0, motivo: "Verificación" }).success, true);
});
