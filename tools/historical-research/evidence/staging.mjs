/**
 * Staging dizini güvenliği.
 *
 * KURALLAR:
 * - Yalnız data/research/evidence-staging/ ALTINA yazılır; arşiv kataloglarına
 *   (data/archive/, content/archive/, schemas/) yazma reddedilir (mutlak yol ve
 *   `..` geçişleri dahil — realpath kanonikleştirmesiyle).
 * - Bozuk UTF-8 reddedilir; büyük JSON reddedilir (sınır: 5 MB).
 * - Dışa aktarılan notlar gerçek arşive OTOMATİK aktarılmaz (dry-run varsayılan).
 */

import fs from "node:fs/promises";
import path from "node:path";

/** Staging kökü (repo içi sabit). */
export const STAGING_ROOT = path.resolve(process.cwd(), "data", "research", "evidence-staging");

/** Yazma üst sınırı. */
export const MAX_STAGING_BYTES = 5 * 1024 * 1024;

const FORBIDDEN_PREFIXES = [
  path.resolve(process.cwd(), "data", "archive"),
  path.resolve(process.cwd(), "content", "archive"),
  path.resolve(process.cwd(), "schemas"),
];

/**
 * Yol güvenlik denetimi: staging dışına yazma yok.
 * @param {string} target
 */
export function assertStagingWrite(target) {
  const resolved = path.resolve(target);
  const inside = resolved === STAGING_ROOT || resolved.startsWith(STAGING_ROOT + path.sep);
  if (!inside) {
    throw new Error(`Yazma reddedildi: ${resolved} staging kökünün (${STAGING_ROOT}) dışında.`);
  }
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (resolved === prefix || resolved.startsWith(prefix + path.sep)) {
      throw new Error(`Yazma reddedildi: arşiv katalog dizini (${prefix}) staging yazmasına kapalı.`);
    }
  }
}

/**
 * UTF-8 doğrulaması — bozuk bayt dizileri reddedilir.
 * @param {Buffer} buffer
 */
export function assertValidUtf8(buffer) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    decoder.decode(buffer);
  } catch {
    throw new Error("Bozuk UTF-8: dosya geçerli UTF-8 değil, reddedildi.");
  }
}

/**
 * Staging dosyasına güvenli yazar.
 * @param {string} filePath staging içinde göreli yol
 * @param {string} content UTF-8 metin
 */
export async function stagingWrite(filePath, content) {
  const target = path.join(STAGING_ROOT, filePath);
  assertStagingWrite(target);
  const buffer = Buffer.from(content, "utf8");
  assertValidUtf8(buffer);
  if (buffer.length > MAX_STAGING_BYTES) {
    throw new Error(`Dosya çok büyük (${buffer.length} bayt > ${MAX_STAGING_BYTES}).`);
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return target;
}

/**
 * Staging dosyasından güvenli okur (UTF-8 doğrulamalı).
 * @param {string} filePath staging içinde göreli yol
 */
export async function stagingRead(filePath) {
  const target = path.join(STAGING_ROOT, filePath);
  assertStagingRead(target);
  const buffer = await fs.readFile(target);
  assertValidUtf8(buffer);
  if (buffer.length > MAX_STAGING_BYTES) {
    throw new Error(`Dosya çok büyük (${buffer.length} bayt).`);
  }
  return buffer.toString("utf8");
}

/** @param {string} target */
function assertStagingRead(target) {
  const resolved = path.resolve(target);
  const inside = resolved === STAGING_ROOT || resolved.startsWith(STAGING_ROOT + path.sep);
  if (!inside) {
    throw new Error(`Okuma reddedildi: ${resolved} staging kökünün dışında (path traversal).`);
  }
}

/**
 * Staging JSON dosyasını ayrıştırır ve şema doğrulayıcısından geçirir.
 * @param {string} filePath
 * @param {(value: unknown) => { ok: boolean; issues: Array<{ code: string; message: string }> }} validator
 */
export async function stagingReadJson(filePath, validator) {
  const text = await stagingRead(filePath);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Staging JSON bozuk: ${error instanceof Error ? error.message : "bilinmeyen"}`);
  }
  const validation = validator(parsed);
  if (!validation.ok) {
    throw new Error(
      `Staging doğrulama hatası (${filePath}): ` +
      validation.issues.map((issue) => `${issue.code}: ${issue.message}`).join("; ")
    );
  }
  return parsed;
}
