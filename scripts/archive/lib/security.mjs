/**
 * Arşiv verisi için güvenlik yardımcıları.
 *
 * - Dış URL'ler yalnızca https ve kurumsal alan adlarına izin verir.
 * - Serbest metinlerde HTML/script, olay işleyicisi ve mojibake arar.
 * - Yerel görsellerde yol kaçışı, uzantı, boyut ve dosya imzası denetler.
 * - JSON dosyaları için üst boyut sınırı sağlar.
 */

import fs from "node:fs/promises";
import path from "node:path";

export const MAX_JSON_BYTES = 512 * 1024;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_RECORDS = 500;

/**
 * Kaynak olarak kabul edilen kurumsal alan adları. Alt alan adları da kabul edilir.
 * Yeni bir kurum eklenmeden önce kaynağın resmî/kurumsal olduğu doğrulanmalıdır.
 */
export const ALLOWED_HOSTS = Object.freeze([
  "tbmm.gov.tr",
  "atam.gov.tr",
  "ataturkansiklopedisi.gov.tr",
  "ayk.gov.tr",
  "millikutuphane.gov.tr",
  "devletarsivleri.gov.tr",
  "anitkabir.tsk.tr",
  "tsk.gov.tr",
  "ttk.gov.tr",
  "ktb.gov.tr",
]);

const MOJIBAKE_PATTERNS = [
  /Ã§/,
  /Ã¼/,
  /Ã¶/,
  /Ã–/,
  /Ãœ/,
  /ÅŸ/,
  /Åž/,
  /Ä±/,
  /Ä°/,
  /ÄŸ/,
  /Äž/,
  /â€/,
];

export function isAllowedHost(hostname) {
  const host = String(hostname ?? "").toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function isPrivateHostname(hostname) {
  const host = String(hostname ?? "").toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "localhost.localdomain") return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    if (parts.some((part) => part < 0 || part > 255)) return true;
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    return false;
  }
  return false;
}

export function validateExternalUrl(value, { field = "url" } = {}) {
  const errors = [];
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    return { ok: false, errors: [`${field}: boş veya geçersiz URL.`], url: null };
  }
  if (/[\u0000-\u001F\u007F\s]/.test(value)) {
    return { ok: false, errors: [`${field}: URL içinde boşluk/kontrol karakteri var.`], url: null };
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, errors: [`${field}: URL ayrıştırılamadı.`], url: null };
  }
  if (url.protocol !== "https:") errors.push(`${field}: yalnızca https kullanılabilir.`);
  if (url.username || url.password) errors.push(`${field}: URL içinde kimlik bilgisi olamaz.`);
  if (url.port && url.port !== "443") errors.push(`${field}: yalnızca 443 portu kullanılabilir.`);
  if (isPrivateHostname(url.hostname)) errors.push(`${field}: özel/yerel ağ adresi kullanılamaz.`);
  if (!isAllowedHost(url.hostname)) {
    errors.push(`${field}: ${url.hostname} kurumsal kaynak alan adı listesinde değil.`);
  }
  if (/%00/i.test(value)) errors.push(`${field}: URL içinde null bayt olamaz.`);
  return { ok: errors.length === 0, errors, url: errors.length === 0 ? url : null };
}

export function assertSafeText(value, { field = "metin" } = {}) {
  const errors = [];
  if (typeof value !== "string") {
    return { ok: false, errors: [`${field}: metin olmalı.`] };
  }
  if (/[<>]/.test(value)) errors.push(`${field}: HTML açı/kapa parantezi içeremez.`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
    errors.push(`${field}: kontrol karakteri içeriyor.`);
  }
  if (value.includes("\uFFFD")) errors.push(`${field}: bozuk Unicode değiştirme karakteri içeriyor.`);
  if (MOJIBAKE_PATTERNS.some((pattern) => pattern.test(value))) {
    errors.push(`${field}: mojibake/yanlış kodlama izi içeriyor.`);
  }
  const isUrl = /^https?:\/\//i.test(value);
  if (!isUrl) {
    if (/\bon[a-z]+\s*=/i.test(value)) errors.push(`${field}: olay işleyicisi (on*=) içeriyor.`);
    if (/(?:javascript|vbscript|data)\s*:/i.test(value)) {
      errors.push(`${field}: tehlikeli URL şeması içeriyor.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

export function findPrototypePollutionKeys(value, path = "$") {
  const findings = [];
  if (value === null || typeof value !== "object") return findings;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findPrototypePollutionKeys(item, `${path}[${index}]`));
    });
    return findings;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "__proto__" || key === "prototype" || key === "constructor") {
      findings.push(`${path}.${key}`);
    }
    findings.push(...findPrototypePollutionKeys(child, `${path}.${key}`));
  }
  return findings;
}

export async function assertFileSize(filePath, maxBytes, { label = "dosya" } = {}) {
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return { ok: false, size: null, errors: [`${label}: dosya bulunamadı (${filePath}).`] };
  }
  if (!stat.isFile()) {
    return { ok: false, size: stat.size, errors: [`${label}: normal dosya değil.`] };
  }
  if (stat.size > maxBytes) {
    return {
      ok: false,
      size: stat.size,
      errors: [`${label}: ${stat.size} bayt, izin verilen ${maxBytes} bayt sınırını aşıyor.`],
    };
  }
  return { ok: true, size: stat.size, errors: [] };
}

function detectImageMime(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export async function validateLocalImage(filePath, { root, maxBytes = MAX_IMAGE_BYTES } = {}) {
  const errors = [];
  if (!root) return { ok: false, errors: ["validateLocalImage: kök dizin gerekli."], mimeType: null };
  const imagesRoot = path.resolve(root, "content", "archive", "images");
  const resolved = path.resolve(root, filePath);
  const relative = path.relative(imagesRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return {
      ok: false,
      errors: [`Görsel yolu content/archive/images dışına çıkıyor: ${filePath}`],
      mimeType: null,
    };
  }
  const extension = path.extname(resolved).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    errors.push(`Görsel uzantısı desteklenmiyor: ${extension || "(yok)"}`);
  }
  const sizeCheck = await assertFileSize(resolved, maxBytes, { label: "Görsel" });
  if (!sizeCheck.ok) errors.push(...sizeCheck.errors);
  let mimeType = null;
  if (sizeCheck.ok) {
    const handle = await fs.open(resolved, "r");
    try {
      const buffer = Buffer.alloc(16);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      mimeType = detectImageMime(buffer.subarray(0, bytesRead));
    } finally {
      await handle.close();
    }
    if (!mimeType) errors.push("Görsel dosya imzası JPEG/PNG/WebP değil.");
  }
  return { ok: errors.length === 0, errors, mimeType };
}
