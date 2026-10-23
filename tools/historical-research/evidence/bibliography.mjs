/**
 * Akademik kaynakça motoru: Chicago, APA, BibTeX, CSL-JSON, Markdown.
 *
 * KURALLAR:
 * - Eksik yazar/tarih/yayıncı UYDURULMAZ; eksik alan açıkça işaretlenir.
 * - Özgün eser ile onu yayımlayan dijital platform AYIRT edilir.
 * - Türkçe karakterler olduğu gibi korunur.
 * - BibTeX özel karakterleri kaçışlanır.
 */

/**
 * @typedef {import("./contracts.d.ts").SourceCandidateRef} SourceCandidateRef
 */

/** Eksik alan işareti (kaynakçada görünür). */
export const MISSING = "[eksik: {field}]";

/**
 * Kaynak meta verisi (adaydan türetilmiş, doğrulanmış alanlar).
 * @typedef {Object} BibliographicMetadata
 * @property {string|null} author — soyad, ad (yoksa null)
 * @property {string} title
 * @property {string|null} year
 * @property {string|null} publisher
 * @property {string|null} platform — dijital platform (Atatürk Ansiklopedisi vb.)
 * @property {string|null} url
 * @property {string|null} accessDate — ISO tam tarih
 * @property {"primary"|"secondary"|"unknown"} sourceNature
 */

/**
 * Adaydan kaynakça meta verisi üretir — yalnız mevcut alanlar.
 * @param {SourceCandidateRef} candidate
 * @param {{ publishedAt?: string|null, authors?: Array<{name: string}>, citation?: string|null, archiveIdentifier?: string|null }} extra
 * @returns {BibliographicMetadata}
 */
/**
 * @param {SourceCandidateRef} candidate
 * @param {{ publishedAt?: string|null, authors?: Array<{name: string}>, citation?: string|null, archiveIdentifier?: string|null }} [extra]
 */
export function metadataFromCandidate(candidate, extra = {}) {
  const authors = (extra.authors ?? []).map((a) => a.name).filter(Boolean);
  const rawDate = extra.publishedAt ?? null;
  const year = rawDate ? String(rawDate).slice(0, 4) : null;
  return {
    author: authors.length > 0 ? authors.join(" ve ") : null,
    title: candidate.title,
    year: /^\d{4}$/.test(year ?? "") ? year : null,
    publisher: null, // platform bilgisinden ayrı tutulur; kitap künyesi ayrıca doğrulanmalı
    platform: candidate.institution,
    url: candidate.url,
    accessDate: null,
    sourceNature: candidate.sourceNature,
  };
}

/** Chicago (yazar-tarih) biçimi. */
/** @param {BibliographicMetadata} meta */
export function toChicago(meta) {
  const author = meta.author ?? MISSING.replace("{field}", "yazar");
  const year = meta.year ?? MISSING.replace("{field}", "yıl");
  const title = meta.title;
  const platform = meta.platform ? ` ${meta.platform}.` : "";
  const url = meta.url ? ` ${meta.url}.` : "";
  const access = meta.accessDate ? ` Erişim tarihi: ${meta.accessDate}.` : "";
  return `${author}. ${year}. "${title}."${platform}${url}${access}`;
}

/** APA 7 biçimi. */
/** @param {BibliographicMetadata} meta */
export function toApa(meta) {
  const author = meta.author ?? MISSING.replace("{field}", "yazar");
  const year = meta.year ? `(${meta.year}).` : `(${MISSING.replace("{field}", "yıl")}).`;
  const platform = meta.platform ? ` ${meta.platform}.` : "";
  const url = meta.url ? ` ${meta.url}` : "";
  return `${author} ${year} ${title(meta)}.${platform}${url}`;
}

/** @param {BibliographicMetadata} meta */
function title(meta) {
  return meta.sourceNature === "secondary" ? meta.title : meta.title;
}

/** BibTeX (özel karakterler kaçışlı). */
/**
 * @param {BibliographicMetadata} meta
 * @param {string} [key]
 */
export function toBibtex(meta, key = "mka2026") {
  const fields = [];
  if (meta.author) fields.push(`  author = {${escapeBibtex(meta.author)}}`);
  else fields.push(`  author = {} % eksik: yazar`);
  if (meta.year) fields.push(`  year = {${meta.year}}`);
  fields.push(`  title = {${escapeBibtex(meta.title)}}`);
  if (meta.platform) fields.push(`  publisher = {${escapeBibtex(meta.platform)}}`);
  if (meta.url) fields.push(`  url = {${escapeBibtex(meta.url)}}`);
  if (meta.accessDate) fields.push(`  urldate = {${meta.accessDate}}`);
  fields.push(`  note = {Kaynak niteliği: ${meta.sourceNature}}`);
  return `@misc{${escapeBibtex(key)},\n${fields.join(",\n")}\n}`;
}

/** @param {string} text */
function escapeBibtex(text) {
  return String(text).replace(/([@{}"\\])/g, "\\$1");
}

/** CSL-JSON. */
/**
 * @param {BibliographicMetadata} meta
 * @param {string} [id]
 */
export function toCslJson(meta, id = "mka-csl") {
  return {
    id,
    type: "webpage",
    title: meta.title,
    ...(meta.author ? { author: [{ literal: meta.author }] } : {}),
    ...(meta.year ? { issued: { "date-parts": [[Number(meta.year)]] } } : {}),
    ...(meta.platform ? { publisher: meta.platform } : {}),
    ...(meta.url ? { URL: meta.url } : {}),
    ...(meta.accessDate ? { accessed: { "date-parts": [meta.accessDate.split("-").map(Number)] } } : {}),
    note: meta.year ? undefined : "yıl bilgisi eksik",
  };
}

/** Markdown kaynakça girdisi (eksik alanlar işaretli). */
/** @param {BibliographicMetadata} meta */
export function toMarkdownEntry(meta) {
  const lines = [`- **${meta.title}**`];
  lines.push(`  - Yazar: ${meta.author ?? MISSING.replace("{field}", "yazar")}`);
  lines.push(`  - Yıl: ${meta.year ?? MISSING.replace("{field}", "yıl")}`);
  if (meta.platform) lines.push(`  - Platform: ${meta.platform} (özgün eser platformdan ayrı değerlendirilmelidir)`);
  if (meta.url) lines.push(`  - URL: ${meta.url}`);
  if (meta.accessDate) lines.push(`  - Erişim: ${meta.accessDate}`);
  lines.push(`  - Nitelik: ${meta.sourceNature}`);
  return lines.join("\n");
}

/**
 * Kaynakça veri kalitesi raporu: hangi alanlar eksik.
 * @param {BibliographicMetadata} meta
 */
/** @param {BibliographicMetadata} meta */
export function missingFields(meta) {
  const missing = [];
  if (!meta.author) missing.push("author");
  if (!meta.year) missing.push("year");
  if (!meta.url) missing.push("url");
  if (!meta.accessDate) missing.push("accessDate");
  return missing;
}

/**
 * CSV dışa aktarımı için formül enjeksiyonu koruması: hücre başı = + - @ @
 * karakterleri ve boşluk/kontrol karakterleriyle başlayan değerler tek tırnakla
 * öneklenir (spreadsheet-safe).
 * @param {string} value
 */
/** @param {string} value */
export function csvSafeCell(value) {
  const text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text) || /^\s/.test(text)) {
    return `'${text}`;
  }
  return text;
}
