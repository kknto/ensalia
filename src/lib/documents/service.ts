import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma, type Operador } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { mergeIssuedFieldSheetPdfs, renderFieldSheetPdf, stampControlledCopy, type FieldSheetSnapshot } from "./pdf/renderer";
import { readDocument, stageDocument } from "./storage";

export class FieldSheetError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

function sha256(value: Uint8Array | string) { return createHash("sha256").update(value).digest("hex"); }
function token() { return randomBytes(32).toString("base64url"); }
function json(value: unknown) { return JSON.parse(JSON.stringify(serialize(value))) as Prisma.InputJsonValue; }
function identity(configuration: unknown) {
  if (!configuration || typeof configuration !== "object") return {};
  const item = (configuration as Record<string, unknown>).identidad;
  return item && typeof item === "object" ? item as Record<string, string> : {};
}
function specimenTarget(configuration: unknown) {
  if (!configuration || typeof configuration !== "object") return 4;
  const rules = (configuration as Record<string, unknown>).reglas;
  if (!rules || typeof rules !== "object") return 4;
  const target = Number((rules as Record<string, unknown>).especimenesObjetivoPorMuestra);
  return Number.isInteger(target) && target >= 1 && target <= 12 ? target : 4;
}

const sampleInclude = {
  especimenes: { orderBy: { numero: "asc" as const } },
  asignacionesEquipo: { where: { estado: "ASIGNADA" as const }, include: { equipo: { include: { tipo: true } }, especimen: true } },
};

export async function listFieldSheets(muestraId: string) {
  const rows = await prisma.emisionHojaCampo.findMany({
    where: { muestraId }, include: { emitidaPor: true, anuladaPor: true, eventos: { include: { operador: true }, orderBy: { creadoEn: "desc" } }, archivos: true },
    orderBy: { revision: "desc" },
  });
  return rows.map(({ rutaPdf: _rutaPdf, tokenQrHash: _tokenQrHash, datosSnapshotJson: _datos, configuracionSnapshotJson: _configuracion, archivos, ...row }) => ({
    ...row,
    archivos: archivos.map(({ rutaRelativa: _rutaRelativa, ...archivo }) => archivo),
  }));
}

