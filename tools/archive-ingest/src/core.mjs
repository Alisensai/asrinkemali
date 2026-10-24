import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { foldTr, isValidCalendarDate } from "../../../scripts/archive/lib/text.mjs";
import { assertSafeText, findPrototypePollutionKeys, validateExternalUrl } from "../../../scripts/archive/lib/security.mjs";

const ID = /^[a-z0-9][a-z0-9-]{2,119}$/;
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const MAX_RECORDS = 10_000;
export const MAX_CELL_CHARS = 16_384;
export const TOOL_VERSION = "0.1.0";
const SPREADSHEET_FORMULA = /^[\s\u00a0\t\r\n]*[=+\-@]/u;

const sha256 = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const text = (value) => typeof value === "string" ? value.normalize("NFC").trim() : "";
const slug = (value) => foldTr(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Escape only at the CSV export boundary; source data is never altered. */
export function escapeCsvCell(value) {
  const raw = String(value ?? "");
  const guarded = SPREADSHEET_FORMULA.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replaceAll('"', '""')}"`;
}

export function parseHistoricalDate(raw) {
  const value = text(raw);
  if (/^\d{4}$/.test(value)) return { ok: true, value: { start: value, end: null, precision: "year", certainty: "unknown", display: value } };
  if (/^\d{4}-\d{2}$/.test(value)) { const [year, month] = value.split("-").map(Number); return month >= 1 && month <= 12 ? { ok: true, value: { start: value, end: null, precision: "month", certainty: "unknown", display: value } } : { ok: false, code: "INVALID_DATE" }; }
  if (isValidCalendarDate(value)) return { ok: true, value: { start: value, end: null, precision: "day", certainty: "exact", display: value } };
  return { ok: false, code: "INVALID_DATE" };
}

export function parseCsv(source) {
  const rows = []; let row = []; let field = ""; let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) { if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; } else if (char === '"') quoted = false; else field += char; continue; }
    if (char === '"') { quoted = true; continue; }
    if (char === ",") { row.push(field); field = ""; continue; }
    if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; continue; }
    field += char;
  }
  if (quoted) throw new Error("CSV_QUOTE_UNCLOSED");
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift()?.map((item) => item.replace(/^\uFEFF/, "").trim()) ?? [];
  if (!headers.length || headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new Error("CSV_HEADERS_INVALID");
  return rows.filter((items) => items.some((item) => item !== "")).map((items, rowIndex) => {
    if (items.length !== headers.length) throw new Error("CSV_COLUMN_COUNT_INVALID");
    if (items.some((item) => item.length > MAX_CELL_CHARS)) throw new Error("CSV_CELL_TOO_LARGE");
    return { ...Object.fromEntries(headers.map((header, index) => [header, items[index] ?? ""])), __row: rowIndex + 2 };
  });
}

export function readCandidates(inputPath) {
  const extension = path.extname(inputPath).toLowerCase();
  if (!['.csv', '.json'].includes(extension)) throw new Error("INPUT_FORMAT_UNSUPPORTED");
  const stat = existsSync(inputPath) ? readFileSync(inputPath) : null;
  if (!stat) throw new Error("INPUT_NOT_FOUND");
  if (stat.byteLength === 0 || stat.byteLength > MAX_INPUT_BYTES) throw new Error("INPUT_SIZE_INVALID");
  const raw = stat.toString("utf8");
  if (raw.includes("\uFFFD") || raw.includes("\0")) throw new Error("INPUT_ENCODING_INVALID");
  let rows;
  if (extension === '.csv') rows = parseCsv(raw);
  else {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) rows = parsed;
    else if (parsed && typeof parsed === "object" && Array.isArray(parsed.records)) rows = parsed.records;
    else if (parsed && typeof parsed === "object" && typeof parsed.id === "string") rows = [parsed];
    else throw new Error("JSON_ENVELOPE_INVALID");
  }
  if (rows.length === 0) throw new Error("INPUT_EMPTY");
  if (rows.length > MAX_RECORDS) throw new Error("INPUT_RECORD_LIMIT");
  if (findPrototypePollutionKeys(rows).length) throw new Error("INPUT_PROTOTYPE_POLLUTION");
  return { rows, inputSha256: sha256(raw) };
}

function existingArchiveIndex(root) {
  const folders = ["content/archive/records", "data/archive/catalog"];
  const ids = new Set(); const slugs = new Map(); const urls = new Map(); const files = [];
  for (const folder of folders) {
    const dir = path.join(root, folder);
    if (!existsSync(dir) || !lstatSync(dir).isDirectory()) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      try {
        const parsed = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
        const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed.records) ? parsed.records : [parsed];
        for (const record of records) {
          if (typeof record?.id === "string") ids.add(record.id.trim());
          if (typeof record?.slug === "string") slugs.set(record.slug.trim(), record.id ?? null);
          if (typeof record?.source?.url === "string") urls.set(record.source.url.trim(), record.id ?? null);
        }
        files.push({ path: path.posix.join(folder, name), sha256: sha256(readFileSync(path.join(dir, name))) });
      } catch {
        // Existing catalog malformation must not make ingestion silently succeed; its own validator reports it.
      }
    }
  }
  return { ids, slugs, urls, snapshotSha256: sha256(files.sort((a, b) => a.path.localeCompare(b.path))) };
}

