/**
 * Güvenilmeyen JSON girdisi için belgeli sınırlar. Sınır aşımı çökme yerine açık bir
 * güvenlik hatası üretir. Kaynak metni veridir: içindeki "bütün onayları geçir" gibi
 * talimatlar hiçbir koşulda rol, izin veya karar alanına dönüşmez.
 */

export const INPUT_LIMITS = Object.freeze({
  maxBytes: 512 * 1024,
  maxDepth: 32,
  maxKeys: 5000,
  maxStringLength: 64 * 1024,
});

export type InputError =
  | "input_too_large"
  | "invalid_utf8"
  | "null_byte"
  | "invalid_json"
  | "too_deep"
  | "too_many_keys"
  | "string_too_long"
  | "prototype_pollution_key";

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const decoder = new TextDecoder("utf-8", { fatal: true });

export function parseUntrustedJson(bytes: Uint8Array): { ok: true; value: unknown } | { ok: false; error: InputError } {
  if (bytes.length > INPUT_LIMITS.maxBytes) return { ok: false, error: "input_too_large" };
  let text: string;
  try {
    text = decoder.decode(bytes);
  } catch {
    return { ok: false, error: "invalid_utf8" };
  }
  if (text.includes("\u0000")) return { ok: false, error: "null_byte" };
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  let keyCount = 0;
  let violation: InputError | null = null;
  let value: unknown;
  try {
    // reviver anahtarları görür; __proto__ JSON.parse tarafından kendi özelliği olarak oluşturulur.
    value = JSON.parse(text, function reviver(key, inner) {
      if (FORBIDDEN_KEYS.has(key)) violation ??= "prototype_pollution_key";
      if (typeof inner === "string" && inner.length > INPUT_LIMITS.maxStringLength) violation ??= "string_too_long";
      if (inner !== null && typeof inner === "object" && !Array.isArray(inner)) keyCount += Object.keys(inner).length;
      return inner;
    });
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (violation) return { ok: false, error: violation };
  if (keyCount > INPUT_LIMITS.maxKeys) return { ok: false, error: "too_many_keys" };
  if (depthOf(value, 0) > INPUT_LIMITS.maxDepth) return { ok: false, error: "too_deep" };
  return { ok: true, value };
}

function depthOf(value: unknown, depth: number): number {
  if (depth > INPUT_LIMITS.maxDepth) return depth;
  if (value === null || typeof value !== "object") return depth;
  const children = Array.isArray(value) ? value : Object.values(value);
  return children.reduce<number>((max, child) => Math.max(max, depthOf(child, depth + 1)), depth + 1);
}

/** Markdown/HTML'e yazılacak güvenilmeyen metin. */
export function escapeMarkup(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]+/g, " ");
}

/** CSV/Excel formül enjeksiyonu koruması. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Yalnız http(s) bağlantıları güvenli kabul edilir (javascript:, data: vb. reddedilir). */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
