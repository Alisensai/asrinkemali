/**
 * ASRIN KEMALİ - Okuma Listeleri Sabitleri
 * MKA Paleti ve güvenlik sınırları
 */
export const STORAGE_KEY = 'asrin-kemali:reading-lists:v1';
export const STORAGE_VERSION = 1;

// Güvenlik ve veri sınırları
export const MAX_JSON_SIZE_BYTES = 500 * 1024; // 500KB
export const MAX_COLLECTIONS = 20;
export const MAX_ITEMS_PER_COLLECTION = 200;
export const MAX_TOTAL_ITEMS = 1000;
export const MAX_NOTE_LENGTH = 500;
export const MAX_COLLECTION_NAME_LENGTH = 80;
export const MAX_COLLECTION_DESC_LENGTH = 300;

export const DEFAULT_COLLECTION_NAME = 'Okuma Listem';
export const DEFAULT_COLLECTION_DESC = 'Kaydettiğiniz tüm tarihî arşiv belgeleri ve fotoğrafları.';
