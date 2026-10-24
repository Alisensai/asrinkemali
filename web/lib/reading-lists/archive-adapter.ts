import type { ArchiveRecord, ArchiveRecordType as CanonicalArchiveRecordType } from '../../../schemas/archive-record.types';
import type { ArchiveRecordRef, ArchiveRecordType } from './types';

/**
 * Türkçe yerel veya gayriresmî tür isimlerini kanonik ArchiveRecordType'a eşler.
 */
export const TURKISH_TO_CANONICAL_TYPE: Record<string, CanonicalArchiveRecordType> = {
  fotograf: 'photograph',
  fotoğraf: 'photograph',
  belge: 'document',
  evrak: 'document',
  konusma: 'speech',
  konuşma: 'speech',
  nutuk: 'speech',
  olay: 'event',
  yayin: 'publication',
  yayın: 'publication',
  gazete: 'publication',
  kitap: 'publication',
  dergi: 'publication',
  mekan: 'place',
  mekân: 'place',
  harita: 'place',
  telgraf: 'document',
  mektup: 'document',
};

/**
 * Kanonik ArchiveRecordType için Türkçe kullanıcı dostu etiket döner.
 */
export const CANONICAL_TYPE_LABELS: Record<string, string> = {
  photograph: 'Fotoğraf',
  document: 'Belge',
  speech: 'Konuşma / Nutuk',
  event: 'Tarihî Olay',
  publication: 'Süreli Yayın / Eser',
  place: 'Tarihî Mekân',
  belge: 'Belge',
  fotograf: 'Fotoğraf',
  gazete: 'Gazete',
  nutuk: 'Nutuk',
  telgraf: 'Telgraf',
  mektup: 'Mektup',
  harita: 'Harita',
  diger: 'Diğer',
};

export function getTypeLabel(type?: ArchiveRecordType | string): string {
  if (!type) return 'Belge';
  return CANONICAL_TYPE_LABELS[type] || type;
}

/**
 * Resmi ArchiveRecord nesnesini hafif ArchiveRecordRef DTO'suna dönüştürür.
 * İstemciye yalnızca güvenli ve gerekli alanlar aktarılır.
 */
export function toArchiveRecordRef(record: ArchiveRecord): ArchiveRecordRef {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    date: record.date.display || record.date.start || undefined,
    institution: record.source?.institution || undefined,
    type: record.type,
    url: `/arsiv/${record.slug}`,
  };
}

/**
 * Harici veya legacy tür dizesini kanonik türe normalize eder.
 */
export function normalizeRecordType(typeStr?: string): CanonicalArchiveRecordType | 'diger' {
  if (!typeStr) return 'document';
  const lower = typeStr.toLowerCase().trim();
  if (['photograph', 'document', 'speech', 'event', 'publication', 'place'].includes(lower)) {
    return lower as CanonicalArchiveRecordType;
  }
  return TURKISH_TO_CANONICAL_TYPE[lower] || 'diger';
}
