// Güvenlik ilkeleri: kabuk yok, doğrulanmış girdiler, beyaz listeli çıktı yolları, redaksiyon ve kaçışlama.
// GitHub'dan gelen başlık/açıklama gibi metinler GÜVENİLMEYEN veri olarak işlenir.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const EXPECTED_REPO = "Alisensai/asrinkemali";

export function assertPrNumber(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 100000 || String(value) !== String(number)) throw new Error(`Geçersiz PR numarası: ${String(value).slice(0, 20)}`);
  return number;
}

/** Git ref adı: seçenek enjeksiyonu (-…), yol geçişi (..), boşluk ve kabuk metakarakteri yasak. */
export function assertRef(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(value) || value.includes("..") || value.includes("//") || value.endsWith("/") || value.endsWith(".lock")) throw new Error(`Geçersiz git ref: ${String(value).slice(0, 40)}`);
  return value;
}
export function assertSha(value) { if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) throw new Error("Geçersiz commit SHA."); return value; }

const SECRET_PATTERNS = [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, /\b(Bearer|token)\s+[A-Za-z0-9._~+/-]{12,}/gi, /([?&](?:access_)?token=)[^&\s]+/gi, /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g];
export function redact(text) {
  let output = String(text ?? "");
  for (const pattern of SECRET_PATTERNS) output = output.replace(pattern, (match, group1) => (typeof group1 === "string" && group1.endsWith("=") ? `${group1}[REDACTED]` : "[REDACTED]"));
  return stripUserPaths(output);
}
/** Yerel kullanıcı adını ve ev dizinini raporlardan kaldırır. */
export function stripUserPaths(text) { return String(text).replace(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"']+/gi, "~").replace(/\/(home|Users)\/[^/\s"']+/g, "~"); }

/** Markdown tablo hücresi: biçim/HTML/bağlantı enjeksiyonunu ve satır kırılmasını engeller. */
export function mdEscape(value) {
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/[\\`*_{}[\]()#+!|<>~]/g, (char) => `\\${char}`).replace(/&/g, "&amp;").slice(0, 300);
}
/** CSV hücresi: tablolama yazılımında formül enjeksiyonunu engeller. */
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Çıktı yalnız izinli kökler altında olabilir (rapor dizini veya işletim sistemi geçici dizini). */
export function safeOutputPath(target, allowedRoots) {
  const resolved = path.resolve(target);
  const ok = allowedRoots.some((root) => { const relative = path.relative(path.resolve(root), resolved); return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)); });
  if (!ok) throw new Error("Çıktı yolu izinli rapor dizinleri dışında; yazma reddedildi.");
  return resolved;
}
export const tempRoot = () => os.tmpdir();

/** Kabuksuz alt süreç; zaman aşımı ve redakte edilmiş çıktı. */
export function run(command, args, { cwd, timeoutMs = 120_000, input, env } = {}) {
  if (!["git", "gh", "npm", "node", "python", "python3", "npx"].includes(command)) throw new Error(`İzin verilmeyen komut: ${command}`);
  for (const arg of args) if (typeof arg !== "string") throw new Error("Argümanlar metin olmalıdır.");
  const executable = process.platform === "win32" && ["npm", "npx"].includes(command) ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, { cwd, input, encoding: "utf8", timeout: timeoutMs, maxBuffer: 512 * 1024 * 1024, env: env ? { ...process.env, ...env } : process.env, shell: process.platform === "win32" && executable.endsWith(".cmd"), windowsHide: true });
  return { code: result.status ?? (result.error ? -1 : 0), stdout: result.stdout ?? "", stderr: redact(result.stderr ?? ""), timedOut: result.error?.code === "ETIMEDOUT", error: result.error ? redact(result.error.message) : null };
}

/** Çalışılan dizin gerçekten beklenen GitHub deposunun git çalışma ağacı mı? */
export function assertExpectedRepo(dir, runner = run) {
  if (!existsSync(path.join(dir, ".git"))) throw new Error("Dizin bir git çalışma ağacı değil.");
  const remote = runner("git", ["remote", "get-url", "origin"], { cwd: dir }).stdout.trim();
  if (!remote.replace(/\.git$/, "").toLowerCase().endsWith(EXPECTED_REPO.toLowerCase())) throw new Error("Beklenen depo kimliği doğrulanamadı (origin uyuşmuyor).");
  return true;
}
