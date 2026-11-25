import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { MAX_PROFILE_IMAGE_BYTES, ProfileResourceError, resolveManagedProfileAsset, validateProfileImage } from "../src/lib/config/resources";

const pngHeader = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

test("acepta PNG real y rechaza MIME no permitido o contenido suplantado", () => {
  assert.equal(validateProfileImage(pngHeader, "image/png"), "png");
  assert.throws(() => validateProfileImage(pngHeader, "image/svg+xml"), ProfileResourceError);
  assert.throws(() => validateProfileImage(pngHeader, "image/jpeg"), /no coincide/);
});

test("rechaza imagenes mayores a 2 MB", () => {
  const bytes = new Uint8Array(MAX_PROFILE_IMAGE_BYTES + 1);
  bytes.set(pngHeader);
  assert.throws(() => validateProfileImage(bytes, "image/png"), (error: unknown) => error instanceof ProfileResourceError && error.status === 413);
});

test("el resolvedor no acepta traversal ni nombres aportados por el usuario", () => {
  assert.throws(() => resolveManagedProfileAsset("../secreto.png"), /no permitida/);
  assert.throws(() => resolveManagedProfileAsset("profiles/version/../../secreto.png"), /no permitida/);
  assert.throws(() => resolveManagedProfileAsset("profiles/version/logo cliente.png"), /no permitida/);
  assert.match(resolveManagedProfileAsset("profiles/version/123e4567-e89b-12d3-a456-426614174000.png"), /123e4567-e89b-12d3-a456-426614174000\.png$/);
});

test("el respaldo formato 3 incluye recursos y documentos y el restaurador los valida", { skip: process.platform !== "win32" }, () => {
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const sandbox = mkdtempSync(path.join(tmpdir(), "ensalia-assets-backup-"));
  const data = path.join(sandbox, "data");
  const assets = path.join(sandbox, "assets");
  const backups = path.join(sandbox, "backups");
  const documents = path.join(sandbox, "documents");
  const asset = path.join(assets, "profiles", "version_1", "123e4567-e89b-12d3-a456-426614174000.png");
  const document = path.join(documents, "field-sheets", "emission_1", "original.pdf");
  const scan = path.join(documents, "field-sheets", "emission_1", "scans", "capture_1.jpg");
  try {
    mkdirSync(data, { recursive: true });
    mkdirSync(path.dirname(asset), { recursive: true });
    mkdirSync(backups, { recursive: true });
    mkdirSync(path.dirname(document), { recursive: true });
    mkdirSync(path.dirname(scan), { recursive: true });
    writeFileSync(path.join(data, "test.db"), "sqlite simulada");
    writeFileSync(asset, pngHeader);
    writeFileSync(document, "%PDF-1.7 documento controlado");
    writeFileSync(scan, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    const common = path.join(projectRoot, "scripts", "Ensalia.Common.ps1").replaceAll("'", "''");
    const ps = `. '${common}'; $p=[pscustomobject]@{Database='${path.join(data, "test.db").replaceAll("'", "''")}';BackupDir='${backups.replaceAll("'", "''")}';AssetsDir='${assets.replaceAll("'", "''")}';DocumentsDir='${documents.replaceAll("'", "''")}';CompatibilityMode='test'}; New-EnsaliaBackupArchive -Paths $p -Reason qa`;
    const archive = execFileSync("powershell.exe", ["-NoProfile", "-Command", ps], { encoding: "utf8" }).trim().split(/\r?\n/).at(-1)!;
    const expanded = path.join(sandbox, "expanded");
    execFileSync("powershell.exe", ["-NoProfile", "-Command", `Expand-Archive -LiteralPath '${archive.replaceAll("'", "''")}' -DestinationPath '${expanded.replaceAll("'", "''")}'`]);
    const manifest = JSON.parse(readFileSync(path.join(expanded, "manifest.json"), "utf8").replace(/^\uFEFF/, ""));
    assert.equal(manifest.formatVersion, 3);
    assert.equal(manifest.product, "ENSALIA");
    assert.ok(manifest.files.some((entry: { path: string }) => entry.path.includes("assets/profiles/version_1/")));
    assert.equal(existsSync(path.join(expanded, "assets", "profiles", "version_1", path.basename(asset))), true);
    assert.ok(manifest.files.some((entry: { path: string }) => entry.path.includes("documents/field-sheets/emission_1/original.pdf")));
    assert.equal(existsSync(path.join(expanded, "documents", "field-sheets", "emission_1", "original.pdf")), true);
    assert.ok(manifest.files.some((entry: { path: string }) => entry.path.includes("documents/field-sheets/emission_1/scans/capture_1.jpg")));
    assert.equal(existsSync(path.join(expanded, "documents", "field-sheets", "emission_1", "scans", "capture_1.jpg")), true);

    const restore = path.join(projectRoot, "scripts", "Restore-Ensalia.ps1");
    const restoreResult = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", restore, "-BackupPath", archive, "-WhatIf"], {
      encoding: "utf8",
      env: { ...process.env, LOCALAPPDATA: sandbox },
    });
    assert.equal(restoreResult.status, 0, `${restoreResult.stdout}\n${restoreResult.stderr}`);
    assert.match(restoreResult.stdout, /What if|Qué ocurre si|Restaurar/i);

    manifest.files.push({ path: "assets/../fuera.png", sha256: "0".repeat(64) });
    writeFileSync(path.join(expanded, "manifest.json"), JSON.stringify(manifest));
    const maliciousArchive = path.join(sandbox, "malicious.zip");
    execFileSync("powershell.exe", ["-NoProfile", "-Command", `Compress-Archive -Path '${path.join(expanded, "*").replaceAll("'", "''")}' -DestinationPath '${maliciousArchive.replaceAll("'", "''")}'`]);
    const rejected = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", restore, "-BackupPath", maliciousArchive, "-WhatIf"], {
      encoding: "utf8",
      env: { ...process.env, LOCALAPPDATA: sandbox },
    });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stdout, /ruta de recurso no permitida/i);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
