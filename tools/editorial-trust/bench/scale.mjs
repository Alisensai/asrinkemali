#!/usr/bin/env node
/**
 * Sentetik ölçek denemesi. Kayıtlar ve formlar yalnız işletim sistemi geçici dizininde
 * üretilir ve sonunda silinir; gerçek content/, data/ veya docs/editorial/forms dizinine
 * yazılmaz. Sentetik kayıtlar gerçek tarihî bilgi veya gerçek kişi içermez.
 *
 *   node tools/editorial-trust/bench/scale.mjs 500 2000 10000
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { legacyRecordHash } from "../../../web/lib/editorial-trust/canonical.ts";
import { stableJson, toCsv } from "../src/output.mjs";
import { buildTrustReport } from "../src/trust-report.mjs";

export function syntheticRecord(i) {
  const id = `synthetic-${String(i).padStart(6, "0")}`;
  return {
    schemaVersion: "1.0.0",
    id,
    slug: id,
    title: `Sentetik kayıt ${i}`,
    type: "document",
    date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" },
    summary: "Sentetik ölçek kaydı.",
    source: { institution: "Sentetik Kurum", title: `Sentetik kaynak ${i}`, url: `https://example.org/doc/${i}`, archiveIdentifier: `SYN-${i}` },
    provenance: [{ institution: "Sentetik Kurum", identifier: `SYN-${i}`, url: `https://example.org/doc/${i}` }],
    rights: { status: i % 50 === 0 ? "unknown" : "official_link_only", imageReuse: "not_downloaded" },
    image: null,
    verification: { status: i % 3 === 0 ? "reviewed" : "published", reviewedBy: null, reviewedAt: null, checks: {} },
  };
}

function pendingForm(record, staleHash) {
  return {
    schema_version: "1.0.0",
    record_id: record.id,
    record_path: `data/archive/catalog/${record.id}.json`,
    record_snapshot_sha256: staleHash ?? legacyRecordHash(record),
    record_snapshot: { title: record.title, type: record.type, date: record.date, source_institution: record.source.institution, source_url: record.source.url, citation: record.source.title, rights_status: record.rights.status },
    review_status: "pending",
    reviewer: null,
    review_date: null,
    checks: { historical_facts: "not_reviewed", source_authenticity: "not_reviewed", source_record_consistency: "not_reviewed", quotation: "not_reviewed", copyright_and_reuse: "not_reviewed" },
    outcome: "pending",
    evidence: [],
    explanation: "",
    publicationApproval: null,
  };
}

/** Her 20. form stale, her 100. kaydın formu yok. */
export function runScale(n) {
  const root = mkdtempSync(path.join(os.tmpdir(), `mka-trust-scale-${n}-`));
  try {
    for (const dir of ["data/archive/catalog", "content/archive/records", "docs/editorial/forms"]) mkdirSync(path.join(root, dir), { recursive: true });
    const genStart = performance.now();
    for (let i = 1; i <= n; i += 1) {
      const record = syntheticRecord(i);
      writeFileSync(path.join(root, "data/archive/catalog", `${record.id}.json`), JSON.stringify(record));
      if (i % 100 !== 0) writeFileSync(path.join(root, "docs/editorial/forms", `${record.id}.json`), JSON.stringify(pendingForm(record, i % 20 === 0 ? "f".repeat(64) : undefined)));
    }
    const generationMs = performance.now() - genStart;
    // Ham G/Ç tabanı: aynı dosyaları yalnız okuyup ayrıştırmak. Analiz süresinden ayrı raporlanır.
    const ioStart = performance.now();
    for (const dir of ["data/archive/catalog", "docs/editorial/forms"]) for (const name of readdirSync(path.join(root, dir))) JSON.parse(readFileSync(path.join(root, dir, name), "utf8"));
    const rawIoBaselineMs = performance.now() - ioStart;
    const start = performance.now();
    const report = buildTrustReport(root, { now: Date.parse("2026-10-24T10:00:00Z") });
    const analysisMs = performance.now() - start;
    const outStart = performance.now();
    const jsonBytes = Buffer.byteLength(stableJson(report));
    const csvBytes = Buffer.byteLength(toCsv(report));
    const exportMs = performance.now() - outStart;
    return {
      records: n,
      scanned: report.counts.catalog_records,
      matchedForms: report.counts.matched_forms,
      missingForms: report.counts.missing_forms,
      stale: report.counts.stale,
      rightsBlocked: report.counts.rights_blocked,
      releaseReady: report.counts.release_ready,
      unreadable: report.counts.unreadable_files,
      findings: Object.values(report.findingCounts).reduce((a, b) => a + b, 0),
      generationMs: Math.round(generationMs),
      rawIoBaselineMs: Math.round(rawIoBaselineMs),
      analysisMs: Math.round(analysisMs),
      exportMs: Math.round(exportMs),
      jsonBytes,
      csvBytes,
      maxRssMb: Math.round(process.resourceUsage().maxRSS / 1024),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const sizes = process.argv.slice(2).map(Number).filter((value) => Number.isInteger(value) && value > 0 && value <= 50_000);
  const results = (sizes.length ? sizes : [500]).map(runScale);
  process.stdout.write(`${JSON.stringify({ node: process.version, platform: `${process.platform}-${process.arch}`, cpus: os.cpus().length, results }, null, 2)}\n`);
}
