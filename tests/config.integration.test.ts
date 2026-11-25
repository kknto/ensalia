import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test, { after, before } from "node:test";
import { NextRequest } from "next/server";

const databaseName = `.config-${process.pid}-${Date.now()}.db`;
const databasePath = join(process.cwd(), "tests", databaseName);
process.env.DATABASE_URL = `file:../tests/${databaseName}`;
process.env.APP_ACCESS_CODE = "";

type Db = import("@prisma/client").PrismaClient;
let prisma: Db;
let operator: import("@prisma/client").Operador;
let service: typeof import("../src/lib/config/service");

before(async () => {
  writeFileSync(databasePath, "");
  const executable = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd prisma migrate deploy"] : ["prisma", "migrate", "deploy"];
  execFileSync(executable, args, { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! }, stdio: "pipe" });
  ({ prisma } = await import("../src/lib/prisma"));
  service = await import("../src/lib/config/service");
  operator = await prisma.operador.create({ data: { nombre: "Tester perfiles" } });
});

after(async () => {
  await prisma?.$disconnect();
  for (const suffix of ["", "-journal", "-shm", "-wal"]) rmSync(databasePath + suffix, { force: true });
});

test("crea plantilla, publica otra version y restaura sin reescribir historia", { concurrency: false }, async () => {
  const template = await service.ensureDefaultProfile(operator);
  assert.equal(template.versionPublicada?.numeroVersion, 1);
  const changed = structuredClone((await import("../src/lib/config/defaults")).DEFAULT_PROFILE_CONFIGURATION);
  changed.identidad.nombreComercial = "Cliente piloto";
  const profile = await service.createProfile({ clave: "CLIENTE_PILOTO", nombreInterno: "Cliente piloto", configuracion: changed }, operator);
  const firstDraft = profile.versiones[0];
  const firstValidation = await service.validateProfileVersion(firstDraft.id, operator);
  assert.equal(firstValidation?.valid, true);
  await service.publishProfileVersion(firstDraft.id, operator);
  changed.identidad.contacto = "contacto@example.test";
  const draft = await service.createProfileVersion(profile.id, changed, operator, firstDraft.id);
  const validation = await service.validateProfileVersion(draft.id, operator);
  assert.equal(validation?.valid, true);
  await service.publishProfileVersion(draft.id, operator);
  const published = await prisma.perfilCliente.findUniqueOrThrow({ where: { id: profile.id } });
  assert.equal(published.versionPublicadaId, draft.id);
  const restored = await service.restoreProfileVersion(firstDraft.id, operator);
  assert.equal(restored?.numeroVersion, 3);
  assert.equal((await prisma.publicacionPerfil.count({ where: { perfilId: profile.id } })), 3);
});

test("exporta con checksum e importa siempre como borrador", { concurrency: false }, async () => {
  const profile = await prisma.perfilCliente.findUniqueOrThrow({ where: { clave: "CLIENTE_PILOTO" } });
  const bundle = await service.exportProfile(profile.id);
  assert.ok(bundle);
  const imported = await service.importProfile(bundle, operator);
  assert.equal(imported.versiones[0].estado, "BORRADOR");
  assert.notEqual(imported.clave, profile.clave);
});

test("una muestra nueva fija el perfil activo, su version y snapshot", { concurrency: false }, async () => {
  const profile = await prisma.perfilCliente.findUniqueOrThrow({ where: { clave: "CLIENTE_PILOTO" }, include: { versionPublicada: true } });
  assert.equal(profile.activo, true);
  const { POST } = await import("../src/app/api/muestras/route");
  const response = await POST(new NextRequest("http://localhost/api/muestras", { method: "POST", headers: { "content-type": "application/json", "x-operator-name": operator.nombre }, body: JSON.stringify({
    fechaMuestreo: new Date().toISOString(), cliente: "Cliente", obra: "Obra", tipoConcreto: "Convencional", noMuestra: `CFG-${Date.now()}`, numeroEspecimenes: 0, especimenes: [], estatusRecoleccion: "PENDIENTE",
  }) }));
  const created = await response.json();
  assert.equal(response.status, 201, JSON.stringify(created));
  assert.equal(created.perfilClienteId, profile.id);
  assert.equal(created.versionPerfilId, profile.versionPublicadaId);
  assert.equal(created.configuracionSnapshotJson.identidad.nombreComercial, "Cliente piloto");
  assert.match(created.idMuestra, /^\d{4}-\d{5}$/);
});

