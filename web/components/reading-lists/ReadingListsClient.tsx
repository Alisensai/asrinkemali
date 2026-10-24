"use client";
import { useMemo, useState } from "react";
import { createLocalReadingListsRepository, type ArchiveRecordRef, type ReadingCollection } from "@/lib/reading-lists";

const storage = () => typeof window === "undefined" ? null : window.localStorage;
export function ReadingListsClient({ records }: { records: readonly ArchiveRecordRef[] }) {
  const [collections, setCollections] = useState<readonly ReadingCollection[]>(() => { const area = storage(); return area ? createLocalReadingListsRepository(area).list() : []; });
  const [name, setName] = useState("");
  const byId = useMemo(() => new Map(records.map((record) => [record.recordId, record])), [records]);
  const save = (next: readonly ReadingCollection[]) => { const area = storage(); if (!area) return; const repo = createLocalReadingListsRepository(area); next.forEach((item) => repo.save(item)); setCollections(repo.list()); };
  const create = () => { const value = name.trim(); if (!value) return; const now = new Date().toISOString(); save([...collections, { id: `local-${crypto.randomUUID()}`, name: value, description: "", createdAt: now, updatedAt: now, items: [] }]); setName(""); };
  const add = (collection: ReadingCollection, record: ArchiveRecordRef) => { if (collection.items.some((item) => item.recordId === record.recordId)) return; const next = { ...collection, updatedAt: new Date().toISOString(), items: [...collection.items, { recordId: record.recordId, addedAt: new Date().toISOString(), readLater: true, note: "", snapshot: record }] }; save([...collections.filter((item) => item.id !== collection.id), next]); };
  return <section aria-labelledby="reading-lists-heading"><h1 id="reading-lists-heading">Okuma Listem</h1><p>Listeler yalnız bu tarayıcıda saklanır; hesap veya cihazlar arası eşitleme yoktur.</p><label>Yeni liste <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></label><button type="button" onClick={create}>Liste oluştur</button>{collections.length ? collections.map((collection) => <section key={collection.id}><h2>{collection.name}</h2>{collection.items.length ? <ul>{collection.items.map((item) => <li key={item.recordId}><a href={`/arsiv/${item.snapshot.slug}`}>{item.snapshot.title}</a></li>)}</ul> : <p>Bu listede henüz kayıt yok.</p>}<label>Kayıt ekle <select defaultValue="" onChange={(event) => { const record = byId.get(event.target.value); if (record) add(collection, record); event.currentTarget.value = ""; }}><option value="">Kayıt seçin</option>{records.map((record) => <option key={record.recordId} value={record.recordId}>{record.title}</option>)}</select></label></section>) : <p>Henüz yerel bir okuma listesi yok.</p>}</section>;
}
