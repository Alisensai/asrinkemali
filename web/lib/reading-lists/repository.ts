import type { ArchiveRecordRef, ReadingCollection, ReadingItem, ReadingListsState, ImportResult } from './types';

/**
 * Kişisel Koleksiyon Depo Sözleşmesi
 * İleride sunucu tarafı yetkilendirme ve veritabanı geldiğinde bu sözleşmeye göre bir API adaptörü eklenebilir.
 */
export interface IReadingListsRepository {
  getState(): Promise<ReadingListsState>;
  saveState(state: ReadingListsState): Promise<void>;
  clear(): Promise<void>;
  isAvailable(): boolean;

  // Koleksiyon işlemleri
  createCollection(name: string, description?: string): Promise<ReadingCollection>;
  deleteCollection(collectionId: string): Promise<void>;
  updateCollection(collectionId: string, patch: Partial<Pick<ReadingCollection, 'name' | 'description'>>): Promise<ReadingCollection>;

  // Kayıt işlemleri
  addRecord(collectionId: string, record: ArchiveRecordRef, opts?: { readLater?: boolean; note?: string }): Promise<ReadingItem>;
  removeRecord(collectionId: string, recordId: string): Promise<void>;
  toggleReadLater(collectionId: string, recordId: string): Promise<ReadingItem>;
  updateItemNote(collectionId: string, recordId: string, note: string): Promise<ReadingItem>;
  moveItem(sourceCollectionId: string, targetCollectionId: string, recordId: string): Promise<void>;

  // İçe/Dışa aktarma
  exportJSON(): Promise<string>;
  importJSON(jsonString: string): Promise<ImportResult>;
}

export class RepositoryUnavailableError extends Error {
  constructor() {
    super('Tarayıcı yerel depolaması kullanılamıyor. Gizli mod veya depolama kısıtlaması olabilir.');
    this.name = 'RepositoryUnavailableError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}
