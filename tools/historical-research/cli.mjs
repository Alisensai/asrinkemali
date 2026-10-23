#!/usr/bin/env node
/**
 * MKA EVIDENCE ENGINE V0.7 — Komut satırı arayüzü.
 *
 * Komutlar:
 *   gap-report    Arşiv boşluk analizi raporu üretir.
 *   pool-status   Aday havuzu özetini ve doğrulama durumlarını listeler.
 *   dry-run       Adayları ArchiveRecord taslağına dönüştürür (yalnız taslak; katalog yazılmaz).
 *   claims        İddia-kanıt ağının durumunu raporlar.
 *
 * Güvenlik notları:
 *   - Hiçbir komut `data/archive/catalog/` veya `content/archive/records/`
 *     altına yazmaz (kod düzeyinde korunur).
 *   - Ağ getirmesi yapılmaz; URL denetimi yapılsaldır. Erişilebilirlik
 *     denetimi insan tetiklemeli ayrı bir adımdır (verify:reachable).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadArchive } from "./lib/archive-reader.mjs";
import { analyzeGaps } from "./lib/gap-analysis.mjs";
import { loadPool, poolSummary, validateCandidate } from "./lib/candidates.mjs";
import { findDuplicates } from "./lib/dedupe.mjs";
import { convertCandidateToDraft } from "./lib/convert-dryrun.mjs";
import { gapReportToMarkdown, poolToMarkdown, poolToCsv, writeReport } from "./lib/report.mjs";
import { validateExternalUrl } from "./lib/url-security.mjs";
import fs from "node:fs/promises";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const POOL_PATH = path.join(REPO_ROOT, "data", "research", "candidates", "pool.json");

function printHelp() {
  console.log(`MKA Evidence Engine V0.7

Kullanım:
  node tools/historical-research/cli.mjs <komut> [seçenekler]

Komutlar:
  gap-report [--from YYYY] [--to YYYY] [--format md|json] [--out DOSYA]
      Arşiv boşluk analizi üretir. Kayıt yokluğu, olay yokluğu anlamına gelmez.
  pool-status [--format md|json|csv] [--out DOSYA]
      Aday havuzu durumlarını, künye/hak/insan incelemesi bayraklarını listeler.
  dry-run [--id src-YYYY-NNNN | --all]
      Adayları ArchiveRecord v1.1.0 TASLAĞINA dönüştürür. Yayın üretmez;
      katalog dosyalarına yazmaz. Engellenenler gerekçesiyle raporlanır.
  claims
      İddia-kanıt ağı özetini yazar.
  verify-url URL
      Tek bir URL'nin yapısal güvenlik denetimini yapar (ağ getirmesi yok).`);
}

function parseArgs(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    } else {
      options._.push(arg);
    }
  }
  return options;
}

async function cmdGapReport(options) {
  const archive = await loadArchive(REPO_ROOT);
  if (archive.errors.length > 0) {
    console.error("Arşiv yüklenemedi:", archive.errors.join("; "));
    return 1;
  }
  const report = analyzeGaps(archive.records, {
    targetStart: options.from ? Number(options.from) : 1881,
    targetEnd: options.to ? Number(options.to) : 1918,
  });
  const format = options.format ?? "md";
  if (options.out) {
    const target = path.resolve(REPO_ROOT, options.out);
    await writeReport(target, format === "json" ? JSON.stringify(report, null, 2) : gapReportToMarkdown(report));
    console.log(`Rapor yazıldı: ${options.out}`);
  } else if (format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(gapReportToMarkdown(report));
  }
  return 0;
}

async function cmdPoolStatus(options) {
  let pool;
  try {
    pool = await loadPool(POOL_PATH);
  } catch {
    console.error(`Aday havuzu bulunamadı: ${POOL_PATH}`);
    return 1;
  }
  const summary = poolSummary(pool.candidates);
  const format = options.format ?? "md";
  if (options.out) {
    const target = path.resolve(REPO_ROOT, options.out);
    const content =
      format === "csv" ? poolToCsv(pool.candidates)
      : format === "json" ? JSON.stringify({ summary, candidates: pool.candidates }, null, 2)
      : poolToMarkdown(pool.candidates, summary);
    await writeReport(target, content);
    console.log(`Rapor yazıldı: ${options.out}`);
    return 0;
  }
  if (format === "json") {
    console.log(JSON.stringify({ summary, candidates: pool.candidates }, null, 2));
  } else if (format === "csv") {
    process.stdout.write(poolToCsv(pool.candidates));
  } else {
    console.log(poolToMarkdown(pool.candidates, summary));
  }
  return 0;
}

async function cmdDryRun(options) {
  const archive = await loadArchive(REPO_ROOT);
  let pool;
  try {
    pool = await loadPool(POOL_PATH);
  } catch {
    console.error(`Aday havuzu bulunamadı: ${POOL_PATH}`);
    return 1;
  }
  const selected = options.all
    ? pool.candidates
    : pool.candidates.filter((candidate) => candidate.id === options.id);
  if (selected.length === 0) {
    console.error("Eşleşen aday yok. --id src-YYYY-NNNN veya --all kullanın.");
    return 1;
  }
  const { convertAndValidate } = await import("./lib/convert-dryrun.mjs");
  const archiveContext = {
    taxonomy: archive.taxonomy,
    recordSchema: archive.recordSchema,
    taxonomySchema: archive.taxonomySchema,
    root: REPO_ROOT,
  };
  let ok = 0;
  let blocked = 0;
  let invalid = 0;
  for (const candidate of selected) {
    // Yürütme yolu: dönüşüm + GERÇEK arşiv doğrulayıcısı (validateArchive)
    const result = await convertAndValidate(candidate, archive.records, archiveContext);
    if (result.outcome === "ok") ok += 1;
    else if (result.outcome === "blocked") blocked += 1;
    else invalid += 1;
    console.log(`[${result.outcome.toUpperCase()}] ${candidate.id} — ${candidate.title}`);
    for (const blocker of result.blockers) {
      console.log(`  ENGEL ${blocker.code}: ${blocker.message}`);
    }
    if (result.record) {
      console.log("  TASLAK üretildi (draft; yayımlanamaz). Kayıt kimliği:", result.record.id);
    }
  }
  console.log(`\nÖzet: ${ok} hazır taslak, ${blocked} engellendi, ${invalid} geçersiz.`);
  console.log("Not: 'ok' yalnızca taslak üretimi anlamına gelir; yayınlama kararı insan incelemesiyle verilir.");
  return 0;
}

async function cmdClaims() {
  const claimsPath = path.join(REPO_ROOT, "data", "research", "candidates", "claims.json");
  let claims;
  try {
    const raw = await fs.readFile(claimsPath, "utf8");
    claims = JSON.parse(raw).claims ?? [];
  } catch {
    console.error(`İddia dosyası bulunamadı: ${claimsPath}`);
    return 1;
  }
  let pool;
  try {
    pool = await loadPool(POOL_PATH);
  } catch {
    pool = { candidates: [] };
  }
  const { evaluateClaim } = await import("./lib/provenance.mjs");
  const { findDateConflicts } = await import("./lib/provenance.mjs");
  const conflicts = findDateConflicts(claims);
  console.log(`İddia sayısı: ${claims.length}`);
  for (const claim of claims) {
    const evaluation = evaluateClaim(claim, pool.candidates);
    console.log(`- ${claim.id} [${evaluation.status}] bağımsız kanıt: ${evaluation.independentInstitutions}`);
  }
  if (conflicts.length > 0) {
    console.log("\nTarih çelişkileri:");
    for (const conflict of conflicts) console.log(`- ${conflict.claimA} ↔ ${conflict.claimB}: ${conflict.note}`);
  }
  return 0;
}

async function cmdVerifyUrl(rawUrl) {
  const result = validateExternalUrl(rawUrl);
  if (result.ok) {
    console.log("URL yapısal olarak güvenli (ağ denetimi yapılmadı).");
    return 0;
  }
  console.error("URL reddedildi:");
  for (const error of result.errors) console.error(`- ${error.code}: ${error.message}`);
  return 1;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    return 0;
  }
  const command = argv[0];
  const options = parseArgs(argv.slice(1));
  switch (command) {
    case "gap-report": return cmdGapReport(options);
    case "pool-status": return cmdPoolStatus(options);
    case "dry-run": return cmdDryRun(options);
    case "claims": return cmdClaims();
    case "verify-url": return cmdVerifyUrl(options._[0] ?? "");
    default:
      console.error(`Bilinmeyen komut: ${command}`);
      printHelp();
      return 1;
  }
}

main().then((code) => process.exit(code)).catch((error) => {
  console.error(error);
  process.exit(1);
});
