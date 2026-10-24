/**
 * Çıktı yolu koruması (Görev 07).
 *
 * #19'un `assertNoCatalogWrite` denetimi yalnız dizgi karşılaştırmasıydı: katalog
 * dışındaki her yere (`../../x`, `.git/hooks/…`, `web/app/page.tsx`) yazmaya izin
 * veriyordu. Bu modül izin listesi yaklaşımı uygular:
 *  - Hedef yalnız izinli rapor/dry-run dizinlerinin veya işletim sistemi geçici
 *    dizininin altında olabilir.
 *  - Var olan en yakın ata `realpath` ile çözülür (symlink/junction kaçışı yakalanır).
 *  - Hedefin kendisi var ve sembolik bağsa reddedilir.
 *  - Katalog, şema, `.git`, formlar, yayınlar ve `.env*` her durumda reddedilir.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

export const ALLOWED_OUTPUT_DIRS = Object.freeze([
  "data/research/candidates/exports",
  "docs/research/evidence-integration/reports",
  "tools/historical-research/reports",
]);

export const FORBIDDEN_SEGMENTS = Object.freeze([
  "data/archive",
  "content/archive",
  "content/publications",
  "docs/editorial/forms",
  "schemas",
  ".git",
]);

export class OutputPathError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function realpathOfNearestExisting(target) {
  let current = target;
  const tail = [];
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    tail.unshift(path.basename(current));
    current = parent;
  }
  const real = fs.realpathSync.native ? fs.realpathSync.native(current) : fs.realpathSync(current);
  return path.join(real, ...tail);
}

/**
 * Hedef yolu doğrular ve gerçek (realpath) mutlak yolunu döndürür. Reddederse
 * `OutputPathError` fırlatır; hata mesajı yerel mutlak yolu içermez.
 * @param {string} target
 * @param {{root?: string, extraAllowedDirs?: string[]}} [options]
 */
export function assertSafeOutputPath(target, options = {}) {
  if (typeof target !== "string" || target.length === 0 || target.includes("\0")) {
    throw new OutputPathError("INVALID_OUTPUT_PATH", "Çıktı yolu geçersiz.");
  }
  if (/^\\\\|^\/\/[^/]/.test(target)) {
    throw new OutputPathError("UNC_PATH_FORBIDDEN", "UNC/ağ yolu çıktı olarak kabul edilmez.");
  }
  const root = fs.realpathSync(path.resolve(options.root ?? REPO_ROOT));
  const resolved = realpathOfNearestExisting(path.resolve(root, target.normalize("NFC")));
  const relativeToRoot = path.relative(root, resolved).split(path.sep).join("/");
  if (inside(root, resolved)) {
    const lower = relativeToRoot.toLowerCase();
    for (const segment of FORBIDDEN_SEGMENTS) {
      if (lower === segment || lower.startsWith(`${segment}/`) || lower.includes(`/${segment}/`)) {
        throw new OutputPathError("PROTECTED_PATH", `Korumalı yola yazma reddedildi: ${segment}`);
      }
    }
    if (/(^|\/)\.env/i.test(relativeToRoot)) throw new OutputPathError("PROTECTED_PATH", "Ortam dosyasına yazma reddedildi.");
  }
  const allowed = [...ALLOWED_OUTPUT_DIRS, ...(options.extraAllowedDirs ?? [])].map((dir) => path.resolve(root, dir));
  const tmp = fs.realpathSync(os.tmpdir());
  const permitted = inside(tmp, resolved) || allowed.some((dir) => inside(realpathOfNearestExisting(dir), resolved));
  if (!permitted) {
    throw new OutputPathError("OUTPUT_DIR_NOT_ALLOWED", `Çıktı yalnız izinli dizinlere yazılabilir: ${ALLOWED_OUTPUT_DIRS.join(", ")} veya geçici dizin.`);
  }
  try {
    if (fs.lstatSync(resolved).isSymbolicLink()) throw new OutputPathError("SYMLINK_TARGET", "Sembolik bağ hedefine yazılmaz.");
  } catch (error) {
    if (error instanceof OutputPathError) throw error;
  }
  return resolved;
}

/**
 * Güvenli ve atomik yazım: önce aynı dizinde geçici dosya, sonra rename.
 * Yarım yazılmış rapor dosyası bırakmaz.
 */
export function writeFileAtomic(target, content, options = {}) {
  const resolved = assertSafeOutputPath(target, options);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temp = `${resolved}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, content, { encoding: "utf8", flag: "wx" });
  try {
    fs.renameSync(temp, resolved);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
  return resolved;
}
