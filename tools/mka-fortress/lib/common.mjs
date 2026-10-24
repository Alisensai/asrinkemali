// MKA FORTRESS ortak yardımcıları: kanonik özet, kayıt yükleme (dosya sistemi veya Git referansı),
// güvenli URL denetimi. Hiçbir fonksiyon depo dosyalarına yazmaz.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const ARCHIVE_DIRS = ["content/archive/records", "data/archive/catalog"];

/** Anahtar sırası ve biçimden bağımsız kanonik JSON (aynı içerik → aynı özet). */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
export const sha256 = (input) => createHash("sha256").update(input).digest("hex");
export const recordHash = (record) => sha256(canonicalJson(record));

/** Güvenli dış URL: https, host, kimlik bilgisi yok, boşluk yok. */
export function isSafeHttpsUrl(value) {
  if (typeof value !== "string" || /\s/.test(value)) return false;
  try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
}
export const hostOf = (value) => { try { return new URL(value).hostname; } catch { return null; } };

function git(args, cwd) { return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); }
export function gitHead(root = REPO_ROOT) { try { return git(["rev-parse", "HEAD"], root).trim(); } catch { return null; } }

/** Kayıtları yükler. `ref` verilirse dosyalar `git show REF:yol` ile okunur (çalışma ağacına dokunmadan). */
export function loadArchive({ root = REPO_ROOT, ref = null } = {}) {
  const files = [];
  if (ref) {
    if (!/^[\w./~^-]{1,200}$/.test(ref)) throw new Error("Geçersiz Git referansı.");
    const listed = git(["ls-tree", "-r", "--name-only", ref, "--", ...ARCHIVE_DIRS], root).split("\n").filter((name) => name.endsWith(".json"));
    for (const name of listed) files.push({ file: name, text: git(["show", `${ref}:${name}`], root) });
  } else {
    for (const directory of ARCHIVE_DIRS) { const full = path.join(root, directory); if (!existsSync(full)) continue; for (const name of readdirSync(full).filter((item) => item.endsWith(".json")).sort()) files.push({ file: `${directory}/${name}`, text: readFileSync(path.join(full, name), "utf8") }); }
  }
  const records = []; const parseErrors = [];
  for (const { file, text } of files) { try { records.push({ file, record: JSON.parse(text) }); } catch (error) { parseErrors.push({ file, error: error.message }); } }
  return { records, parseErrors };
}

/** Onay defteri (JSONL, approval-event.schema.json) → insan onayı bulunan kayıt kimlikleri. */
export function approvedRecordIds(ledgerPath) {
  if (!ledgerPath) return new Set();
  const ids = new Set();
  for (const line of readFileSync(ledgerPath, "utf8").split(/\r?\n/).filter(Boolean)) {
    const event = JSON.parse(line);
    if ((event.event_type === "editor_approval_recorded" && event.actor_role === "human_editor") || (event.event_type === "review_submitted" && event.actor_role === "human_expert")) ids.add(event.record_id);
  }
  return ids;
}

export function argument(argv, name, fallback = null) { const found = argv.find((value) => value === `--${name}` || value.startsWith(`--${name}=`)); if (!found) return fallback; return found.includes("=") ? found.slice(found.indexOf("=") + 1) : true; }
