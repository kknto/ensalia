import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(import.meta.dirname, "..");
const commonScript = path.join(projectRoot, "scripts", "Ensalia.Common.ps1");

function resolvePaths(localAppData: string) {
  const command = `. '${commonScript.replaceAll("'", "''")}'; Get-EnsaliaPaths | ConvertTo-Json -Compress`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    env: { ...process.env, LOCALAPPDATA: localAppData },
  });
  return JSON.parse(output.trim()) as { Database: string; CompatibilityMode: string };
}

test("una instalacion nueva usa la identidad y ruta nativa de Ensalia", { skip: process.platform !== "win32" }, () => {
  const root = mkdtempSync(path.join(tmpdir(), "ensalia-paths-"));
  try {
    const paths = resolvePaths(root);
    assert.equal(paths.CompatibilityMode, "native");
    assert.equal(paths.Database, path.join(root, "Ensalia", "data", "ensalia.db"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("detecta la base heredada como alias sin moverla ni crear otra", { skip: process.platform !== "win32" }, () => {
  const root = mkdtempSync(path.join(tmpdir(), "ensalia-legacy-"));
  const legacy = path.join(root, "LABSICO", "data", "labsico.db");
  try {
    mkdirSync(path.dirname(legacy), { recursive: true });
    writeFileSync(legacy, "base simulada");
    const paths = resolvePaths(root);
    assert.equal(paths.CompatibilityMode, "legacy-alias");
    assert.equal(paths.Database, legacy);
    assert.equal(existsSync(path.join(root, "Ensalia", "data", "ensalia.db")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
