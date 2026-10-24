'use client';

import type { IReadingListsRepository } from './repository.ts';
import {
  RepositoryUnavailableError,
  ValidationError,
  QuotaExceededError,
} from './repository.ts';

import type {
  ArchiveRecordRef,
  ReadingCollection,
  ReadingItem,
  ReadingListsState,
  ImportResult,
  ReadingListsRepository,
} from './types.ts';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  MAX_COLLECTIONS,
  MAX_ITEMS_PER_COLLECTION,
  MAX_TOTAL_ITEMS,
  MAX_COLLECTION_NAME_LENGTH,
  MAX_COLLECTION_DESC_LENGTH,
  MAX_NOTE_LENGTH,
  DEFAULT_COLLECTION_NAME,
  DEFAULT_COLLECTION_DESC,
} from './constants.ts';
import { validateImportJSON, validateArchiveRef, detectDuplicate, sanitizeText, validateCollection } from './validation.ts';



function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nowISO(): string {
  return new Date().toISOString();
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const testKey = '__ak_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function emptyState(): ReadingListsState {
  return { version: STORAGE_VERSION, collections: [] };
}

export class LocalStorageReadingListsRepository implements IReadingListsRepository {
  isAvailable(): boolean {
    return getStorage() !== null;
  }

  async getState(): Promise<ReadingListsState> {
    const storage = getStorage();
    if (!storage) return emptyState();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.collections)) {
        return emptyState();
      }
      return {
        version: parsed.version || STORAGE_VERSION,
        collections: parsed.collections,
      };
    } catch {
      return emptyState();
    }
  }

  async saveState(state: ReadingListsState): Promise<void> {
    const storage = getStorage();
    if (!storage) throw new RepositoryUnavailableError();
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e: unknown) {
      const err = e as { name?: string; code?: number };
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        throw new QuotaExceededError('Tarayıcı depolama kotası doldu. Bazı kayıt veya koleksiyonları temizleyin.');
      }
      throw e;
    }
  }

  async clear(): Promise<void> {
    const storage = getStorage();
    if (!storage) throw new RepositoryUnavailableError();
    storage.removeItem(STORAGE_KEY);
  }

  async createCollection(name: string, description?: string): Promise<ReadingCollection> {
    const trimmedName = name ? name.trim() : '';
    if (!trimmedName) throw new ValidationError('Koleksiyon adı boş olamaz.');
    if (trimmedName.length > MAX_COLLECTION_NAME_LENGTH) {
      throw new ValidationError(`Koleksiyon adı ${MAX_COLLECTION_NAME_LENGTH} karakterden uzun olamaz.`);
    }
    if (description && description.length > MAX_COLLECTION_DESC_LENGTH) {
      throw new ValidationError(`Açıklama ${MAX_COLLECTION_DESC_LENGTH} karakterden uzun olamaz.`);
    }

    const state = await this.getState();
    if (state.collections.length >= MAX_COLLECTIONS) {
      throw new QuotaExceededError(`En fazla ${MAX_COLLECTIONS} koleksiyon oluşturabilirsiniz.`);
    }

    const safeName = sanitizeText(trimmedName, MAX_COLLECTION_NAME_LENGTH);
    const safeDesc = description ? sanitizeText(description, MAX_COLLECTION_DESC_LENGTH) : undefined;

    const col: ReadingCollection = {
      id: generateId(),
      name: safeName,
      description: safeDesc,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      items: [],
    };
    state.collections.unshift(col);
    await this.saveState(state);
    return col;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const state = await this.getState();
    state.collections = state.collections.filter((c) => c.id !== collectionId);
    await this.saveState(state);
  }

  async updateCollection(
    collectionId: string,
    patch: Partial<Pick<ReadingCollection, 'name' | 'description'>>
  ): Promise<ReadingCollection> {
    const state = await this.getState();
    const col = state.collections.find((c) => c.id === collectionId);
    if (!col) throw new ValidationError('Koleksiyon bulunamadı.');

    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) throw new ValidationError('Koleksiyon adı boş olamaz.');
      if (trimmed.length > MAX_COLLECTION_NAME_LENGTH) {
        throw new ValidationError(`Koleksiyon adı ${MAX_COLLECTION_NAME_LENGTH} karakterden uzun olamaz.`);
      }
      col.name = sanitizeText(trimmed, MAX_COLLECTION_NAME_LENGTH);
    }
    if (patch.description !== undefined) {
      col.description = patch.description
        ? sanitizeText(patch.description, MAX_COLLECTION_DESC_LENGTH)
        : undefined;
    }
    col.updatedAt = nowISO();
    await this.saveState(state);
    return col;
  }

  async addRecord(
    collectionId: string,
    record: ArchiveRecordRef,
    opts?: { readLater?: boolean; note?: string }
  ): Promise<ReadingItem> {
    const validation = validateArchiveRef(record);
    if (!validation.valid || !validation.sanitized) {
      throw new ValidationError(validation.error || 'Geçersiz arşiv kaydı.');
    }

    const state = await this.getState();
    const col = state.collections.find((c) => c.id === collectionId);
    if (!col) throw new ValidationError('Koleksiyon bulunamadı.');

    if (detectDuplicate(col, validation.sanitized.id)) {
      throw new ValidationError('Bu kayıt zaten bu koleksiyonda kayıtlıdır.');
    }
    if (col.items.length >= MAX_ITEMS_PER_COLLECTION) {
      throw new QuotaExceededError(`Bu koleksiyonda en fazla ${MAX_ITEMS_PER_COLLECTION} kayıt saklanabilir.`);
    }
    const total = state.collections.reduce((acc, c) => acc + c.items.length, 0);
    if (total >= MAX_TOTAL_ITEMS) {
      throw new QuotaExceededError(`Tüm koleksiyonlarda en fazla ${MAX_TOTAL_ITEMS} kayıt saklanabilir.`);
    }

    const safeNote = opts?.note ? sanitizeText(opts.note, MAX_NOTE_LENGTH) : undefined;

    const item: ReadingItem = {
      recordId: validation.sanitized.id,
      addedAt: nowISO(),
      readLater: Boolean(opts?.readLater),
      note: safeNote || undefined,
      snapshot: {
        id: validation.sanitized.id,
        slug: validation.sanitized.slug,
        title: validation.sanitized.title,
        date: validation.sanitized.date,
        institution: validation.sanitized.institution,
        type: validation.sanitized.type,
        url: validation.sanitized.url,
      },
    };

    col.items.unshift(item);
    col.updatedAt = nowISO();
    await this.saveState(state);
    return item;
  }

  async removeRecord(collectionId: string, recordId: string): Promise<void> {
    const state = await this.getState();
    const col = state.collections.find((c) => c.id === collectionId);
    if (!col) throw new ValidationError('Koleksiyon bulunamadı.');
    col.items = col.items.filter((i) => i.recordId !== recordId);
    col.updatedAt = nowISO();
    await this.saveState(state);
  }

  async toggleReadLater(collectionId: string, recordId: string): Promise<ReadingItem> {
    const state = await this.getState();
    const col = state.collections.find((c) => c.id === collectionId);
    if (!col) throw new ValidationError('Koleksiyon bulunamadı.');
    const item = col.items.find((i) => i.recordId === recordId);
    if (!item) throw new ValidationError('Kayıt bulunamadı.');
    item.readLater = !item.readLater;
    col.updatedAt = nowISO();
    await this.saveState(state);
    return item;
  }

  async updateItemNote(collectionId: string, recordId: string, note: string): Promise<ReadingItem> {
    const state = await this.getState();
    const col = state.collections.find((c) => c.id === collectionId);
    if (!col) throw new ValidationError('Koleksiyon bulunamadı.');
    const item = col.items.find((i) => i.recordId === recordId);
    if (!item) throw new ValidationError('Kayıt bulunamadı.');
    item.note = note ? sanitizeText(note, MAX_NOTE_LENGTH) : undefined;
    col.updatedAt = nowISO();
    await this.saveState(state);
    return item;
  }

  async moveItem(sourceCollectionId: string, targetCollectionId: string, recordId: string): Promise<void> {
    if (sourceCollectionId === targetCollectionId) return;
    const state = await this.getState();
    const source = state.collections.find((c) => c.id === sourceCollectionId);
    const target = state.collections.find((c) => c.id === targetCollectionId);
    if (!source || !target) throw new ValidationError('Koleksiyon bulunamadı.');
    const item = source.items.find((i) => i.recordId === recordId);
    if (!item) throw new ValidationError('Kayıt bulunamadı.');
    if (detectDuplicate(target, recordId)) {
      throw new ValidationError('Hedef koleksiyonda bu kayıt zaten mevcut.');
    }
    if (target.items.length >= MAX_ITEMS_PER_COLLECTION) {
      throw new QuotaExceededError('Hedef koleksiyon kapasitesi dolu.');
    }

    source.items = source.items.filter((i) => i.recordId !== recordId);
    target.items.unshift({ ...item, addedAt: nowISO() });
    source.updatedAt = nowISO();
    target.updatedAt = nowISO();
    await this.saveState(state);
  }

  async exportJSON(): Promise<string> {
    const state = await this.getState();
    return JSON.stringify(state, null, 2);
  }

  async importJSON(jsonString: string): Promise<ImportResult> {
    const result = validateImportJSON(jsonString);
    if (!result.valid || !result.state) {
      return {
        success: false,
        importedCollections: 0,
        importedItems: 0,
        errors: [result.error || 'Bilinmeyen içe aktarma hatası.'],
        warnings: [],
      };
    }

    const current = await this.getState();
    const warnings: string[] = [];
    let importedCols = 0;
    let importedItems = 0;

    for (const incomingCol of result.state.collections) {
      const existsByName = current.collections.find((c) => c.name === incomingCol.name);
      if (existsByName) {
        warnings.push(`'${incomingCol.name}' başlıklı koleksiyon zaten var olduğundan kopya olarak eklendi.`);
        incomingCol.id = generateId();
        incomingCol.name = `${incomingCol.name} (Kopya)`;
      }
      if (current.collections.length >= MAX_COLLECTIONS) {
        warnings.push(`Koleksiyon sınırı (${MAX_COLLECTIONS}) nedeniyle '${incomingCol.name}' atlandı.`);
        continue;
      }
      current.collections.push(incomingCol);
      importedCols++;
      importedItems += incomingCol.items.length;
    }

    await this.saveState(current);

    return {
      success: true,
      importedCollections: importedCols,
      importedItems,
      errors: [],
      warnings,
    };
  }

  async ensureDefaultCollection(): Promise<ReadingCollection> {
    const state = await this.getState();
    if (state.collections.length > 0) return state.collections[0];
    return this.createCollection(DEFAULT_COLLECTION_NAME, DEFAULT_COLLECTION_DESC);
  }
}

export const readingListsRepository = new LocalStorageReadingListsRepository();

export function createLocalReadingListsRepository(storage: { getItem(k: string): string | null; setItem(k: string, v: string): void }): ReadingListsRepository {
  const KEY = "asrinkemali.reading-lists.v1";
  return {
    mode: "local-only",
    list() {
      try {
        const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
        return Array.isArray(parsed)
          ? parsed.filter((item): item is ReadingCollection => typeof item === "object" && item !== null && validateCollection(item as ReadingCollection)).slice(0, MAX_COLLECTIONS)
          : [];
      } catch {
        return [];
      }
    },
    save(collection: ReadingCollection) {
      if (!validateCollection(collection)) throw new Error("READING_LIST_INVALID");
      const next = this.list().filter((item) => item.id !== collection.id);
      if (next.length >= MAX_COLLECTIONS) throw new Error("READING_LIST_LIMIT");
      storage.setItem(KEY, JSON.stringify([...next, collection]));
    },
  };
}

