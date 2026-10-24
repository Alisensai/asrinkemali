import { MAX_COLLECTIONS, validateCollection } from "./validation.ts";
import type { ReadingCollection, ReadingListsRepository } from "./types";

const KEY = "asrinkemali.reading-lists.v1";
export function createLocalReadingListsRepository(storage: Storage): ReadingListsRepository {
  return {
    mode: "local-only",
    list() {
      try { const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? "[]"); return Array.isArray(parsed) ? parsed.filter((item): item is ReadingCollection => typeof item === "object" && item !== null && validateCollection(item as ReadingCollection)).slice(0, MAX_COLLECTIONS) : []; } catch { return []; }
    },
    save(collection) {
      if (!validateCollection(collection)) throw new Error("READING_LIST_INVALID");
      const next = this.list().filter((item) => item.id !== collection.id);
      if (next.length >= MAX_COLLECTIONS) throw new Error("READING_LIST_LIMIT");
      storage.setItem(KEY, JSON.stringify([...next, collection]));
    },
  };
}
