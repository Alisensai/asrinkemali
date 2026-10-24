import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PublicationRecord } from "../../../schemas/publication-record.types";
import { isPubliclyVisible, validatePublication } from "./model.ts";

function rootDirectory() { const cwd = process.cwd(); return existsSync(path.join(cwd, "content")) ? cwd : path.resolve(cwd, ".."); }
let cache: readonly PublicationRecord[] | undefined;

export function getAllPublications(): readonly PublicationRecord[] {
  if (cache) return cache;
  const directory = path.join(rootDirectory(), "content", "publications", "records");
  if (!existsSync(directory)) return (cache = Object.freeze([]));
  // Tek bir bozuk dosya tüm yayın sayfalarını ve site haritasını düşürmesin: atlanır ve sunucu günlüğüne yazılır.
  const records = readdirSync(directory).filter((name) => name.endsWith(".json")).sort((a, b) => a.localeCompare(b, "tr")).flatMap((name) => {
    try { return [JSON.parse(readFileSync(path.join(directory, name), "utf8")) as PublicationRecord]; } catch (error) { console.warn(`[yayın] ${name} okunamadı ve atlandı: ${(error as Error).message}`); return []; }
  });
  const seenSlugs = new Set<string>();
  cache = Object.freeze(records.filter((record) => { if (!validatePublication(record).ok || seenSlugs.has(record.slug)) return false; seenSlugs.add(record.slug); return true; }));
  return cache;
}

export function getPublishedPublications() { return getAllPublications().filter((record) => isPubliclyVisible(record)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")); }
export function getPublishedPublication(slug: string) { if (!/^[a-z0-9-]{3,120}$/.test(slug)) return undefined; return getPublishedPublications().find((record) => record.slug === slug); }
export function getPublicationCategories() { return [...new Set(getPublishedPublications().map((record) => record.category))].sort((a, b) => a.localeCompare(b, "tr")); }
