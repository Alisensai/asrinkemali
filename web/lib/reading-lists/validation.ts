import { isSafeHref } from '../security/safe-url.ts';
import type { ArchiveRecordRef, ReadingCollection, ReadingItem, ReadingListsState } from './types.ts';
import {
  MAX_COLLECTION_NAME_LENGTH,
  MAX_COLLECTION_DESC_LENGTH,
  MAX_JSON_SIZE_BYTES,
  MAX_NOTE_LENGTH,
  MAX_COLLECTIONS,
  MAX_ITEMS_PER_COLLECTION,
  MAX_TOTAL_ITEMS,
  STORAGE_VERSION,
} from './constants.ts';
import { normalizeRecordType } from './archive-adapter.ts';


function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNonEmptyString(v: unknown): v is string {
  return isString(v) && v.trim().length > 0;
}

export function sanitizeText(input: string, maxLen: number): string {
  if (!input || typeof input !== 'string') return '';
  // Script ve style taglerinin içeriğini tamamen kaldır
  const withoutScripts = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Kalan HTML taglerini, javascript/data şemalarını temizle, uzunluğu kırp
  const withoutTags = withoutScripts
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .trim();
  return withoutTags.slice(0, maxLen);
}


/**
 * V1.0 güvenlik denetimi: yasak listesi (`startsWith('javascript:')`) `java\tscript:` gibi
 * tarayıcının normalleştirdiği biçimlerle atlatılabiliyordu. Artık FORTRESS izin listesi
 * kullanılır: yalnız site içi `/yol` veya `http(s)` adres.
 */
export function isSafeUrl(url?: string): boolean {
  if (!url) return true;
  return isSafeHref(url);
}

export function validateArchiveRef(ref: unknown): { valid: boolean; error?: string; sanitized?: ArchiveRecordRef } {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
    return { valid: false, error: 'Kayıt bir nesne olmalıdır.' };
  }
  const r = ref as Record<string, unknown>;

  if (!isNonEmptyString(r.id)) return { valid: false, error: 'Kayıt kimliği (id) gereklidir.' };
  if (!isNonEmptyString(r.title)) return { valid: false, error: 'Kayıt başlığı (title) gereklidir.' };

  const idStr = String(r.id).trim();
  const titleStr = String(r.title).trim();

  if (idStr.length > 200) return { valid: false, error: 'Kayıt kimliği 200 karakterden uzun olamaz.' };
  if (titleStr.length > 500) return { valid: false, error: 'Kayıt başlığı 500 karakterden uzun olamaz.' };

  const urlStr = r.url ? String(r.url) : undefined;
  if (urlStr && urlStr.length > 1000) return { valid: false, error: 'URL 1000 karakterden uzun olamaz.' };
  if (urlStr && !isSafeUrl(urlStr)) return { valid: false, error: 'Güvensiz URL protokolü tespit edildi.' };

  const slugStr = r.slug ? sanitizeText(String(r.slug), 200) : sanitizeText(idStr, 200);

  return {
    valid: true,
    sanitized: {
      id: sanitizeText(idStr, 200),
      slug: slugStr,
      title: sanitizeText(titleStr, 500),
      date: r.date ? sanitizeText(String(r.date), 100) : undefined,
      institution: r.institution ? sanitizeText(String(r.institution), 200) : undefined,
      type: normalizeRecordType(r.type ? String(r.type) : undefined),
      url: urlStr ? sanitizeText(urlStr, 1000) : `/arsiv/${slugStr}`,
    },
  };
}

/**
 * Prototype pollution denetimi: nesne ve alt özelliklerde __proto__, constructor, prototype varlığını denetler.
 */
function hasPrototypePollution(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj);
  for (const k of keys) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
      return true;
    }
    const val = (obj as Record<string, unknown>)[k];
    if (val && typeof val === 'object' && hasPrototypePollution(val)) {
      return true;
    }
  }
  return false;
}

