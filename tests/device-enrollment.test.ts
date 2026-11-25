import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import {
  generateEnrollmentCode,
  generateQrDataUrl,
  generateDeviceToken,
  verifyDeviceToken,
} from "../src/lib/devices/enrollment";
import { GET as getDevices, POST as createEnrollment } from "../src/app/api/dispositivos/route";
import { POST as enrollDevice } from "../src/app/api/dispositivos/enrolar/route";
import { POST as deviceAction } from "../src/app/api/dispositivos/[id]/[accion]/route";
import { prisma } from "../src/lib/prisma";
import { NextRequest } from "next/server";

test("generateEnrollmentCode genera codigos legibles con prefijo ENS- y 4 caracteres validos", () => {
  const code = generateEnrollmentCode();
  assert.match(code, /^ENS-[2-9A-HJ-NP-Z]{4}$/);
});

test("generateQrDataUrl produce un data URL PNG valido", async () => {
  const qrUrl = await generateQrDataUrl({
    version: 1,
    serverUrl: "http://127.0.0.1:3210",
    code: "ENS-TEST",
    deviceId: "device_123",
    issuedAt: new Date().toISOString(),
  });
  assert.ok(qrUrl.startsWith("data:image/png;base64,"));
});

test("generateDeviceToken y verifyDeviceToken aseguran la integridad del hardware", () => {
  const deviceId = "dev_001";
  const deviceUuid = "hw_uuid_a839b2";
  const token = generateDeviceToken(deviceId, deviceUuid);

  // Token valido con mismo UUID
  const validResult = verifyDeviceToken(token, deviceUuid);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.deviceId, deviceId);
  assert.equal(validResult.deviceUuid, deviceUuid);

  // Token rechazado si se intenta usar en otro hardware UUID
  const invalidHwResult = verifyDeviceToken(token, "otro_hw_distinto");
  assert.equal(invalidHwResult.valid, false);

  // Token alterado es rechazado
  const tamperedToken = token.slice(0, -4) + "XXXX";
  const tamperedResult = verifyDeviceToken(tamperedToken, deviceUuid);
  assert.equal(tamperedResult.valid, false);
});

test("Flujo completo de API: Crear enrolamiento, enrolar dispositivo, bloquear y desbloquear", async () => {
  // 1. Crear enrolamiento desde la web
  const createReq = new NextRequest("http://127.0.0.1:3210/api/dispositivos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: "Tableta QA Test" }),
  });
  const createRes = await createEnrollment(createReq);
  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  assert.ok(createData.enrolamiento.codigo);
  assert.ok(createData.enrolamiento.qrDataUrl);
  assert.equal(createData.dispositivo.estado, "PENDIENTE");

  const deviceId = createData.dispositivo.id;
  const codigo = createData.enrolamiento.codigo;
  const testHardwareUuid = `test_hw_${Date.now()}`;

  // 2. Enrolar desde la app movil usando el codigo de un solo uso
  const enrollReq = new NextRequest("http://127.0.0.1:3210/api/dispositivos/enrolar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      codigo,
      deviceUuid: testHardwareUuid,
      modelo: "Samsung Galaxy Tab A9",
      plataforma: "ANDROID",
      appVersion: "1.0.0",
    }),
  });
  const enrollRes = await enrollDevice(enrollReq);
  assert.equal(enrollRes.status, 200);
  const enrollData = await enrollRes.json();
  assert.equal(enrollData.dispositivo.estado, "ACTIVO");
  assert.ok(enrollData.dispositivo.token);

  // 3. Reintento con el mismo codigo es rechazado (codigo quemado / de un solo uso)
  const reuseReq = new NextRequest("http://127.0.0.1:3210/api/dispositivos/enrolar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      codigo,
      deviceUuid: testHardwareUuid,
      modelo: "Samsung Galaxy Tab A9",
    }),
  });
  const reuseRes = await enrollDevice(reuseReq);
  assert.equal(reuseRes.status, 404);

  // 4. Bloquear dispositivo desde la web
  const blockReq = new NextRequest(`http://127.0.0.1:3210/api/dispositivos/${deviceId}/bloquear`, { method: "POST" });
  const blockRes = await deviceAction(blockReq, { params: Promise.resolve({ id: deviceId, accion: "bloquear" }) });
  assert.equal(blockRes.status, 200);
  const blockData = await blockRes.json();
  assert.equal(blockData.dispositivo.estado, "BLOQUEADO");
  assert.ok(blockData.dispositivo.tokenRevocadoEn);

  // 5. Desbloquear dispositivo
  const unblockReq = new NextRequest(`http://127.0.0.1:3210/api/dispositivos/${deviceId}/desbloquear`, { method: "POST" });
  const unblockRes = await deviceAction(unblockReq, { params: Promise.resolve({ id: deviceId, accion: "desbloquear" }) });
  assert.equal(unblockRes.status, 200);
  const unblockData = await unblockRes.json();
  assert.equal(unblockData.dispositivo.estado, "ACTIVO");

  // 6. Consultar lista
  const listRes = await getDevices();
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.ok(listData.dispositivos.some((d: any) => d.id === deviceId && d.estado === "ACTIVO"));

  // Limpieza
  await prisma.dispositivoMovil.delete({ where: { id: deviceId } });
});
