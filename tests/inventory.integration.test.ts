import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { NextRequest } from "next/server";

const databaseName = `.inventory-${process.pid}-${Date.now()}.db`;
const databasePath = join(process.cwd(), "tests", databaseName);
// Prisma resuelve las URL SQLite relativas desde el directorio de schema.prisma.
process.env.DATABASE_URL = `file:../tests/${databaseName}`;
process.env.APP_ACCESS_CODE = "";

type Db = import("@prisma/client").PrismaClient;
let prisma: Db;
let assignEquipment: typeof import("../src/app/api/muestras/[id]/equipos/route").POST;
let returnEquipment: typeof import("../src/app/api/muestras/[id]/equipos/devolver/route").POST;
let transitionSample: typeof import("../src/app/api/muestras/[id]/[accion]/route").POST;
let createBulkInventory: typeof import("../src/app/api/equipos/cargas/route").POST;

const headers = { "content-type": "application/json", "x-operator-name": "Tester inventario" };
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const actionContext = (id: string, accion: string) => ({ params: Promise.resolve({ id, accion }) });
const request = (url: string, body: unknown) => new NextRequest(url, { method: "POST", headers, body: JSON.stringify(body) });

before(async () => {
  // Prisma 6 en Windows no crea de forma fiable un archivo SQLite en una ruta nueva.
  writeFileSync(databasePath, "");
  const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd prisma migrate deploy"] : ["prisma", "migrate", "deploy"];
  execFileSync(executable, args, {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! }, stdio: "pipe",
  });
  ({ prisma } = await import("../src/lib/prisma"));
  ({ POST: assignEquipment } = await import("../src/app/api/muestras/[id]/equipos/route"));
  ({ POST: returnEquipment } = await import("../src/app/api/muestras/[id]/equipos/devolver/route"));
  ({ POST: transitionSample } = await import("../src/app/api/muestras/[id]/[accion]/route"));
  ({ POST: createBulkInventory } = await import("../src/app/api/equipos/cargas/route"));
});

after(async () => {
  await prisma?.$disconnect();
  for (const suffix of ["", "-journal", "-shm", "-wal"]) rmSync(databasePath + suffix, { force: true });
});

async function fixture(specimenTypes: Array<"CILINDRO_15X30" | "CILINDRO_10X20" | "VIGA_50X15X15"> = []) {
  const operator = await prisma.operador.upsert({ where: { nombre: "Tester inventario" }, update: {}, create: { nombre: "Tester inventario" } });
  const stamp = `${Date.now()}-${Math.random()}`;
  const sample = await prisma.muestra.create({ data: {
    idMuestra: `TEST-${stamp}`, fechaMuestreo: new Date(), cliente: "Cliente", obra: "Obra", tipoConcreto: "Convencional",
    noMuestra: stamp, creadorId: operator.id, numeroEspecimenes: specimenTypes.length, inventarioGestionado: true,
    especimenes: { create: specimenTypes.map((tipo, index) => ({ numero: index + 1, tipo })) },
  }, include: { especimenes: { orderBy: { numero: "asc" } } } });
  return { operator, sample };
}

async function equipment(code: string, serial: string, options: { mold?: boolean; calibration?: Date | null } = {}) {
  const type = await prisma.tipoEquipo.upsert({ where: { codigo: code }, update: {}, create: {
    codigo: code, nombre: code, esMolde: options.mold ?? false, requiereCalibracion: options.calibration !== undefined,
  } });
  return prisma.equipo.create({ data: { tipoId: type.id, codigoInterno: `LAB-${serial}`, numeroSerie: serial, calibracionVigenteHasta: options.calibration } });
}

test("crea una carga masiva atomica y el reintento idempotente no duplica equipos", { concurrency: false }, async () => {
  const stamp = `${Date.now()}`;
  const type = await prisma.tipoEquipo.create({ data: { codigo: `BULK_${stamp}`, nombre: "Tipo masivo", requiereSerie: false } });
  const body = {
    idempotencyKey: `bulk-${stamp}-idempotente`, tipoId: type.id, metodo: "RANGO",
    items: Array.from({ length: 3 }, (_, index) => ({ codigoInterno: `bulk-${stamp}-${index + 1}` })),
  };
  const first = await createBulkInventory(request("http://localhost/api/equipos/cargas", body));
  assert.equal(first.status, 201, await first.text());
  const second = await createBulkInventory(request("http://localhost/api/equipos/cargas", body));
  assert.equal(second.status, 200, await second.text());
  assert.equal(await prisma.equipo.count({ where: { tipoId: type.id } }), 3);
  assert.equal(await prisma.cargaInventario.count({ where: { idempotencyKey: body.idempotencyKey } }), 1);
  assert.equal(await prisma.movimientoEquipo.count({ where: { cargaInventario: { idempotencyKey: body.idempotencyKey }, tipo: "ALTA" } }), 3);
});

