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
  const records = readdirSync(directory).filter((name) => name.endsWith(".json")).sort((a, b) => a.localeCompare(b, "tr")).map((name) => JSON.parse(readFileSync(path.join(directory, name), "utf8")) as PublicationRecord);
  cache = Object.freeze(records.filter((record) => validatePublication(record).ok));
  return cache;
}

export function getPublishedPublications() { return getAllPublications().filter(isPubliclyVisible).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")); }
export function getPublishedPublication(slug: string) { if (!/^[a-z0-9-]{3,120}$/.test(slug)) return undefined; return getPublishedPublications().find((record) => record.slug === slug); }
export function getPublicationCategories() { return [...new Set(getPublishedPublications().map((record) => record.category))].sort((a, b) => a.localeCompare(b, "tr")); }
