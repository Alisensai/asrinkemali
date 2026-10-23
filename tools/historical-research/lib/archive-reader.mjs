/**
 * Arşiv okuyucu — mevcut iki kayıt kökünü (18 eski + 150 yeni = 168) yükler.
 *
 * Bu modül OpenCode'un `scripts/archive/lib/load.mjs` okuyucusunu YENİDEN
 * KULLANIR; kendi başına JSON okumaz. Böylece tek gerçek kaynak korunur ve
 * çift sayım engellenir.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** @type {typeof import("../../../scripts/archive/lib/load.mjs")} */
let loader;

async function getLoader() {
  if (!loader) {
    loader = await import(
      pathToFileUrl(path.join(REPO_ROOT, "scripts", "archive", "lib", "load.mjs"))
    );
  }
  return loader;
}

function pathToFileUrl(p) {
  return `file://${p.replaceAll("\\", "/")}`;
}

/**
 * Tüm arşivi (iki kök birlikte) yükler.
 * @param {string|null} root
 * @returns {Promise<{records: Array, errors: Array, warnings: Array}>}
 */
export async function loadArchive(root = null) {
  const lib = await getLoader();
  const result = await lib.loadArchive(root);
  return {
    records: result.records,
    errors: result.errors,
    warnings: result.warnings,
  };
}

export { REPO_ROOT };