test("gestiona catalogos por perfil sin alterar el catalogo global", { concurrency: false }, async () => {
  const profile = await prisma.perfilCliente.findUniqueOrThrow({ where: { clave: "CLIENTE_PILOTO" } });
  const route = await import("../src/app/api/config/perfiles/[id]/catalogos/route");
  const context = { params: Promise.resolve({ id: profile.id }) };
  const created = await route.POST(new NextRequest(`http://localhost/api/config/perfiles/${profile.id}/catalogos`, { method: "POST", headers: { "content-type": "application/json", "x-operator-name": operator.nombre }, body: JSON.stringify({ tipo: "CLIENTE", clave: "ACME", nombre: "Acme", orden: 10 }) }), context);
  assert.equal(created.status, 201, await created.text());
  const listed = await route.GET(new NextRequest(`http://localhost/api/config/perfiles/${profile.id}/catalogos?tipo=CLIENTE`, { headers: { "x-operator-name": operator.nombre } }), context);
  const rows = await listed.json();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].clave, "ACME");
});

test("aplica reglas publicadas al revisar sin reinterpretar otras muestras", { concurrency: false }, async () => {
  const profile = await prisma.perfilCliente.findUniqueOrThrow({ where: { clave: "CLIENTE_PILOTO" }, include: { versionPublicada: true } });
  const configured = structuredClone((await import("../src/lib/config/defaults")).DEFAULT_PROFILE_CONFIGURATION);
  configured.reglas.equipos = [{ tipoEquipoCodigo: "VARILLA", cantidadMinima: 1, cantidadMaxima: 1, porEspecimen: false, tiposEspecimen: [], requiereCalibracion: false }];
  const draft = await service.createProfileVersion(profile.id, configured, operator, profile.versionPublicadaId);
  await service.validateProfileVersion(draft.id, operator); await service.publishProfileVersion(draft.id, operator);
  const samples = await import("../src/app/api/muestras/route");
  const createdResponse = await samples.POST(new NextRequest("http://localhost/api/muestras", { method: "POST", headers: { "content-type": "application/json", "x-operator-name": operator.nombre }, body: JSON.stringify({ fechaMuestreo: new Date().toISOString(), cliente: "Cliente", obra: "Obra", tipoConcreto: "Convencional", noMuestra: `RULE-${Date.now()}`, numeroEspecimenes: 0, especimenes: [], estatusRecoleccion: "PENDIENTE" }) }));
  const sample = await createdResponse.json(); assert.equal(createdResponse.status, 201, JSON.stringify(sample));
  const transition = await import("../src/app/api/muestras/[id]/[accion]/route");
  const reviewed = await transition.POST(new NextRequest(`http://localhost/api/muestras/${sample.id}/revisar`, { method: "POST", headers: { "content-type": "application/json", "x-operator-name": operator.nombre }, body: "{}" }), { params: Promise.resolve({ id: sample.id, accion: "revisar" }) });
  assert.equal(reviewed.status, 409);
  assert.match((await reviewed.json()).error, /VARILLA/);
});

test("exporta solo las columnas del perfil CSV activo", { concurrency: false }, async () => {
  const route = await import("../src/app/api/muestras/export/route");
  const response = await route.GET(new NextRequest("http://localhost/api/muestras/export?perfil=OPERACION"));
  const csv = await response.text();
  assert.equal(response.status, 200, csv);
  assert.match(csv, /"ID Muestra","Fecha de muestreo","Cliente","Obra","Estatus bitacora"/);
  assert.doesNotMatch(csv.split("\r\n")[0], /Observaciones/);
});
