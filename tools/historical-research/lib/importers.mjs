/**
 * CSV/JSON girdi doğrulama ve içe aktarma.
 *
 * İlkeler:
 *  - Girdiye asla güvenilmez: satır sayısı, alan sayısı ve tip denetimleri.
 *  - Bozuk satırlar atlanır ve sorun raporlanır; sessizce düzeltilmez.
 *  - İçe aktarılan adaylar `new` durumunda başlar; hiçbir şey doğrulanmış sayılmaz.
 */

import { validateCandidate } from "./candidates.mjs";

const CANDIDATE_FIELDS = [
  "id", "title", "institution", "institutionType", "institutionUrl", "url",
  "authors", "publishedAt", "eventYear", "periodStart", "periodEnd",
  "documentType", "sourceNature", "researchThemes", "accessedAt",
  "archiveIdentifier", "citation", "synthetic",
];

/**
 * RFC 4180 uyumlu minik CSV ayrıştırıcı (tırnak kaçışlı satır sonları dahil).
 * @param {string} csvText
 * @returns {{rows: Array<Array<string>>, issues: Array<string>}}
 */
export function parseCsv(csvText) {
  const issues = [];
  if (typeof csvText !== "string" || csvText.trim().length === 0) {
    return { rows: [], issues: ["CSV metni boş."] };
  }
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  let seenFirstQuote = false;
  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    if (inQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      if (field.length === 0) {
        inQuotes = true;
        seenFirstQuote = true;
      } else {
        issues.push(`Beklenmedik tırnak karakteri (satır ${rows.length + 1}).`);
      }
    } else if (char === ",") {
      row.push(field);
      field = "";
      seenFirstQuote = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && csvText[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      field = "";
      seenFirstQuote = false;
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  if (seenFirstQuote && field.length === 0) issues.push("Kapanmamış tırnak olabilir; son satır kontrol edildi.");
  return { rows, issues };
}

/**
 * CSV metnini aday taslaklarına çevirir. Bozuk satırlar raporlanır.
 * @param {string} csvText
 * @returns {{candidates: Array, issues: Array<{row: number, code: string, message: string}>}}
 */
export function importCandidatesFromCsv(csvText) {
  const { rows, issues: parseIssues } = parseCsv(csvText);
  const importIssues = parseIssues.map((message) => ({ row: 0, code: "CSV_PARSE", message }));
  if (rows.length === 0) {
    return { candidates: [], issues: [...importIssues, { row: 0, code: "EMPTY", message: "Veri satırı yok." }] };
  }
  const header = rows[0].map((name) => name.trim());
  for (const required of ["id", "title", "institution", "url", "accessedAt"]) {
    if (!header.includes(required)) {
      return { candidates: [], issues: [{ row: 1, code: "MISSING_COLUMN", message: `Zorunlu sütun yok: ${required}` }] };
    }
  }
  const candidates = [];
  for (let index = 1; index < rows.length; index += 1) {
    const cells = rows[index];
    if (cells.length !== header.length) {
      importIssues.push({ row: index + 1, code: "COLUMN_COUNT", message: `Sütun sayısı ${header.length} olmalı, ${cells.length} geldi; satır atlandı.` });
      continue;
    }
    const raw = Object.fromEntries(header.map((name, i) => [name, cells[i]]));
    const candidate = {
      schemaVersion: "1.0.0",
      id: raw.id,
      title: raw.title,
      institution: raw.institution,
      institutionType: raw.institutionType || "other",
      institutionUrl: raw.institutionUrl || "",
      url: raw.url,
      urlStatus: "unchecked",
      urlCheckedAt: null,
      authors: raw.authors ? raw.authors.split(";").filter(Boolean).map((name) => ({ name: name.trim() })) : [],
      publishedAt: raw.publishedAt || null,
      eventYear: raw.eventYear ? Number(raw.eventYear) : null,
      periodStart: raw.periodStart ? Number(raw.periodStart) : null,
      periodEnd: raw.periodEnd ? Number(raw.periodEnd) : null,
      people: [],
      locations: [],
      documentType: raw.documentType || "other",
      sourceNature: raw.sourceNature || "unknown",
      researchThemes: raw.researchThemes ? raw.researchThemes.split(";").filter(Boolean) : [],
      rights: { status: "unknown", license: null, licenseUrl: null, termsUrl: null, credit: raw.institution || "", imageReuse: "not_downloaded", note: "CSV içe aktarması; hak bilgisi doğrulanmadı." },
      accessedAt: raw.accessedAt,
      verification: { urlReachable: false, citationComplete: false, rightsKnown: false, duplicateChecked: false, aiReviewed: false, humanReviewed: false, notes: "" },
      state: "new",
      stateHistory: [{ state: "new", at: new Date().toISOString(), note: "CSV içe aktarması" }],
      relatedArchiveIds: [],
      claims: [],
      archiveIdentifier: raw.archiveIdentifier || null,
      citation: raw.citation || null,
      synthetic: raw.synthetic === "true",
      notes: null,
    };
    const validation = validateCandidate(candidate);
    if (!validation.ok) {
      importIssues.push({ row: index + 1, code: "INVALID_ROW", message: validation.issues.map((i) => i.message).join(" ") });
      continue;
    }
    candidates.push(candidate);
  }
  return { candidates, issues: importIssues };
}

/**
 * JSON metnini (tek aday veya dizi veya havuz sarmalayıcısı) doğrular.
 * @param {string} jsonText
 * @returns {{candidates: Array, issues: Array<{code: string, message: string}>}}
 */
export function importCandidatesFromJson(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return { candidates: [], issues: [{ code: "JSON_PARSE", message: `JSON ayrıştırılamadı: ${error.message}` }] };
  }
  const list = Array.isArray(parsed) ? parsed : parsed.candidates;
  if (!Array.isArray(list)) {
    return { candidates: [], issues: [{ code: "NO_CANDIDATES", message: "Dizi veya candidates alanı bulunamadı." }] };
  }
  const candidates = [];
  const issues = [];
  for (let index = 0; index < list.length; index += 1) {
    const candidate = list[index];
    const validation = validateCandidate(candidate);
    if (!validation.ok) {
      issues.push({ code: "INVALID_CANDIDATE", message: `${index + 1}. aday: ${validation.issues.map((i) => i.message).join(" ")}` });
      continue;
    }
    candidates.push(candidate);
  }
  return { candidates, issues };
}

export { CANDIDATE_FIELDS };
