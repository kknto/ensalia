import path from "node:path";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";

export function documentsRoot() {
  return path.resolve(process.env.ENSALIA_DOCUMENTS_DIR || path.join(process.env.LOCALAPPDATA || process.cwd(), "Ensalia", "documents"));
}

export function resolveDocumentPath(relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (!/^field-sheets\/[A-Za-z0-9_-]+\/(?:scans\/)?[A-Za-z0-9_.-]+\.(?:pdf|png|jpg|webp)$/.test(normalized)) throw new Error("Ruta documental no permitida.");
  const root = documentsRoot();
  const resolved = path.resolve(root, ...normalized.split("/"));
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Ruta documental no permitida.");
  return resolved;
}

export async function stageDocument(relativePath: string, bytes: Uint8Array) {
  const destination = resolveDocumentPath(relativePath);
  const temporary = `${destination}.incoming`;
  await mkdir(path.dirname(destination), { recursive: true });
  await rm(temporary, { force: true });
  await writeFile(temporary, bytes, { flag: "wx" });
  return {
    commit: () => rename(temporary, destination),
    rollback: async () => { await rm(temporary, { force: true }); await rm(destination, { force: true }); },
  };
}

export async function readDocument(relativePath: string) {
  return readFile(resolveDocumentPath(relativePath));
}
