export type ArchiveRecordRef = { recordId: string; slug: string; title: string; dateDisplay: string; sourceInstitution: string; type: string };
export type ReadingItem = { recordId: string; addedAt: string; readLater: boolean; note: string; snapshot: ArchiveRecordRef };
export type ReadingCollection = { id: string; name: string; description: string; createdAt: string; updatedAt: string; items: readonly ReadingItem[] };
export type ReadingListsRepository = { mode: "local-only" | "unavailable"; list(): readonly ReadingCollection[]; save(collection: ReadingCollection): void };