test("revierte por completo la carga masiva cuando un codigo ya existe", { concurrency: false }, async () => {
  const stamp = `${Date.now()}`;
  const type = await prisma.tipoEquipo.create({ data: { codigo: `ROLLBACK_${stamp}`, nombre: "Tipo rollback", requiereSerie: false } });
  await prisma.equipo.create({ data: { tipoId: type.id, codigoInterno: `EXISTENTE-${stamp}` } });
  const body = {
    idempotencyKey: `bulk-${stamp}-rollback`, tipoId: type.id, metodo: "PEGADO",
    items: [{ codigoInterno: `NUEVO-${stamp}` }, { codigoInterno: `existente-${stamp}` }],
  };
  const response = await createBulkInventory(request("http://localhost/api/equipos/cargas", body));
  assert.equal(response.status, 409);
  assert.equal(await prisma.equipo.count({ where: { codigoInterno: `NUEVO-${stamp}` } }), 0);
  assert.equal(await prisma.cargaInventario.count({ where: { idempotencyKey: body.idempotencyKey } }), 0);
});

test("asigna cuatro moldes compatibles de forma atómica", { concurrency: false }, async () => {
  const { sample } = await fixture(Array(4).fill("CILINDRO_15X30"));
  const molds = await Promise.all(Array.from({ length: 4 }, (_, index) => equipment("MOLDE_CILINDRO_15X30", `M-4-${index}-${Date.now()}`, { mold: true })));
  const response = await assignEquipment(request(`http://localhost/api/muestras/${sample.id}/equipos`, {
    versionMuestra: sample.version,
    equipos: molds.map((item, index) => ({ equipoId: item.id, especimenId: sample.especimenes[index].id })),
  }), context(sample.id));
  assert.equal(response.status, 201, await response.text());
  assert.equal(await prisma.asignacionEquipo.count({ where: { muestraId: sample.id, estado: "ASIGNADA" } }), 4);
  assert.equal(await prisma.equipo.count({ where: { id: { in: molds.map((item) => item.id) }, estado: "ASIGNADO" } }), 4);
});

test("revierte el lote completo cuando un molde es incompatible", { concurrency: false }, async () => {
  const { sample } = await fixture(["CILINDRO_15X30", "CILINDRO_10X20"]);
  const valid = await equipment("MOLDE_CILINDRO_15X30", `ROLL-A-${Date.now()}`, { mold: true });
  const invalid = await equipment("MOLDE_CILINDRO_15X30", `ROLL-B-${Date.now()}`, { mold: true });
  const response = await assignEquipment(request(`http://localhost/api/muestras/${sample.id}/equipos`, {
    versionMuestra: sample.version,
    equipos: [{ equipoId: valid.id, especimenId: sample.especimenes[0].id }, { equipoId: invalid.id, especimenId: sample.especimenes[1].id }],
  }), context(sample.id));
  assert.equal(response.status, 409);
  assert.equal(await prisma.asignacionEquipo.count({ where: { muestraId: sample.id } }), 0);
  assert.equal(await prisma.equipo.count({ where: { id: { in: [valid.id, invalid.id] }, estado: "DISPONIBLE" } }), 2);
});

test("rechaza equipo calibrable vencido", { concurrency: false }, async () => {
  const { sample } = await fixture();
  const expired = await equipment("TERMOMETRO", `CAL-${Date.now()}`, { calibration: new Date("2020-01-01T00:00:00Z") });
  const response = await assignEquipment(request(`http://localhost/api/muestras/${sample.id}/equipos`, {
    versionMuestra: sample.version, equipos: [{ equipoId: expired.id }],
  }), context(sample.id));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /calibración vigente/);
});

test("reserva concurrente: una sola muestra obtiene el equipo", { concurrency: false }, async () => {
  const first = await fixture(); const second = await fixture();
  const item = await equipment("CONO_REVENIMIENTO", `RACE-${Date.now()}`);
  const [a, b] = await Promise.all([
    assignEquipment(request(`http://localhost/api/muestras/${first.sample.id}/equipos`, { versionMuestra: 0, equipos: [{ equipoId: item.id }] }), context(first.sample.id)),
    assignEquipment(request(`http://localhost/api/muestras/${second.sample.id}/equipos`, { versionMuestra: 0, equipos: [{ equipoId: item.id }] }), context(second.sample.id)),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  assert.equal(await prisma.asignacionEquipo.count({ where: { equipoId: item.id, estado: "ASIGNADA" } }), 1);
});

test("bloquea revisión si falta un molde gestionado", { concurrency: false }, async () => {
  const { sample } = await fixture(["CILINDRO_15X30"]);
  const response = await transitionSample(request(`http://localhost/api/muestras/${sample.id}/revisar`, {}), actionContext(sample.id, "revisar"));
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /Falta asignar un molde/);
});

test("bloquea revisión si falta un tipo obligatorio", { concurrency: false }, async () => {
  const { sample } = await fixture();
  const code = `OBLIGATORIO-${Date.now()}`;
  const requiredType = await prisma.tipoEquipo.create({
    data: { codigo: code, nombre: "Equipo obligatorio de prueba", obligatorioEnMuestra: true },
  });
  const response = await transitionSample(
    request(`http://localhost/api/muestras/${sample.id}/revisar`, {}),
    actionContext(sample.id, "revisar"),
  );
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /Equipo obligatorio de prueba/);
  await prisma.tipoEquipo.delete({ where: { id: requiredType.id } });
});

