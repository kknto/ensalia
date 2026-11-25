import { createHash } from "node:crypto";
import { Prisma, type Operador } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PROFILE_CONFIGURATION, DEFAULT_PROFILE_KEY } from "./defaults";
import { importProfileSchema, profileConfigurationSchema, type ProfileConfiguration } from "./schema";

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
  return value;
}

export function canonicalConfiguration(configuration: ProfileConfiguration) {
  return JSON.stringify(normalize(configuration));
}

export function configurationChecksum(configuration: ProfileConfiguration) {
  return createHash("sha256").update(canonicalConfiguration(configuration), "utf8").digest("hex");
}

export function validateConfiguration(value: unknown) {
  return profileConfigurationSchema.safeParse(value);
}

export function configurationSnapshot(configuration: ProfileConfiguration) {
  return {
    esquema: configuration.esquema,
    identidad: configuration.identidad,
    modulos: configuration.modulos,
    formulario: configuration.formulario,
    operacion: configuration.operacion,
    reglas: configuration.reglas,
    exportaciones: configuration.exportaciones.filter((item) => item.activo),
  };
}

const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function ensureDefaultProfile(operator: Operador) {
  const existing = await prisma.perfilCliente.findUnique({ where: { clave: DEFAULT_PROFILE_KEY }, include: { versionPublicada: true } });
  if (existing?.versionPublicada) return existing;
  return prisma.$transaction(async (tx) => {
    const hasActiveProfile = (await tx.perfilCliente.count({ where: { activo: true, versionPublicadaId: { not: null } } })) > 0;
    const profile = existing ?? await tx.perfilCliente.create({ data: { clave: DEFAULT_PROFILE_KEY, nombreInterno: "Ensalia Demo", esPlantillaSistema: true, activo: !hasActiveProfile } });
    const old = await tx.versionPerfil.findFirst({ where: { perfilId: profile.id, numeroVersion: 1 } });
    const version = old ?? await tx.versionPerfil.create({ data: {
      perfilId: profile.id, numeroVersion: 1, estado: "PUBLICADA", esquemaVersion: 1,
      configuracionJson: json(DEFAULT_PROFILE_CONFIGURATION), checksum: configurationChecksum(DEFAULT_PROFILE_CONFIGURATION),
      notas: "Plantilla base de Ensalia", creadaPorId: operator.id, validadaPorId: operator.id,
      publicadaPorId: operator.id, validadaEn: new Date(), publicadaEn: new Date(),
    } });
    return tx.perfilCliente.update({ where: { id: profile.id }, data: { versionPublicadaId: version.id }, include: { versionPublicada: true } });
  });
}

export async function createProfile(input: { clave: string; nombreInterno: string; configuracion?: ProfileConfiguration; notas?: string }, operator: Operador) {
  const configuration = input.configuracion ?? DEFAULT_PROFILE_CONFIGURATION;
  return prisma.$transaction(async (tx) => {
    const profile = await tx.perfilCliente.create({ data: { clave: input.clave.toUpperCase(), nombreInterno: input.nombreInterno, activo: false } });
    await tx.versionPerfil.create({ data: { perfilId: profile.id, numeroVersion: 1, configuracionJson: json(configuration), notas: input.notas, creadaPorId: operator.id } });
    return tx.perfilCliente.findUniqueOrThrow({ where: { id: profile.id }, include: { versiones: { orderBy: { numeroVersion: "desc" } } } });
  });
}

export async function createProfileVersion(profileId: string, configuration: ProfileConfiguration, operator: Operador, basadaEnId?: string | null, notas?: string | null) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.perfilCliente.findUnique({ where: { id: profileId } });
    if (!profile) throw new Error("Perfil no encontrado.");
    if (profile.esPlantillaSistema) throw new Error("La plantilla del sistema esta protegida; dupliquela para personalizarla.");
    if (basadaEnId) {
      const base = await tx.versionPerfil.findFirst({ where: { id: basadaEnId, perfilId: profileId } });
      if (!base) throw new Error("La version base no pertenece al perfil.");
    }
    const last = await tx.versionPerfil.findFirst({ where: { perfilId: profileId }, orderBy: { numeroVersion: "desc" } });
    return tx.versionPerfil.create({ data: { perfilId: profileId, numeroVersion: (last?.numeroVersion ?? 0) + 1, basadaEnId: basadaEnId || null, configuracionJson: json(configuration), notas, creadaPorId: operator.id } });
  });
}

export async function validateProfileVersion(versionId: string, operator: Operador) {
  const version = await prisma.versionPerfil.findUnique({ where: { id: versionId } });
  if (!version) return null;
  if (version.estado !== "BORRADOR") throw new Error("Solo se puede validar una version en borrador.");
  const parsed = profileConfigurationSchema.safeParse(version.configuracionJson);
  if (!parsed.success) return { valid: false as const, errors: parsed.error.flatten() };
  const checksum = configurationChecksum(parsed.data);
  const updated = await prisma.versionPerfil.update({ where: { id: versionId }, data: { estado: "VALIDADA", checksum, validadaPorId: operator.id, validadaEn: new Date() } });
  return { valid: true as const, version: updated };
}

