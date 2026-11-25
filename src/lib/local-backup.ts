import { execFile } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";

const execFileAsync = promisify(execFile);

export class LocalBackupError extends Error {}

export async function createConsistentLocalBackup(reason: "antes-de-publicar" | "antes-de-restaurar") {
  if (process.platform !== "win32") throw new LocalBackupError("El respaldo local administrado requiere Windows.");
  const work = await mkdtemp(path.join(tmpdir(), "ensalia-online-backup-"));
  const snapshot = path.join(work, "snapshot.db");
  try {
    // VACUUM INTO genera una instantanea SQLite consistente aun con el servidor abierto.
    // La ruta es creada internamente; no recibe datos de la solicitud HTTP.
    const escapedSnapshot = snapshot.replaceAll("'", "''").replaceAll("\\", "/");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${escapedSnapshot}'`);
    const script = path.join(process.cwd(), "scripts", "Archive-EnsaliaSnapshot.ps1");
    const { stdout } = await execFileAsync("powershell.exe", [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
      "-DatabaseSnapshotPath", snapshot, "-Reason", reason,
    ], { windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024 });
    const marker = stdout.split(/\r?\n/).find((line) => line.startsWith("ARCHIVE_PATH="));
    if (!marker) throw new LocalBackupError("El servicio local no devolvio la ruta del respaldo.");
    const archive = marker.slice("ARCHIVE_PATH=".length).trim();
    const info = await stat(archive);
    if (!info.isFile() || info.size === 0) throw new LocalBackupError("El respaldo previo no fue creado correctamente.");
    return archive;
  } catch (error) {
    if (error instanceof LocalBackupError) throw error;
    console.error("No fue posible crear el respaldo previo a la configuracion.", error);
    throw new LocalBackupError("No fue posible crear el respaldo previo. La publicacion no se realizo.");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
