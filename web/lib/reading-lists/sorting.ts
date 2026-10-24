import type { ReadingItem, SortConfig } from './types';

/**
 * Türkçe harf duyarlı deterministik sıralama işlevi
 */
export function sortItems(items: ReadingItem[], config: SortConfig): ReadingItem[] {
  const copy = [...items];
  const factor = config.order === 'asc' ? 1 : -1;

  return copy.sort((a, b) => {
    if (config.by === 'title') {
      const titleA = a.snapshot?.title || '';
      const titleB = b.snapshot?.title || '';
      return factor * titleA.localeCompare(titleB, 'tr-TR', { sensitivity: 'base' });
    }

    if (config.by === 'date') {
      const dateA = a.snapshot?.date || '';
      const dateB = b.snapshot?.date || '';
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return factor * dateA.localeCompare(dateB, 'tr-TR');
    }

    if (config.by === 'type') {
      const typeA = a.snapshot?.type || '';
      const typeB = b.snapshot?.type || '';
      return factor * typeA.localeCompare(typeB, 'tr-TR');
    }

    // Varsayılan: addedAt
    const timeA = new Date(a.addedAt).getTime() || 0;
    const timeB = new Date(b.addedAt).getTime() || 0;
    return factor * (timeA - timeB);
  });
}
