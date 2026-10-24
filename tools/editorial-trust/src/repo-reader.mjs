import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import { parseUntrustedJson, INPUT_LIMITS } from "../../../web/lib/editorial-trust/input-safety.ts";

/**
 * Gerçek repo verisinin salt-okunur okuyucusu. Hiçbir dosyaya yazmaz.
 * Her dosya için: kök dışına çıkış, sembolik bağ, boyut, UTF-8 ve JSON güvenliği denetlenir.
 * Okunamayan dosya sessizce atlanmaz; `unreadable` listesine güvenli bir kodla girer.
 */

export const CATALOG_DIRS = Object.freeze(["content/archive/records", "data/archive/catalog"]);
export const FORMS_DIR = "docs/editorial/forms";
export const PUBLICATION_DIR = "content/publications/records";

export class SecurityBoundaryError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

/** Kullanıcı girdisi yol parçası: yalnız kök altındaki göreli yol. */
export function assertSafeRelative(relative) {
  if (typeof relative !== "string" || !relative || relative.includes("\0")) throw new SecurityBoundaryError("invalid_path");
  const normalized = relative.normalize("NFC");
  if (path.isAbsolute(normalized) || /^[a-zA-Z]:/.test(normalized) || normalized.startsWith("\\\\") || normalized.startsWith("//")) {
    throw new SecurityBoundaryError("absolute_or_unc_path");
  }
  if (normalized.split(/[\\/]+/).includes("..")) throw new SecurityBoundaryError("path_traversal");
  return normalized;
}

export function safeReadJson(root, relative) {
  const safe = assertSafeRelative(relative);
  const realRoot = realpathSync(root);
  const absolute = path.resolve(realRoot, safe);
  let stat;
  try {
    stat = lstatSync(absolute);
  } catch {
    return { ok: false, error: "file_unreadable" };
  }
  if (stat.isSymbolicLink()) return { ok: false, error: "symlink_rejected" };
  const real = realpathSync(absolute);
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) return { ok: false, error: "outside_root" };
  return readChecked(real, stat);
}

function readChecked(file, stat) {
  if (!stat.isFile()) return { ok: false, error: "file_unreadable" };
  if (stat.size > INPUT_LIMITS.maxBytes) return { ok: false, error: "input_too_large" };
  const parsed = parseUntrustedJson(new Uint8Array(readFileSync(file)));
  return parsed.ok ? { ok: true, value: parsed.value } : { ok: false, error: parsed.error };
}

/**
 * Toplu okuma: dizinin gerçek yolu bir kez çözülüp kök içinde olduğu doğrulanır; sonra
 * her dosya için yalnız lstat (sembolik bağ reddi) yapılır. Doğrulanmış dizindeki sembolik
 * olmayan dosya kök dışına çıkamaz; dosya başına realpath maliyeti (Windows'ta yüksek) yok.
 */
function readDirectoryJson(realRoot, relativeDir) {
  const absoluteDir = path.resolve(realRoot, assertSafeRelative(relativeDir));
  let realDir;
  let names;
  try {
    realDir = realpathSync(absoluteDir);
    names = readdirSync(realDir).filter((name) => name.endsWith(".json")).sort();
  } catch {
    return null;
  }
  if (realDir !== realRoot && !realDir.startsWith(realRoot + path.sep)) throw new SecurityBoundaryError("outside_root");
  return names.map((name) => {
    const file = `${relativeDir}/${name}`;
    let stat;
    try {
      stat = lstatSync(path.join(realDir, name));
    } catch {
      return { file, result: { ok: false, error: "file_unreadable" } };
    }
    if (stat.isSymbolicLink()) return { file, result: { ok: false, error: "symlink_rejected" } };
    return { file, result: readChecked(path.join(realDir, name), stat) };
  });
}

export function loadRepository(root) {
  const realRoot = realpathSync(root);
  const unreadable = [];
  const missingDirs = [];
  const collect = (dir, kind, sink, field, required) => {
    const entries = readDirectoryJson(realRoot, dir);
    if (!entries) {
      if (required) missingDirs.push(dir);
      return;
    }
    for (const { file, result } of entries) {
      if (!result.ok) unreadable.push({ file, kind, error: result.error });
      else sink.push({ file, [field]: result.value });
    }
  };
  const records = [];
  for (const dir of CATALOG_DIRS) collect(dir, "archive_record", records, "record", true);
  const forms = [];
  collect(FORMS_DIR, "review_form", forms, "form", true);
  const publications = [];
  collect(PUBLICATION_DIR, "publication_record", publications, "record", false);
  return { records, forms, publications, unreadable, missingDirs };
}
