import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const MIME_EXTENSION = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export class ProfileResourceError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export function profileAssetsRoot() {
  const configured = process.env.ENSALIA_ASSETS_DIR;
  const root = configured || path.join(process.env.LOCALAPPDATA || process.cwd(), "Ensalia", "assets");
  return path.resolve(root);
}

export function resolveManagedProfileAsset(relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (!/^profiles\/[A-Za-z0-9_-]+\/[a-f0-9-]+\.(png|jpg|webp)$/.test(normalized)) {
    throw new ProfileResourceError("Ruta de recurso no permitida.");
  }
  const root = profileAssetsRoot();
  const resolved = path.resolve(root, ...normalized.split("/"));
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new ProfileResourceError("Ruta de recurso no permitida.");
  return resolved;
}

export function validateProfileImage(bytes: Uint8Array, mimeType: string) {
  const extension = MIME_EXTENSION[mimeType as keyof typeof MIME_EXTENSION];
  if (!extension) throw new ProfileResourceError("Use una imagen PNG, JPEG o WebP.");
  if (bytes.byteLength < 12) throw new ProfileResourceError("El archivo de imagen no es valido.");
  if (bytes.byteLength > MAX_PROFILE_IMAGE_BYTES) throw new ProfileResourceError("La imagen excede el limite de 2 MB.", 413);
  const isPng = bytes.slice(0, 8).every((value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const isWebp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if ((extension === "png" && !isPng) || (extension === "jpg" && !isJpeg) || (extension === "webp" && !isWebp)) {
    throw new ProfileResourceError("El contenido del archivo no coincide con su tipo MIME.");
  }
  return extension;
}

export async function saveProfileLogo(versionId: string, file: File, operatorId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(versionId)) throw new ProfileResourceError("Identificador de version no valido.");
  const version = await prisma.versionPerfil.findUnique({ where: { id: versionId } });
  if (!version) throw new ProfileResourceError("Version no encontrada.", 404);
  if (version.estado !== "BORRADOR") throw new ProfileResourceError("El logotipo solo puede cambiarse en una version en borrador.", 409);

  if (file.size > MAX_PROFILE_IMAGE_BYTES) throw new ProfileResourceError("La imagen excede el limite de 2 MB.", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = validateProfileImage(bytes, file.type);
  const safeName = `${randomUUID()}.${extension}`;
  const relativePath = `profiles/${versionId}/${safeName}`;
  const destination = resolveManagedProfileAsset(relativePath);
  const temporary = `${destination}.incoming`;
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(temporary, bytes, { flag: "wx" });
  await rename(temporary, destination);

  try {
    const previous = await prisma.recursoPerfil.findMany({ where: { versionPerfilId: versionId, tipo: "LOGO" } });
    const resource = await prisma.$transaction(async (tx) => {
      await tx.recursoPerfil.deleteMany({ where: { versionPerfilId: versionId, tipo: "LOGO" } });
      const created = await tx.recursoPerfil.create({ data: {
        versionPerfilId: versionId,
        tipo: "LOGO",
        nombreSeguro: safeName,
        mimeType: file.type,
        tamano: bytes.byteLength,
        hashSha256: createHash("sha256").update(bytes).digest("hex"),
        rutaRelativa: relativePath,
      } });
      await tx.auditoria.create({ data: { operadorId: operatorId, accion: "PERFIL_LOGO_ACTUALIZADO", cambiosJson: { versionPerfilId: versionId, recursoId: created.id, mimeType: created.mimeType, tamano: created.tamano } } });
      return created;
    });
    await Promise.all(previous.map(async (item) => {
      try { await rm(resolveManagedProfileAsset(item.rutaRelativa), { force: true }); } catch { /* Nunca ampliar el borrado fuera del directorio administrado. */ }
    }));
    return resource;
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }
}

export async function deleteProfileResource(resourceId: string, operatorId: string) {
  const resource = await prisma.recursoPerfil.findUnique({ where: { id: resourceId }, include: { versionPerfil: true } });
  if (!resource) throw new ProfileResourceError("Recurso no encontrado.", 404);
  if (resource.versionPerfil.estado !== "BORRADOR") throw new ProfileResourceError("El recurso pertenece a una version que ya no es editable.", 409);
  await prisma.$transaction(async (tx) => {
    await tx.recursoPerfil.delete({ where: { id: resource.id } });
    await tx.auditoria.create({ data: { operadorId: operatorId, accion: "PERFIL_RECURSO_ELIMINADO", cambiosJson: { versionPerfilId: resource.versionPerfilId, recursoId: resource.id, tipo: resource.tipo } } });
  });
  await rm(resolveManagedProfileAsset(resource.rutaRelativa), { force: true });
  return resource;
}