export function stageRows(rows, { inputSha256, root, generatedAt }) {
  const archive = existingArchiveIndex(root); const seen = new Set(); const seenSlugs = new Set(); const candidates = []; const findings = [];
  for (const [index, raw] of rows.entries()) {
    const row = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const id = text(row.id); const title = text(row.title); const sourceUrl = text(row.source_url ?? row.sourceUrl); const institution = text(row.institution); const date = parseHistoricalDate(row.date_raw ?? row.date);
    const errors = []; const warnings = [];
    if (!ID.test(id)) errors.push("INVALID_ID");
    if (!title) errors.push("TITLE_REQUIRED");
    if (!institution) errors.push("INSTITUTION_REQUIRED");
    if (!date.ok) errors.push(date.code);
    const url = validateExternalUrl(sourceUrl, { field: "source_url" }); if (!url.ok) errors.push("SOURCE_URL_INVALID");
    for (const [field, value] of [["title", title], ["institution", institution]]) {
      const safe = assertSafeText(value, { field });
      if (!safe.ok) errors.push("UNSAFE_TEXT");
    }
    if (seen.has(id) || archive.ids.has(id)) errors.push("DUPLICATE_ID");
    seen.add(id);
    const candidateSlug = title ? slug(title) : null;
    if (candidateSlug && (seenSlugs.has(candidateSlug) || archive.slugs.has(candidateSlug))) warnings.push("SLUG_COLLISION_REVIEW_REQUIRED");
    if (candidateSlug) seenSlugs.add(candidateSlug);
    if (archive.urls.has(sourceUrl)) warnings.push("EXACT_SOURCE_URL_REVIEW_REQUIRED");
    const approvalKeys = ["review_status", "reviewedBy", "reviewer", "humanExpertApproved", "humanReviewComplete", "published", "approved", "verification"];
    const untrustedClaims = approvalKeys.filter((key) => Object.hasOwn(row, key));
    if (untrustedClaims.length) warnings.push("UNTRUSTED_INPUT_APPROVAL_CLAIM");
    const missingFields = ["type", "license", "source_title", "summary", "category"].filter((key) => !text(row[key]));
    if (missingFields.length) warnings.push("MISSING_REQUIRED_ARCHIVE_MAPPING");
    const item = {
      candidateId: `candidate-${inputSha256.slice(0, 12)}-${String(index + 1).padStart(6, "0")}`,
      inputRef: { rowIndex: index, displayLineNumber: Number(row.__row ?? index + 1), rowSha256: sha256(row) },
      normalizedInput: { id: id || null, title: title || null, slug: candidateSlug, institution: institution || null, sourceUrl: sourceUrl || null, date: date.ok ? date.value : null },
      proposedArchiveDraft: null,
      partialDraft: { id: id || null, slug: candidateSlug, title: title || null, date: date.ok ? date.value : null },
      matchingRecords: [], missingFields, validationIssues: [...errors, ...warnings], reviewStatus: "pending_human", ingest: false, publishEligible: false, humanApproval: null, sourceVerifiedByHuman: false,
      status: errors.length ? "rejected" : missingFields.length ? "needs_manual_completion" : "accepted_staging",
      untrustedInputClaims: untrustedClaims,
    };
    if (errors.length) findings.push({ row: item.inputRef.displayLineNumber, id: id || null, severity: "blocker", codes: errors }); else candidates.push(item);
  }
  const manifest = { schemaVersion: "1.0.0", toolVersion: TOOL_VERSION, mode: "staging_only", status: findings.length ? "partial" : "complete", generatedAt, inputSha256, archiveSnapshotSha256: archive.snapshotSha256, publishEligible: false, humanApproved: false, recordCounts: { seen: rows.length, staged: candidates.length, blocked: findings.length, warnings: candidates.reduce((total, item) => total + item.validationIssues.filter((issue) => issue !== "UNSAFE_TEXT").length, 0) }, candidates, findings };
  return { manifest: { ...manifest, sha256: sha256(manifest) }, candidates, findings };
}

export function assertSafeOutput(root, output) {
  if (typeof output !== "string" || !output.trim() || path.isAbsolute(output)) throw new Error("STAGING_OUTPUT_FORBIDDEN");
  const parts = output.split(/[\\/]+/);
  if (parts.some((part) => part === ".." || part === "." || !part)) throw new Error("STAGING_OUTPUT_FORBIDDEN");
  const allowed = path.resolve(root, "data", "ingest-staging"); const resolved = path.resolve(root, output);
  if (!resolved.startsWith(`${allowed}${path.sep}`) || /(^|[\\/])\.(git|github)([\\/]|$)/i.test(resolved)) throw new Error("STAGING_OUTPUT_FORBIDDEN");
  return resolved;
}
