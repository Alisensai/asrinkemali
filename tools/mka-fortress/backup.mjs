#!/usr/bin/env node
// MKA FORTRESS — yerel yedekleme, doğrulama ve yalıtılmış geri yükleme.
//
//   node tools/mka-fortress/backup.mjs create  --out=<boş dizin, depo dışı>
//   node tools/mka-fortress/backup.mjs verify  --dir=<yedek>
//   node tools/mka-fortress/backup.mjs restore --dir=<yedek> --target=<boş dizin, depo dışı> [--apply]
//
// Kapsam: arşiv kayıtları, yayın kayıtları ve defteri, editoryal formlar. Gerçek bir production
// veritabanı/sunucu yoktur; bu araç depo dosyalarının yedeğini alır. Geri yükleme varsayılan olarak
// DRY-RUN'dır ve yalnız depo DIŞINDAKİ boş bir hedefe yazar; depoyu asla yerinde değiştirmez.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { argument, gitHead, REPO_ROOT, sha256 } from "./lib/common.mjs";

export const BACKUP_SCOPE = ["content/archive/records", "data/archive/catalog", "content/publications", "docs/editorial/forms"];
const MANIFEST = "backup-manifest.json";

function walk(root, relative) { const full = path.join(root, relative); if (!existsSync(full)) return []; return readdirSync(full, { withFileTypes: true }).flatMap((entry) => { const child = `${relative}/${entry.name}`; return entry.isDirectory() ? walk(root, child) : entry.name.endsWith(".json") ? [child] : []; }); }
const isInside = (child, parent) => { const relative = path.relative(parent, child); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); };
function assertSafeDestination(destination, root) {
  const resolved = path.resolve(destination);
  if (isInside(resolved, root)) throw new Error("Hedef dizin depo içinde olamaz (yerinde üzerine yazma engellendi).");
  if (existsSync(resolved) && readdirSync(resolved).length) throw new Error("Hedef dizin boş olmalıdır.");
  return resolved;
}

export function createBackup(out, { root = REPO_ROOT, scope = BACKUP_SCOPE } = {}) {
  const destination = assertSafeDestination(out, root);
  mkdirSync(destination, { recursive: true });
  const files = scope.flatMap((directory) => walk(root, directory)).sort();
  const entries = files.map((file) => { const data = readFileSync(path.join(root, file)); mkdirSync(path.dirname(path.join(destination, file)), { recursive: true }); copyFileSync(path.join(root, file), path.join(destination, file)); return { file, bytes: data.length, sha256: sha256(data) }; });
  const manifest = { schema: "mka-fortress/backup@1", createdAt: new Date().toISOString(), gitHead: gitHead(root), scope, fileCount: entries.length, files: entries };
  manifest.manifestSha256 = sha256(JSON.stringify({ ...manifest, manifestSha256: undefined }));
  writeFileSync(path.join(destination, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function verifyBackup(dir) {
  const problems = []; const manifestPath = path.join(dir, MANIFEST);
  if (!existsSync(manifestPath)) return { ok: false, problems: [{ code: "MANIFEST_MISSING" }] };
  let manifest; try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch { return { ok: false, problems: [{ code: "MANIFEST_CORRUPT" }] }; }
  if (manifest.schema !== "mka-fortress/backup@1") problems.push({ code: "SCHEMA_UNSUPPORTED", schema: manifest.schema });
  if (manifest.manifestSha256 !== sha256(JSON.stringify({ ...manifest, manifestSha256: undefined }))) problems.push({ code: "MANIFEST_TAMPERED" });
  const listed = new Set();
  for (const entry of manifest.files ?? []) {
    listed.add(entry.file);
    const full = path.join(dir, entry.file);
    if (!isInside(path.resolve(full), path.resolve(dir))) { problems.push({ code: "PATH_ESCAPE", file: entry.file }); continue; }
    if (!existsSync(full)) { problems.push({ code: "FILE_MISSING", file: entry.file }); continue; }
    const data = readFileSync(full);
    if (sha256(data) !== entry.sha256) problems.push({ code: "HASH_MISMATCH", file: entry.file });
    else { try { JSON.parse(data.toString("utf8")); } catch { problems.push({ code: "JSON_CORRUPT", file: entry.file }); } }
  }
  for (const directory of manifest.scope ?? []) for (const file of walk(dir, directory)) if (!listed.has(file)) problems.push({ code: "UNLISTED_FILE", file });
  return { ok: problems.length === 0, fileCount: manifest.fileCount, gitHead: manifest.gitHead, problems };
}

export function restoreBackup(dir, target, { apply = false, root = REPO_ROOT } = {}) {
  const verification = verifyBackup(dir);
  if (!verification.ok) return { applied: false, refused: "Yedek doğrulanamadı; geri yükleme reddedildi.", verification };
  const destination = assertSafeDestination(target, root);
  const manifest = JSON.parse(readFileSync(path.join(dir, MANIFEST), "utf8"));
  // Sürüm uyumluluğu: yedeklenen arşiv kayıtlarının şema sürümleri desteklenen kümede mi?
  const supported = new Set(["1.0.0", "1.1.0"]);
  const incompatible = manifest.files.filter((entry) => /archive/.test(entry.file)).filter((entry) => !supported.has(JSON.parse(readFileSync(path.join(dir, entry.file), "utf8")).schemaVersion));
  if (incompatible.length) return { applied: false, refused: "Desteklenmeyen kayıt şema sürümü.", incompatible: incompatible.map((entry) => entry.file) };
  const plan = manifest.files.map((entry) => ({ file: entry.file, action: "create", bytes: entry.bytes }));
  if (apply) {
    for (const entry of manifest.files) { const out = path.join(destination, entry.file); mkdirSync(path.dirname(out), { recursive: true }); copyFileSync(path.join(dir, entry.file), out); }
    const restored = manifest.files.filter((entry) => sha256(readFileSync(path.join(destination, entry.file))) === entry.sha256).length;
    return { applied: true, target: destination, fileCount: plan.length, restoredVerified: restored };
  }
  return { applied: false, dryRun: true, target: destination, fileCount: plan.length, bytes: plan.reduce((sum, item) => sum + item.bytes, 0), sample: plan.slice(0, 3) };
}

export function main(argv) {
  const [command] = argv;
  try {
    if (command === "create") { const manifest = createBackup(String(argument(argv, "out"))); console.log(JSON.stringify({ created: true, fileCount: manifest.fileCount, gitHead: manifest.gitHead }, null, 2)); return 0; }
    if (command === "verify") { const result = verifyBackup(String(argument(argv, "dir"))); console.log(JSON.stringify(result, null, 2)); return result.ok ? 0 : 1; }
    if (command === "restore") { const result = restoreBackup(String(argument(argv, "dir")), String(argument(argv, "target")), { apply: argument(argv, "apply") === true }); console.log(JSON.stringify(result, null, 2)); return result.refused ? 1 : 0; }
  } catch (error) { console.error(`Hata: ${error.message}`); return 1; }
  console.error("Kullanım: backup.mjs create --out=DİZİN | verify --dir=DİZİN | restore --dir=DİZİN --target=DİZİN [--apply]");
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) process.exitCode = main(process.argv.slice(2));