export async function issueFieldSheet(muestraId: string, versionMuestra: number, operator: Operador, reason?: string) {
  const current = await prisma.muestra.findUnique({ where: { id: muestraId }, include: sampleInclude });
  if (!current) throw new FieldSheetError("Muestra no encontrada.", 404);
  if (current.estatusBitacora === "ANULADA") throw new FieldSheetError("No se puede emitir una hoja para una muestra anulada.", 409);
  if (current.version !== versionMuestra) throw new FieldSheetError("La muestra cambio. Recargue e intente nuevamente.", 409);
  if (!current.cliente || !current.obra || !current.tipoConcreto || !current.noMuestra) throw new FieldSheetError("Complete cliente, obra, tipo de concreto y numero de muestra antes de emitir.", 409);
  const active = await prisma.emisionHojaCampo.findFirst({ where: { muestraId, estado: "EMITIDA" }, orderBy: { revision: "desc" } });
  if (active && !reason) throw new FieldSheetError("Ya existe una hoja vigente. Indique el motivo para sustituirla.", 409);
  const latest = await prisma.emisionHojaCampo.findFirst({ where: { muestraId }, orderBy: { revision: "desc" }, select: { revision: true } });
  const revision = (latest?.revision || 0) + 1;
  const id = randomUUID();
  const qrToken = token();
  const numeroControl = `${current.idMuestra}-HC-R${String(revision).padStart(2, "0")}`;
  const relativePath = `field-sheets/${id}/original.pdf`;
  const emittedAt = new Date();
  const pour = current.coladoId ? await prisma.colado.findUnique({
    where: { id: current.coladoId },
    include: { muestras: { select: { id: true, numeroDentroColado: true }, orderBy: [{ numeroDentroColado: "asc" }, { creadoEn: "asc" }] } },
  }) : null;
  const commonSnapshot = pour ? json({ folioColado: pour.folio, fechaColado: pour.fechaColado, cliente: pour.cliente, obra: pour.obra, localizacion: pour.localizacion, procedencia: pour.procedencia, elemento: pour.elemento, volumenM3: pour.volumenM3, fcKgCm2: pour.fcKgCm2, tipoConcreto: pour.tipoConcreto, concretera: pour.concretera, tmaMm: pour.tmaMm, cemento: pour.cemento, observacionesColado: pour.observaciones }) as Record<string, unknown> : {};
  const snapshot = json({ ...serialize(current), ...commonSnapshot, ...(pour ? { folioColado: pour.folio } : {}) });
  const configuration = current.configuracionSnapshotJson;
  const sampleIndex = pour ? Math.max(0, pour.muestras.findIndex((item) => item.id === current.id)) : -1;
  const bytes = await renderFieldSheetPdf({
    numeroControl, revision, tokenQr: qrToken, emitidaEn: emittedAt, identidad: identity(configuration), muestra: snapshot as unknown as FieldSheetSnapshot,
    filasEspecimenObjetivo: specimenTarget(configuration),
    ...(pour ? { contextoPaquete: { folioColado: pour.folio, indiceMuestra: sampleIndex + 1, totalMuestras: pour.muestras.length } } : {}),
  });
  const staged = await stageDocument(relativePath, bytes);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.muestra.findUnique({ where: { id: muestraId }, select: { version: true, estatusBitacora: true } });
      if (!locked || locked.version !== versionMuestra) throw new FieldSheetError("La muestra cambio durante la emision.", 409);
      if (locked.estatusBitacora === "ANULADA") throw new FieldSheetError("La muestra fue anulada durante la emision.", 409);
      if (active) await tx.emisionHojaCampo.update({ where: { id: active.id }, data: { estado: "SUSTITUIDA" } });
      const created = await tx.emisionHojaCampo.create({ data: {
        id, muestraId, numeroControl, revision, versionMuestra, perfilClienteId: current.perfilClienteId, versionPerfilId: current.versionPerfilId,
        datosSnapshotJson: snapshot, configuracionSnapshotJson: configuration ?? Prisma.JsonNull, rutaPdf: relativePath,
        pdfSha256: sha256(bytes), tamanoPdf: bytes.byteLength, tokenQrHash: sha256(qrToken), emitidaPorId: operator.id,
        emitidaEn: emittedAt, sustituyeAId: active?.id,
      } });
      await tx.archivoHojaCampo.create({ data: { emisionId: id, tipo: "PDF_ORIGINAL", nombreSeguro: `${numeroControl}.pdf`, mimeType: "application/pdf", tamano: bytes.byteLength, hashSha256: sha256(bytes), rutaRelativa: relativePath } });
      await tx.eventoHojaCampo.create({ data: { emisionId: id, operadorId: operator.id, tipo: "EMISION", detalleJson: { versionMuestra, numeroControl, sustituyoA: active?.id ?? null, motivo: reason ?? null } } });
      if (active) await tx.eventoHojaCampo.create({ data: { emisionId: active.id, operadorId: operator.id, tipo: "SUSTITUCION", detalleJson: { sustituidaPorId: id, motivo: reason } } });
      await tx.auditoria.create({ data: { muestraId, operadorId: operator.id, accion: active ? "HOJA_CAMPO_SUSTITUIDA" : "HOJA_CAMPO_EMITIDA", motivo: reason, cambiosJson: { emisionId: id, numeroControl, revision, pdfSha256: sha256(bytes) } } });
      await staged.commit();
      return created;
    });
    return result;
  } catch (error) {
    await staged.rollback();
    throw error;
  }
}

export async function downloadPourFieldSheetPackage(coladoId: string, operator: Operador, issueMissing = true) {
  const pour = await prisma.colado.findUnique({
    where: { id: coladoId },
    include: { muestras: { orderBy: [{ numeroDentroColado: "asc" }, { creadoEn: "asc" }], include: { emisionesHojaCampo: { where: { estado: "EMITIDA" }, orderBy: { revision: "desc" }, take: 1 } } } },
  });
  if (!pour) throw new FieldSheetError("Colado no encontrado.", 404);
  if (!pour.muestras.length) throw new FieldSheetError("El colado no tiene muestras.", 409);
  const missing = pour.muestras.filter((item) => !item.emisionesHojaCampo.length);
  if (missing.length && issueMissing) {
    for (const sample of missing) {
      try {
        await issueFieldSheet(sample.id, sample.version, operator);
      } catch (error) {
        if (error instanceof FieldSheetError) throw new FieldSheetError(`No se pudo preparar la hoja de ${sample.idMuestra}: ${error.message}`, error.status);
        throw error;
      }
    }
    return downloadPourFieldSheetPackage(coladoId, operator, false);
  }
  if (missing.length) throw new FieldSheetError(`No fue posible emitir todas las hojas del paquete. Faltan ${missing.length}.`, 409);
  const emissions = pour.muestras.map((item) => item.emisionesHojaCampo[0]);
  const documents: Uint8Array[] = [];
  for (const emission of emissions) {
    const bytes = await readDocument(emission.rutaPdf);
    if (sha256(bytes) !== emission.pdfSha256) throw new FieldSheetError(`El archivo ${emission.numeroControl} no coincide con la evidencia registrada.`, 409);
    documents.push(bytes);
  }
  const bytes = await mergeIssuedFieldSheetPdfs(documents, pour.folio);
  await prisma.$transaction(async (tx) => {
    for (const emission of emissions) await tx.eventoHojaCampo.create({ data: { emisionId: emission.id, operadorId: operator.id, tipo: "DESCARGA", detalleJson: { paqueteColadoId: pour.id, folioColado: pour.folio } } });
    await tx.auditoria.create({ data: { coladoId: pour.id, operadorId: operator.id, accion: "PAQUETE_HOJAS_CAMPO_DESCARGADO", cambiosJson: { emisiones: emissions.map((item) => item.id), muestras: pour.muestras.length, sha256: sha256(bytes) } } });
  });
  return { pour, bytes, sha256: sha256(bytes), filename: `${pour.folio}-hojas-campo.pdf` };
}

