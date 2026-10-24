'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ArchiveRecordRef, ReadingCollection, ReadingListsState } from './types.ts';
import { readingListsRepository } from './local-repository.ts';


export interface UseReadingListsReturn {
  state: ReadingListsState | null;
  collections: ReadingCollection[];
  isLoading: boolean;
  isStorageAvailable: boolean;
  error: string | null;
  createCollection: (name: string, desc?: string) => Promise<ReadingCollection>;
  deleteCollection: (id: string) => Promise<void>;
  updateCollection: (id: string, patch: { name?: string; description?: string }) => Promise<void>;
  addRecord: (collectionId: string, record: ArchiveRecordRef, opts?: { readLater?: boolean; note?: string }) => Promise<void>;
  addToDefault: (record: ArchiveRecordRef, opts?: { readLater?: boolean; note?: string }) => Promise<void>;
  removeRecord: (collectionId: string, recordId: string) => Promise<void>;
  toggleReadLater: (collectionId: string, recordId: string) => Promise<void>;
  updateNote: (collectionId: string, recordId: string, note: string) => Promise<void>;
  moveItem: (sourceId: string, targetId: string, recordId: string) => Promise<void>;
  exportJSON: () => Promise<string>;
  importJSON: (json: string) => Promise<{ success: boolean; warnings: string[]; errors: string[]; importedCollections: number; importedItems: number }>;
  clearAll: () => Promise<void>;
  isInAnyCollection: (recordId: string) => boolean;
  refresh: () => Promise<void>;
}

export function useReadingLists(): UseReadingListsReturn {
  const [state, setState] = useState<ReadingListsState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStorageAvailable, setIsStorageAvailable] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const available = readingListsRepository.isAvailable();
      setIsStorageAvailable(available);
      if (!available) {
        setState({ version: 1, collections: [] });
        return;
      }
      const s = await readingListsRepository.getState();
      setState(s);
      setError(null);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const available = readingListsRepository.isAvailable();
        if (!active) return;
        setIsStorageAvailable(available);
        if (!available) {
          setState({ version: 1, collections: [] });
          setIsLoading(false);
          return;
        }
        const s = await readingListsRepository.getState();
        if (!active) return;
        setState(s);
        setError(null);
      } catch (e: unknown) {
        if (!active) return;
        const err = e as { message?: string };
        setError(err?.message || 'Veriler yüklenirken bir sorun oluştu.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);


  const collections = useMemo(() => state?.collections ?? [], [state]);

  const createCollection = useCallback(async (name: string, desc?: string): Promise<ReadingCollection> => {
    const col = await readingListsRepository.createCollection(name, desc);
    await refresh();
    return col;
  }, [refresh]);


  const deleteCollection = useCallback(async (id: string) => {
    await readingListsRepository.deleteCollection(id);
    await refresh();
  }, [refresh]);

  const updateCollection = useCallback(async (id: string, patch: { name?: string; description?: string }) => {
    await readingListsRepository.updateCollection(id, patch);
    await refresh();
  }, [refresh]);

  const addRecord = useCallback(async (collectionId: string, record: ArchiveRecordRef, opts?: { readLater?: boolean; note?: string }) => {
    await readingListsRepository.addRecord(collectionId, record, opts);
    await refresh();
  }, [refresh]);

  const addToDefault = useCallback(async (record: ArchiveRecordRef, opts?: { readLater?: boolean; note?: string }) => {
    const def = await readingListsRepository.ensureDefaultCollection();
    await readingListsRepository.addRecord(def.id, record, opts);
    await refresh();
  }, [refresh]);

  const removeRecord = useCallback(async (collectionId: string, recordId: string) => {
    await readingListsRepository.removeRecord(collectionId, recordId);
    await refresh();
  }, [refresh]);

  const toggleReadLater = useCallback(async (collectionId: string, recordId: string) => {
    await readingListsRepository.toggleReadLater(collectionId, recordId);
    await refresh();
  }, [refresh]);

  const updateNote = useCallback(async (collectionId: string, recordId: string, note: string) => {
    await readingListsRepository.updateItemNote(collectionId, recordId, note);
    await refresh();
  }, [refresh]);

  const moveItem = useCallback(async (sourceId: string, targetId: string, recordId: string) => {
    await readingListsRepository.moveItem(sourceId, targetId, recordId);
    await refresh();
  }, [refresh]);

  const exportJSON = useCallback(async () => {
    return readingListsRepository.exportJSON();
  }, []);

  const importJSON = useCallback(async (json: string) => {
    const res = await readingListsRepository.importJSON(json);
    await refresh();
    return {
      success: res.success,
      warnings: res.warnings,
      errors: res.errors,
      importedCollections: res.importedCollections,
      importedItems: res.importedItems,
    };
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await readingListsRepository.clear();
    await refresh();
  }, [refresh]);

  const isInAnyCollection = useCallback((recordId: string) => {
    return collections.some((c) => c.items.some((i) => i.recordId === recordId));
  }, [collections]);

  return {
    state,
    collections,
    isLoading,
    isStorageAvailable,
    error,
    createCollection,
    deleteCollection,
    updateCollection,
    addRecord,
    addToDefault,
    removeRecord,
    toggleReadLater,
    updateNote,
    moveItem,
    exportJSON,
    importJSON,
    clearAll,
    isInAnyCollection,
    refresh,
  };
}
