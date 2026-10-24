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

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Görev 07: --root ile test fikstürü kökü verilebilir; varsayılan depo köküdür.
let REPO_ROOT = DEFAULT_ROOT;
let POOL_PATH = path.join(REPO_ROOT, "data", "research", "candidates", "pool.json");
const EXIT = Object.freeze({ OK: 0, GATE: 1, USAGE: 2, POLICY: 3 });
const POLICY_ERROR_CODES = new Set(["OUTPUT_DIR_NOT_ALLOWED", "PROTECTED_PATH", "SYMLINK_TARGET", "UNC_PATH_FORBIDDEN", "INVALID_OUTPUT_PATH"]);

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
      Tek bir URL'nin yapısal güvenlik denetimini yapar (ağ getirmesi yok).
  evidence-report [--generated-at ISO] [--from YYYY] [--to YYYY] [--format json|md|csv] [--out DOSYA]
      Girdi hash'li, belirlenimci entegrasyon raporu (salt-okunur; ağ yok).
  integrity
      Arşiv, formlar, yayınlar ve aday dosyalarının SHA-256 anlık görüntüsü.
  validate [--strict]
      Aday havuzunu alan bazlı doğrular; --strict ile bulgu varsa çıkış 1.

Ortak: --root DİZİN (test fikstürü), --help.
Çıkış: 0 başarı · 1 doğrulama/beklenen kapı · 2 kullanım hatası · 3 politika ihlali (ör. izinsiz --out).
--out yalnız data/research/candidates/exports, docs/research/evidence-integration/reports,
tools/historical-research/reports veya geçici dizine yazar.`);
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
  const targetStart = options.from ? Number(options.from) : 1881;
  const targetEnd = options.to ? Number(options.to) : 1918;
  if (!Number.isInteger(targetStart) || !Number.isInteger(targetEnd) || targetStart > targetEnd) {
    console.error("--from/--to tam sayı yıl olmalı ve from ≤ to.");
    return EXIT.USAGE;
  }
  const report = analyzeGaps(archive.records, { targetStart, targetEnd });
  const format = options.format ?? "md";
  if (options.out) {
    const target = path.resolve(REPO_ROOT, options.out);
    await writeReport(target, format === "json" ? JSON.stringify(report, null, 2) : gapReportToMarkdown(report), { root: REPO_ROOT });
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
    await writeReport(target, content, { root: REPO_ROOT });
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
  const { assessClaimEvidence } = await import("./lib/integration/evidence-assessment.mjs");
  for (const claim of claims) {
    const evaluation = evaluateClaim(claim, pool.candidates);
    const assessment = assessClaimEvidence(claim, pool.candidates);
    console.log(`- ${claim.id} [#19: ${evaluation.status}] [Görev 07: ${assessment.status}] pasajlı destek: ${assessment.counts.supportsWithPassage}, yalnız künye: ${assessment.counts.supportsMetadataOnly}, bağımsız pasaj kökü: ${assessment.counts.independentPassageRoots}, insan doğrulaması: yok`);
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

function isIsoWithZone(value) {
  return typeof value === "string" && /(Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
}

async function cmdEvidenceReport(options) {
  const { buildResearchSnapshot, snapshotToMarkdown, stableStringify, workListToCsv } = await import("./lib/integration/research-report.mjs");
  const generatedAt = options["generated-at"] ?? new Date().toISOString();
  if (!isIsoWithZone(generatedAt)) {
    console.error("--generated-at saat dilimli ISO 8601 olmalı.");
    return EXIT.USAGE;
  }
  const from = options.from ? Number(options.from) : 1881;
  const to = options.to ? Number(options.to) : 1918;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    console.error("--from/--to tam sayı yıl olmalı ve from ≤ to.");
    return EXIT.USAGE;
  }
  const format = options.format ?? "json";
  if (!["json", "md", "csv"].includes(format)) {
    console.error("--format json|md|csv olmalı.");
    return EXIT.USAGE;
  }
  const report = await buildResearchSnapshot(REPO_ROOT, { generatedAt, from, to });
  const content = format === "csv" ? workListToCsv(report) : format === "md" ? snapshotToMarkdown(report) : stableStringify(report);
  if (options.out) {
    await writeReport(path.resolve(REPO_ROOT, String(options.out)), content, { root: REPO_ROOT });
    console.log(`Rapor yazıldı: ${options.out}`);
  } else {
    process.stdout.write(content);
  }
  return report.blockers.length > 0 ? EXIT.GATE : EXIT.OK;
}

async function cmdIntegrity() {
  const { integritySnapshot } = await import("./lib/integration/archive-context.mjs");
  console.log(JSON.stringify(integritySnapshot(REPO_ROOT), null, 2));
  return EXIT.OK;
}

async function cmdValidate(options) {
  let pool;
  try {
    pool = await loadPool(POOL_PATH);
  } catch {
    console.error("Aday havuzu okunamadı.");
    return EXIT.GATE;
  }
  const { candidateIssues } = await import("./lib/integration/candidate-contract.mjs");
  const issues = pool.candidates.flatMap((candidate) => candidateIssues(candidate));
  console.log(JSON.stringify({ candidates: pool.candidates.length, issues }, null, 2));
  return options.strict && issues.length > 0 ? EXIT.GATE : EXIT.OK;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    return 0;
  }
  const command = argv[0];
  const options = parseArgs(argv.slice(1));
  if (options.help) {
    printHelp();
    return EXIT.OK;
  }
  if (options.root !== undefined) {
    if (typeof options.root !== "string") {
      console.error("--root bir dizin ister.");
      return EXIT.USAGE;
    }
    REPO_ROOT = path.resolve(options.root);
    POOL_PATH = path.join(REPO_ROOT, "data", "research", "candidates", "pool.json");
  }
  switch (command) {
    case "gap-report": return cmdGapReport(options);
    case "pool-status": return cmdPoolStatus(options);
    case "dry-run": return cmdDryRun(options);
    case "claims": return cmdClaims();
    case "verify-url": return cmdVerifyUrl(options._[0] ?? "");
    case "evidence-report": return cmdEvidenceReport(options);
    case "integrity": return cmdIntegrity();
    case "validate": return cmdValidate(options);
    default:
      console.error(`Bilinmeyen komut: ${command}`);
      printHelp();
      return EXIT.USAGE;
  }
}

main().then((code) => process.exit(code)).catch((error) => {
  // Yığın izi yerel yol sızdırabilir; yalnız kod/mesaj (MKA_DEBUG=1 ile tam hata).
  if (process.env.MKA_DEBUG === "1") console.error(error);
  else console.error(`Hata: ${error?.code ?? "UNEXPECTED"} — ${error?.message ?? "beklenmeyen hata"}`);
  const policy = POLICY_ERROR_CODES.has(error?.code) || /Korumalı/.test(String(error?.message ?? ""));
  process.exit(policy ? EXIT.POLICY : 1);
});
