import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ArchiveRecord, ArchiveRecordType, VerificationStatus } from "../../schemas/archive-record.types";

const TYPE_LABELS: Record<ArchiveRecordType, string> = { photograph: "Fotoğraf", document: "Belge", speech: "Konuşma", event: "Olay", publication: "Yayın", place: "Mekân" };
const TYPE_ALIASES: Record<string, ArchiveRecordType> = { fotograf: "photograph", belge: "document", konusma: "speech", olay: "event", yayin: "publication", kitap: "publication", mekan: "place" };

export type ArchiveFilters = { q: string; type?: ArchiveRecordType; category: string; source: string; city: string; yearFrom?: number; yearTo?: number; page: number };
type RawParams = Record<string, string | string[] | undefined>;

function repositoryRoot() { const cwd = process.cwd(); return existsSync(path.join(cwd, "content", "archive")) ? cwd : path.resolve(cwd, ".."); }
function readDirectory(directory: string) { if (!existsSync(directory)) return []; return readdirSync(directory).filter((name) => name.endsWith(".json")).sort((a, b) => a.localeCompare(b, "tr")).map((name) => JSON.parse(readFileSync(path.join(directory, name), "utf8")) as ArchiveRecord); }
let cachedRecords: readonly ArchiveRecord[] | undefined;

export function getAllArchiveRecords(): readonly ArchiveRecord[] { if (!cachedRecords) { const root = repositoryRoot(); cachedRecords = Object.freeze([...readDirectory(path.join(root, "content", "archive", "records")), ...readDirectory(path.join(root, "data", "archive", "catalog"))]); } return cachedRecords; }
export function getPublishedArchiveRecords() { return getAllArchiveRecords().filter((record) => record.verification.status === "published"); }
export function getPublishedArchiveRecord(slug: string) { if (!/^[a-z0-9-]{1,120}$/.test(slug)) return undefined; return getPublishedArchiveRecords().find((record) => record.slug === slug); }
export function typeLabel(type: ArchiveRecordType) { return TYPE_LABELS[type]; }
export function reviewLabel(status: VerificationStatus) { if (status === "published") return "Kaynak denetimli · uzman onayı bekliyor"; if (status === "reviewed") return "Yapay zekâ incelemesinde"; return "Taslak · yayıma kapalı"; }
export function normalizeTurkish(value: string) { return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c"); }
function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function clean(value: string | string[] | undefined, max = 120) { return one(value).trim().slice(0, max); }
function year(value: string | string[] | undefined) { const text = one(value); if (!/^\d{4}$/.test(text)) return undefined; const number = Number(text); return number >= 1800 && number <= 2100 ? number : undefined; }

export function parseArchiveParams(params: RawParams) {
  const warnings: string[] = []; const rawType = normalizeTurkish(clean(params.tur, 30)); const type = rawType ? TYPE_ALIASES[rawType] : undefined;
  if (rawType && !type) warnings.push("Bilinmeyen kayıt türü yok sayıldı.");
  const rawFrom = one(params.baslangic); const rawTo = one(params.bitis); const yearFrom = year(params.baslangic); const yearTo = year(params.bitis);
  if (rawFrom && !yearFrom) warnings.push("Başlangıç yılı 1800–2100 arasında olmalıdır."); if (rawTo && !yearTo) warnings.push("Bitiş yılı 1800–2100 arasında olmalıdır.");
  const pageText = one(params.sayfa); const parsedPage = /^\d+$/.test(pageText) ? Number(pageText) : 1;
  if (pageText && (!Number.isSafeInteger(parsedPage) || parsedPage < 1)) warnings.push("Geçersiz sayfa numarası ilk sayfaya yönlendirildi.");
  const filters: ArchiveFilters = { q: clean(params.q), type, category: clean(params.kategori), source: clean(params.kaynak), city: clean(params.sehir), yearFrom, yearTo, page: parsedPage > 0 ? parsedPage : 1 };
  if (yearFrom && yearTo && yearFrom > yearTo) { warnings.push("Başlangıç yılı bitiş yılından büyük olamaz; tarih aralığı kaldırıldı."); filters.yearFrom = undefined; filters.yearTo = undefined; }
  return { filters, warnings };
}

function recordYears(record: ArchiveRecord) { const start = record.date.start ? Number(record.date.start.slice(0, 4)) : undefined; const end = record.date.end ? Number(record.date.end.slice(0, 4)) : start; return { start, end }; }
export function queryArchive(records: readonly ArchiveRecord[], filters: ArchiveFilters, pageSize = 12) {
  const query = normalizeTurkish(filters.q); const category = normalizeTurkish(filters.category); const source = normalizeTurkish(filters.source); const city = normalizeTurkish(filters.city);
  const filtered = records.filter((record) => {
    if (filters.type && record.type !== filters.type) return false;
    if (category && !record.categories.some((item) => normalizeTurkish(item).includes(category))) return false;
    if (source && !normalizeTurkish(`${record.source.institution} ${record.source.title} ${record.source.citation ?? ""}`).includes(source)) return false;
    if (city && !record.locations.some((item) => normalizeTurkish(`${item.city ?? ""} ${item.name}`).includes(city))) return false;
    const years = recordYears(record); if (filters.yearFrom && (!years.end || years.end < filters.yearFrom)) return false; if (filters.yearTo && (!years.start || years.start > filters.yearTo)) return false;
    if (query) { const haystack = normalizeTurkish([record.title, record.summary, record.description ?? "", record.tags.join(" "), record.categories.join(" "), record.source.institution, record.source.citation ?? "", record.locations.map((item) => item.name).join(" ")].join(" ")); if (!query.split(/\s+/).every((token) => haystack.includes(token))) return false; }
    return true;
  }).sort((a, b) => (b.date.start ?? "").localeCompare(a.date.start ?? "") || a.title.localeCompare(b.title, "tr"));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize)); const page = Math.min(filters.page, pageCount); return { total: filtered.length, page, pageCount, items: filtered.slice((page - 1) * pageSize, page * pageSize) };
}
export function archiveQueryString(filters: ArchiveFilters, page: number) { const params = new URLSearchParams(); if (filters.q) params.set("q", filters.q); if (filters.type) params.set("tur", Object.entries(TYPE_ALIASES).find(([, value]) => value === filters.type)?.[0] ?? filters.type); if (filters.category) params.set("kategori", filters.category); if (filters.source) params.set("kaynak", filters.source); if (filters.city) params.set("sehir", filters.city); if (filters.yearFrom) params.set("baslangic", String(filters.yearFrom)); if (filters.yearTo) params.set("bitis", String(filters.yearTo)); if (page > 1) params.set("sayfa", String(page)); return params.toString(); }
export function archiveStats() {
  const all = getAllArchiveRecords(); const publishedRecords = all.filter((record) => record.verification.status === "published");
  const byType: Record<ArchiveRecordType, number> = { photograph: 0, document: 0, speech: 0, event: 0, publication: 0, place: 0 };
  for (const record of publishedRecords) byType[record.type] += 1;
  return { total: all.length, published: publishedRecords.length, reviewed: all.filter((record) => record.verification.status === "reviewed").length, draft: all.filter((record) => record.verification.status === "draft").length, displayableDetailPages: publishedRecords.filter((record) => /^[a-z0-9-]{1,120}$/.test(record.slug)).length, byType };
}