test("tras devolver equipos, editar una revisada la reabre y conserva el historial", { concurrency: false }, async () => {
  const { sample } = await fixture();
  await prisma.muestra.update({ where: { id: sample.id }, data: { estatusBitacora: "REVISADA", revisadoEn: new Date(), version: 3 } });
  const item = await equipment("CARRETILLA", `REOPEN-${Date.now()}`);
  const assignment = await prisma.asignacionEquipo.create({ data: {
    muestraId: sample.id, equipoId: item.id, asignadoPorId: sample.creadorId,
    tipoCodigoSnapshot: "CARRETILLA", tipoNombreSnapshot: "CARRETILLA", codigoInternoSnapshot: item.codigoInterno, numeroSerieSnapshot: item.numeroSerie,
  } });
  await prisma.equipo.update({ where: { id: item.id }, data: { estado: "ASIGNADO" } });
  const returned = await returnEquipment(request(`http://localhost/api/muestras/${sample.id}/equipos/devolver`, {
    versionMuestra: 3, asignacionIds: [assignment.id], estadoFinal: "DISPONIBLE",
  }), context(sample.id));
  assert.equal(returned.status, 200, await returned.text());

  const route = await import("../src/app/api/muestras/[id]/route");
  const body = { fechaMuestreo: new Date().toISOString(), cliente: "Cliente editado", obra: "Obra", tipoConcreto: "Convencional", noMuestra: sample.noMuestra, numeroEspecimenes: 0, especimenes: [], estatusRecoleccion: "PENDIENTE" };
  const response = await route.PATCH(new NextRequest(`http://localhost/api/muestras/${sample.id}`, { method: "PATCH", headers, body: JSON.stringify(body) }), context(sample.id));
  assert.equal(response.status, 200, await response.text());
  const reopened = await prisma.muestra.findUniqueOrThrow({ where: { id: sample.id } });
  assert.equal(reopened.estatusBitacora, "BORRADOR");
  assert.equal(await prisma.asignacionEquipo.count({ where: { id: assignment.id, estado: "DEVUELTA" } }), 1);
});

test("devuelve equipo y mantiene el snapshot de serie en el movimiento histórico", { concurrency: false }, async () => {
  const { sample } = await fixture();
  const item = await equipment("PLACA_REVENIMIENTO", `SNAP-${Date.now()}`);
  const assigned = await assignEquipment(request(`http://localhost/api/muestras/${sample.id}/equipos`, { versionMuestra: 0, equipos: [{ equipoId: item.id }] }), context(sample.id));
  assert.equal(assigned.status, 201, await assigned.text());
  const assignment = await prisma.asignacionEquipo.findFirstOrThrow({ where: { muestraId: sample.id, equipoId: item.id } });
  const current = await prisma.muestra.findUniqueOrThrow({ where: { id: sample.id } });
  const returned = await returnEquipment(request(`http://localhost/api/muestras/${sample.id}/equipos/devolver`, { versionMuestra: current.version, asignacionIds: [assignment.id], estadoFinal: "DISPONIBLE" }), context(sample.id));
  assert.equal(returned.status, 200, await returned.text());
  await prisma.equipo.update({ where: { id: item.id }, data: { numeroSerie: `CAMBIADA-${Date.now()}` } });
  const movement = await prisma.movimientoEquipo.findFirstOrThrow({ where: { equipoId: item.id, tipo: "ASIGNACION" } });
  assert.equal((movement.detalleJson as { numeroSerie: string }).numeroSerie, item.numeroSerie);
  const historical = await prisma.asignacionEquipo.findUniqueOrThrow({ where: { id: assignment.id } });
  assert.equal(historical.estado, "DEVUELTA");
  assert.equal(historical.codigoInternoSnapshot, item.codigoInterno);
  assert.equal(historical.numeroSerieSnapshot, item.numeroSerie);
});