export async function publishProfileVersion(versionId: string, operator: Operador, respaldoRuta?: string) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.versionPerfil.findUnique({ where: { id: versionId }, include: { perfil: true } });
    if (!version) return null;
    if (version.perfil.esPlantillaSistema) throw new Error("La plantilla del sistema esta protegida.");
    if (version.estado !== "VALIDADA") throw new Error("La version debe validarse antes de publicarse.");
    const previousId = version.perfil.versionPublicadaId;
    if (previousId && previousId !== version.id) await tx.versionPerfil.update({ where: { id: previousId }, data: { estado: "ARCHIVADA" } });
    const published = await tx.versionPerfil.update({ where: { id: version.id }, data: { estado: "PUBLICADA", publicadaPorId: operator.id, publicadaEn: new Date() } });
    await tx.perfilCliente.updateMany({ data: { activo: false } });
    await tx.perfilCliente.update({ where: { id: version.perfilId }, data: { versionPublicadaId: version.id, activo: true } });
    await tx.publicacionPerfil.create({ data: { perfilId: version.perfilId, versionAnteriorId: previousId, versionNuevaId: version.id, operadorId: operator.id, respaldoRuta, resultado: "PUBLICADA", detalleJson: json({ checksum: version.checksum }) } });
    return published;
  });
}

export async function restoreProfileVersion(sourceVersionId: string, operator: Operador, respaldoRuta?: string) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.versionPerfil.findUnique({ where: { id: sourceVersionId }, include: { perfil: true } });
    if (!source) return null;
    if (source.perfil.esPlantillaSistema) throw new Error("La plantilla del sistema esta protegida.");
    const parsed = profileConfigurationSchema.parse(source.configuracionJson);
    const last = await tx.versionPerfil.findFirst({ where: { perfilId: source.perfilId }, orderBy: { numeroVersion: "desc" } });
    const previousId = source.perfil.versionPublicadaId;
    if (previousId) await tx.versionPerfil.update({ where: { id: previousId }, data: { estado: "ARCHIVADA" } });
    const restored = await tx.versionPerfil.create({ data: {
      perfilId: source.perfilId, numeroVersion: (last?.numeroVersion ?? 0) + 1, basadaEnId: source.id,
      estado: "PUBLICADA", esquemaVersion: source.esquemaVersion, configuracionJson: json(parsed),
      checksum: configurationChecksum(parsed), notas: `Restaurada desde version ${source.numeroVersion}`,
      creadaPorId: operator.id, validadaPorId: operator.id, publicadaPorId: operator.id,
      validadaEn: new Date(), publicadaEn: new Date(),
    } });
    await tx.perfilCliente.updateMany({ data: { activo: false } });
    await tx.perfilCliente.update({ where: { id: source.perfilId }, data: { versionPublicadaId: restored.id, activo: true } });
    await tx.publicacionPerfil.create({ data: { perfilId: source.perfilId, versionAnteriorId: previousId, versionNuevaId: restored.id, operadorId: operator.id, respaldoRuta, resultado: "RESTAURADA", detalleJson: json({ origenVersionId: source.id }) } });
    return restored;
  });
}

export async function resolveActiveProfile(operator: Operador) {
  const active = await prisma.perfilCliente.findFirst({ where: { activo: true, versionPublicadaId: { not: null } }, include: { versionPublicada: true }, orderBy: { actualizadoEn: "desc" } });
  return active?.versionPublicada ? active : ensureDefaultProfile(operator);
}

export async function exportProfile(profileId: string) {
  const profile = await prisma.perfilCliente.findUnique({ where: { id: profileId }, include: { versionPublicada: true } });
  if (!profile?.versionPublicada) return null;
  const configuration = profileConfigurationSchema.parse(profile.versionPublicada.configuracionJson);
  return { formato: "ENSALIA_PROFILE" as const, versionFormato: 1 as const, perfil: { clave: profile.clave, nombreInterno: profile.nombreInterno }, configuracion: configuration, checksum: configurationChecksum(configuration) };
}

export async function importProfile(value: unknown, operator: Operador) {
  const parsed = importProfileSchema.parse(value);
  if (configurationChecksum(parsed.configuracion) !== parsed.checksum) throw new Error("El checksum del perfil no coincide.");
  let key = parsed.perfil.clave.toUpperCase();
  if (await prisma.perfilCliente.findUnique({ where: { clave: key } })) key = `${key}_${Date.now()}`;
  return createProfile({ clave: key, nombreInterno: parsed.perfil.nombreInterno, configuracion: parsed.configuracion, notas: "Importado; requiere validacion y publicacion" }, operator);
}
