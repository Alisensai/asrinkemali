import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cli = path.join(repoRoot, "scripts", "archive", "validate.mjs");

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    timeout: 30_000,
  });
}

test("CLI --json başarılı sonucu ve çıkış kodunu döndürür", () => {
  const result = run(["--json"]);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.stats.total, 168);
  assert.equal(payload.stats.byStatus.published, 151);
  assert.equal(payload.stats.byStatus.reviewed, 16);
  assert.equal(payload.stats.byStatus.draft, 1);
  assert.equal(payload.stats.withQuotation, 2);
  assert.equal(payload.stats.withImage, 21);
  assert.equal(payload.stats.linkOnly, 150);
  assert.equal(payload.stats.hostedFiles, 0);
  assert.equal(payload.stats.metadataOnly, 0);
  assert.equal(payload.errors.length, 0);
  assert.equal(payload.warnings.length, 7);
  assert.equal(payload.links, null);
});

test("CLI --strict uyarıları hata sayar ve 1 ile çıkar", () => {
  const result = run(["--strict"]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Sonuç: başarısız/);
  assert.match(result.stdout, /SIKI_KIP/);
});

test("CLI --help ve bilinmeyen seçenek davranışı", () => {
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Kullanım:/);
  assert.match(help.stdout, /--links/);

  const unknown = run(["--bilinmeyen"]);
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /Bilinmeyen seçenek/);
});

test("CLI --root ile boş kök dizin yükleme hatası verir", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-cli-"));
  try {
    const result = run(["--root", dir, "--json"]);
    assert.equal(result.status, 1, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.ok(payload.errors.some((error) => error.code === "YUKLEME"));
    assert.ok(payload.errors.some((error) => error.code === "KOK"));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("validate.cmd ve validate sarmalayıcıları mevcuttur", async () => {
  const cmd = path.join(repoRoot, "scripts", "archive", "validate.cmd");
  const sh = path.join(repoRoot, "scripts", "archive", "validate");
  assert.equal((await fs.stat(cmd)).isFile(), true);
  assert.equal((await fs.stat(sh)).isFile(), true);
});