export function validateImportJSON(jsonString: string): { valid: boolean; error?: string; state?: ReadingListsState } {
  if (typeof jsonString !== 'string') return { valid: false, error: 'JSON girdisi geçerli bir metin değil.' };

  const byteLength = typeof Buffer !== 'undefined'
    ? Buffer.byteLength(jsonString, 'utf8')
    : new TextEncoder().encode(jsonString).length;

  if (byteLength > MAX_JSON_SIZE_BYTES) {
    return {
      valid: false,
      error: `Dosya boyutu sınırı aşıldı (${(byteLength / 1024).toFixed(1)} KB > ${MAX_JSON_SIZE_BYTES / 1024} KB).`,
    };
  }

  // Raw JSON dizesinde prototype pollution anahtarlarını denetle
  if (/"(?:__proto__|constructor|prototype)"\s*:/i.test(jsonString)) {
    return { valid: false, error: 'Güvensiz JSON özellikleri tespit edildi (Prototype Pollution).' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { valid: false, error: 'Geçersiz JSON biçimi.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'JSON kök ögesi bir nesne olmalıdır.' };
  }

  if (hasPrototypePollution(parsed)) {
    return { valid: false, error: 'Güvensiz JSON özellikleri tespit edildi (Prototype Pollution).' };
  }

  const p = parsed as Record<string, unknown>;
  if (typeof p.version !== 'number') return { valid: false, error: 'Geçersiz veya eksik "version" alanı.' };
  if (!Array.isArray(p.collections)) return { valid: false, error: '"collections" bir dizi olmalıdır.' };

  if (p.collections.length > MAX_COLLECTIONS) {
    return { valid: false, error: `Koleksiyon sayısı sınırı aşıldı (En fazla ${MAX_COLLECTIONS} koleksiyon).` };
  }

  let totalItems = 0;
  const sanitizedCollections: ReadingCollection[] = [];

  for (let i = 0; i < p.collections.length; i++) {
    const col = p.collections[i];
    if (!col || typeof col !== 'object' || Array.isArray(col)) {
      return { valid: false, error: `${i + 1}. koleksiyon geçerli bir nesne değil.` };
    }
    const c = col as Record<string, unknown>;

    if (!isNonEmptyString(c.id)) return { valid: false, error: `${i + 1}. koleksiyonun kimliği (id) eksik.` };
    if (!isNonEmptyString(c.name)) return { valid: false, error: `${i + 1}. koleksiyonun adı (name) eksik.` };

    const nameStr = String(c.name).trim();
    if (nameStr.length > MAX_COLLECTION_NAME_LENGTH) {
      return { valid: false, error: `${i + 1}. koleksiyonun adı çok uzun (Azami ${MAX_COLLECTION_NAME_LENGTH} karakter).` };
    }

    if (c.description && String(c.description).length > MAX_COLLECTION_DESC_LENGTH) {
      return { valid: false, error: `${i + 1}. koleksiyonun açıklaması çok uzun (Azami ${MAX_COLLECTION_DESC_LENGTH} karakter).` };
    }

    if (!Array.isArray(c.items)) {
      return { valid: false, error: `"${nameStr}" koleksiyonundaki kayıtlar bir dizi olmalıdır.` };
    }

    if (c.items.length > MAX_ITEMS_PER_COLLECTION) {
      return { valid: false, error: `"${nameStr}" koleksiyonunda çok fazla kayıt var (Azami ${MAX_ITEMS_PER_COLLECTION}).` };
    }

    totalItems += c.items.length;
    if (totalItems > MAX_TOTAL_ITEMS) {
      return { valid: false, error: `Toplam kayıt sınırı aşıldı (Azami ${MAX_TOTAL_ITEMS} kayıt).` };
    }

    const sanitizedItems: ReadingItem[] = [];
    for (let j = 0; j < c.items.length; j++) {
      const it = c.items[j];
      if (!it || typeof it !== 'object' || Array.isArray(it)) {
        return { valid: false, error: `"${nameStr}" koleksiyonundaki ${j + 1}. kayıt geçerli değil.` };
      }
      const itemRec = it as Record<string, unknown>;

      if (!isNonEmptyString(itemRec.recordId)) {
        return { valid: false, error: `"${nameStr}" koleksiyonundaki ${j + 1}. kaydın "recordId" alanı eksik.` };
      }

      if (!itemRec.snapshot || typeof itemRec.snapshot !== 'object' || Array.isArray(itemRec.snapshot)) {
        return { valid: false, error: `"${nameStr}" koleksiyonundaki ${j + 1}. kaydın özeti (snapshot) eksik.` };
      }

      const snapRec = itemRec.snapshot as Record<string, unknown>;
      if (!isNonEmptyString(snapRec.title)) {
        return { valid: false, error: `"${nameStr}" koleksiyonundaki ${j + 1}. kaydın başlığı eksik.` };
      }

      if (itemRec.note && String(itemRec.note).length > MAX_NOTE_LENGTH) {
        return { valid: false, error: `"${nameStr}" koleksiyonundaki ${j + 1}. kaydın notu çok uzun (Azami ${MAX_NOTE_LENGTH} karakter).` };
      }

      const snapCheck = validateArchiveRef({
        id: itemRec.recordId,
        slug: snapRec.slug,
        title: snapRec.title,
        date: snapRec.date,
        institution: snapRec.institution,
        type: snapRec.type,
        url: snapRec.url,
      });

      if (!snapCheck.valid || !snapCheck.sanitized) {
        return { valid: false, error: `Kayıt özeti doğrulanamadı: ${snapCheck.error}` };
      }

      sanitizedItems.push({
        recordId: sanitizeText(String(itemRec.recordId), 200),
        addedAt: isString(itemRec.addedAt) ? itemRec.addedAt : new Date().toISOString(),
        readLater: Boolean(itemRec.readLater),
        note: itemRec.note ? sanitizeText(String(itemRec.note), MAX_NOTE_LENGTH) : undefined,
        snapshot: snapCheck.sanitized,
      });
    }

    sanitizedCollections.push({
      id: sanitizeText(String(c.id), 100),
      name: sanitizeText(nameStr, MAX_COLLECTION_NAME_LENGTH),
      description: c.description ? sanitizeText(String(c.description), MAX_COLLECTION_DESC_LENGTH) : undefined,
      createdAt: isString(c.createdAt) ? c.createdAt : new Date().toISOString(),
      updatedAt: isString(c.updatedAt) ? c.updatedAt : new Date().toISOString(),
      items: sanitizedItems,
    });
  }

  return {
    valid: true,
    state: {
      version: STORAGE_VERSION,
      collections: sanitizedCollections,
    },
  };
}

export function detectDuplicate(col: ReadingCollection, recordId: string): boolean {
  return col.items.some((i) => i.recordId === recordId);
}

export function validateCollection(value: ReadingCollection): boolean {
  if (!value || typeof value !== "object") return false;
  return (
    /^[a-z0-9-]{8,80}$/.test(value.id) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= 100 &&
    Array.isArray(value.items) &&
    value.items.length <= 100 &&
    new Set(value.items.map((item) => item.recordId)).size === value.items.length &&
    value.items.every(
      (item) =>
        /^[a-z0-9-]{1,120}$/.test(item.recordId) &&
        (item.note ?? "").length <= 1000 &&
        item.snapshot &&
        (!item.snapshot.slug || item.snapshot.slug === item.snapshot.slug.replace(/[^a-z0-9-]/g, ""))
    )
  );
}

