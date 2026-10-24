'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { ArchiveRecordRef } from '../../lib/reading-lists/types';
import { useReadingLists, type UseReadingListsReturn } from '../../lib/reading-lists/use-reading-lists';

interface ReadingListsContextValue extends UseReadingListsReturn {
  availableArchiveRecords: ArchiveRecordRef[];
  publishedRecordMap: Map<string, ArchiveRecordRef>;
  isRecordPublished: (id: string) => boolean;
  getPublishedRecord: (id: string) => ArchiveRecordRef | undefined;
}

const ReadingListsContext = createContext<ReadingListsContextValue | null>(null);

interface Props {
  children: React.ReactNode;
  availableArchiveRecords?: ArchiveRecordRef[];
}

export function ReadingListsProvider({ children, availableArchiveRecords = [] }: Props) {
  const hookValue = useReadingLists();

  const publishedRecordMap = useMemo(() => {
    const map = new Map<string, ArchiveRecordRef>();
    for (const rec of availableArchiveRecords) {
      map.set(rec.id, rec);
    }
    return map;
  }, [availableArchiveRecords]);

  const isRecordPublished = useMemo(() => {
    return (id: string) => publishedRecordMap.has(id);
  }, [publishedRecordMap]);

  const getPublishedRecord = useMemo(() => {
    return (id: string) => publishedRecordMap.get(id);
  }, [publishedRecordMap]);

  const value: ReadingListsContextValue = {
    ...hookValue,
    availableArchiveRecords,
    publishedRecordMap,
    isRecordPublished,
    getPublishedRecord,
  };

  return (
    <ReadingListsContext.Provider value={value}>
      {children}
    </ReadingListsContext.Provider>
  );
}

export function useReadingListsContext(): ReadingListsContextValue {
  const ctx = useContext(ReadingListsContext);
  if (!ctx) {
    throw new Error('useReadingListsContext must be used within a ReadingListsProvider');
  }
  return ctx;
}
