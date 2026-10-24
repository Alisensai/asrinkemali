import type { ArchiveRecordType as SchemaArchiveRecordType } from '../../../schemas/archive-record.types';

export type ArchiveRecordType = SchemaArchiveRecordType | 'belge' | 'fotograf' | 'gazete' | 'nutuk' | 'telgraf' | 'mektup' | 'harita' | 'diger';

export interface ArchiveRecordRef {
  id: string;
  slug: string;
  title: string;
  date?: string; // Gösterim metni veya ISO - örn 1923-10-29
  institution?: string;
  type?: ArchiveRecordType;
  url?: string; // Arşiv detay sayfası (/arsiv/[slug])
}

// Kullanıcıya ait koleksiyon kaydı - tam metin/PDF içermez, sadece referans snapshot
export interface ReadingItem {
  recordId: string;
  addedAt: string; // ISO
  readLater: boolean;
  note?: string;
  snapshot: {
    id?: string;
    slug?: string;
    title: string;
    date?: string;
    institution?: string;
    type?: ArchiveRecordType;
    url?: string;
  };
}

export interface ReadingCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  items: ReadingItem[];
}

export interface ReadingListsState {
  version: number;
  collections: ReadingCollection[];
}

export type SortBy = 'addedAt' | 'title' | 'date' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  by: SortBy;
  order: SortOrder;
}

export interface ImportResult {
  success: boolean;
  importedCollections: number;
  importedItems: number;
  errors: string[];
  warnings: string[];
}
