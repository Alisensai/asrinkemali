import type { ReadingCollection } from "./types";
export const MAX_COLLECTIONS = 20;
export function validateCollection(value: ReadingCollection): boolean {
  return /^[a-z0-9-]{8,80}$/.test(value.id) && value.name.trim().length > 0 && value.name.length <= 100 && value.items.length <= 100 && new Set(value.items.map((item) => item.recordId)).size === value.items.length && value.items.every((item) => /^[a-z0-9-]{1,120}$/.test(item.recordId) && item.note.length <= 1000 && item.snapshot.slug === item.snapshot.slug.replace(/[^a-z0-9-]/g, ""));
}
