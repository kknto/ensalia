import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type StorageCategory = "calibrations" | "compression_photos" | "field_sheets" | "scans";

export interface SavedDocumentResult {
  relativePath: string;
  absolutePath: string;
  sha256: string;
  size: number;
  filename: string;
}

export function getStorageRoot(): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "C:\\Users\\Default", "AppData", "Local");
  const ensaliaPath = path.join(localAppData, "Ensalia", "documents");
  const legacyPath = path.join(localAppData, "LABSICO", "documents");

  // Si existe la ruta nativa de Ensalia se usa, sino fallback ordenado a LABSICO
  return ensaliaPath;
}

export async function ensureStorageDirectories(): Promise<string> {
  const root = getStorageRoot();
  const categories: StorageCategory[] = ["calibrations", "compression_photos", "field_sheets", "scans"];

  for (const cat of categories) {
    const dir = path.join(root, cat);
    await fs.mkdir(dir, { recursive: true });
  }

  return root;
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 100);
}

export async function saveLocalDocument(
  category: StorageCategory,
  subFolder: string,
  filename: string,
  buffer: Buffer
): Promise<SavedDocumentResult> {
  const root = await ensureStorageDirectories();
  const safeSubFolder = sanitizeFileName(subFolder);
  const safeFilename = sanitizeFileName(filename);

  const targetDir = path.join(root, category, safeSubFolder);
  await fs.mkdir(targetDir, { recursive: true });

  const absolutePath = path.join(targetDir, safeFilename);

  // Calcular SHA-256 del contenido binario
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  // Escribir archivo al disco local
  await fs.writeFile(absolutePath, buffer);

  // Generar ruta relativa POSIX estandarizada para la base de datos
  const relativePath = `${category}/${safeSubFolder}/${safeFilename}`;

  return {
    relativePath,
    absolutePath,
    sha256: hash,
    size: buffer.length,
    filename: safeFilename,
  };
}

export async function readLocalDocument(relativePath: string): Promise<Buffer | null> {
  // Evitar cualquier intento de Path Traversal
  if (relativePath.includes("..") || path.isAbsolute(relativePath)) {
    throw new Error("Ruta de archivo no permitida.");
  }

  const root = getStorageRoot();
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
  const absolutePath = path.join(root, normalized);

  try {
    return await fs.readFile(absolutePath);
  } catch (error) {
    // Si no está en Ensalia, intentar en la ruta heredada de LABSICO
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "C:\\Users\\Default", "AppData", "Local");
    const legacyPath = path.join(localAppData, "LABSICO", "documents", normalized);
    try {
      return await fs.readFile(legacyPath);
    } catch {
      return null;
    }
  }
}

export async function deleteLocalDocument(relativePath: string): Promise<boolean> {
  if (relativePath.includes("..") || path.isAbsolute(relativePath)) {
    throw new Error("Ruta de archivo no permitida.");
  }

  const root = getStorageRoot();
  const normalized = path.normalize(relativePath);
  const absolutePath = path.join(root, normalized);

  try {
    await fs.unlink(absolutePath);
    return true;
  } catch {
    return false;
  }
}