export async function downloadFieldSheet(emisionId: string, operator: Operador) {
  const emission = await prisma.emisionHojaCampo.findUnique({ where: { id: emisionId } });
  if (!emission) throw new FieldSheetError("Emision no encontrada.", 404);
  const bytes = await readDocument(emission.rutaPdf);
  if (sha256(bytes) !== emission.pdfSha256) throw new FieldSheetError("El archivo no coincide con la evidencia registrada.", 409);
  await prisma.eventoHojaCampo.create({ data: { emisionId, operadorId: operator.id, tipo: "DESCARGA", detalleJson: { hash: emission.pdfSha256 } } });
  return { emission, bytes };
}

export async function reprintFieldSheet(emisionId: string, operator: Operador, controlledCopy: boolean, reason?: string) {
  const emission = await prisma.emisionHojaCampo.findUnique({ where: { id: emisionId } });
  if (!emission) throw new FieldSheetError("Emision no encontrada.", 404);
  if (!controlledCopy) {
    const bytes = await readDocument(emission.rutaPdf);
    if (sha256(bytes) !== emission.pdfSha256) throw new FieldSheetError("El archivo no coincide con la evidencia registrada.", 409);
    await prisma.eventoHojaCampo.create({ data: { emisionId, operadorId: operator.id, tipo: "REIMPRESION", detalleJson: { copiaControlada: false, motivo: reason ?? null } } });
    return { emission, bytes, filename: `${emission.numeroControl}.pdf` };
  }
  const eventId = randomUUID();
  const copyNumber = await prisma.eventoHojaCampo.count({ where: { emisionId, tipo: "REIMPRESION" } }) + 1;
  const original = await readDocument(emission.rutaPdf);
  if (sha256(original) !== emission.pdfSha256) throw new FieldSheetError("El archivo no coincide con la evidencia registrada.", 409);
  const bytes = await stampControlledCopy(original, copyNumber);
  const relativePath = `field-sheets/${emission.id}/copy-${eventId}.pdf`;
  const staged = await stageDocument(relativePath, bytes);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.archivoHojaCampo.create({ data: { emisionId, tipo: "COPIA_CONTROLADA", nombreSeguro: `${emission.numeroControl}-copia-${copyNumber}.pdf`, mimeType: "application/pdf", tamano: bytes.byteLength, hashSha256: sha256(bytes), rutaRelativa: relativePath } });
      await tx.eventoHojaCampo.create({ data: { id: eventId, emisionId, operadorId: operator.id, tipo: "REIMPRESION", detalleJson: { copiaControlada: true, numeroCopia: copyNumber, motivo: reason ?? null, hash: sha256(bytes) } } });
      await staged.commit();
    });
    return { emission, bytes, filename: `${emission.numeroControl}-copia-${copyNumber}.pdf` };
  } catch (error) { await staged.rollback(); throw error; }
}

export async function cancelFieldSheet(emisionId: string, operator: Operador, reason: string) {
  return prisma.$transaction(async (tx) => {
    const emission = await tx.emisionHojaCampo.findUnique({ where: { id: emisionId } });
    if (!emission) throw new FieldSheetError("Emision no encontrada.", 404);
    if (emission.estado !== "EMITIDA") throw new FieldSheetError("Solo se puede anular una hoja vigente.", 409);
    const updated = await tx.emisionHojaCampo.update({ where: { id: emisionId }, data: { estado: "ANULADA", motivoAnulacion: reason, anuladaPorId: operator.id, anuladaEn: new Date() } });
    await tx.eventoHojaCampo.create({ data: { emisionId, operadorId: operator.id, tipo: "ANULACION", detalleJson: { motivo: reason } } });
    await tx.auditoria.create({ data: { muestraId: emission.muestraId, operadorId: operator.id, accion: "HOJA_CAMPO_ANULADA", motivo: reason, cambiosJson: { emisionId, numeroControl: emission.numeroControl } } });
    return updated;
  });
}
