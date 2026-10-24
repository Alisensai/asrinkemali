#!/usr/bin/env node
/**
 * Komut satırı arayüzü.
 *
 * Varsayılan davranış: gerçek arşivi salt okunur yükler, çevrimdışı rapor
 * üretir ve hiçbir arşiv dosyasına yazmaz. Rapor yazmak için `--write`,
 * çevrimiçi bağlantı denetimi için `--online` gerekir.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PATHS,
  REPO_ROOT,
  loadArchiveContext,
  loadCandidateFile,
  loadClassificationOverrides,
  loadCoverageConfig,
  loadSourceHistory,
} from "./archive-context.mjs";
import { acceptHistoryChanges, reconcileSourceHistory, seedSourceHistory } from "./history.mjs";
import { buildSourceInventory } from "./inventory.mjs";
import { assertSafeOutputDir, writeJson, writeText } from "./io.mjs";
import { checkSourceLinks } from "./link-check.mjs";
import { buildCandidateReport, refreshCandidateMetadata } from "./candidates.mjs";
import { analyzeEarlyPeriodCoverage } from "./coverage.mjs";
import {
  buildCatalogReport,
  evaluateCheck,
  renderCandidatesMarkdown,
  renderCatalogQualityMarkdown,
  renderHistoryMarkdown,
  renderInventoryMarkdown,
  renderLinkCheckMarkdown,
  writeReports,
} from "./report.mjs";
import { stableStringify } from "./util.mjs";

const USAGE = `Kullanım:
  node src/cli.mjs [komut] [seçenekler]

Komutlar:
  report       Tam katalog kalite raporu (varsayılan)
  inventory    Yalnızca kaynak URL envanteri
  history      Kaynak URL geçmişi defteri
  candidates   Erken dönem kaynak adayları
  links        Bağlantı denetimi (çevrimiçi)
  check        Kritik kontroller; hata varsa çıkış kodu 1

Seçenekler:
  --root <dizin>                  Arşiv kökü (varsayılan: depo kökü)
  --out <dizin>                   Rapor çıktı dizini (varsayılan: tools/archive-source-reliability/reports)
  --write                         Raporları/veri dosyalarını yaz
  --online                        Çevrimiçi bağlantı denetimi
  --concurrency <n>               Eşzamanlı bağlantı denetimi (varsayılan: 1)
  --timeout <ms>                  Bağlantı zaman aşımı (varsayılan: 15000)
  --generated-at <ISO|YYYY-MM-DD> Rapor zamanı (deterministik çıktı için)
  --candidate-file <dosya>        Aday dosyası
  --history-file <dosya>          Kaynak geçmişi defteri
  --classification-overrides <dosya>
  --coverage-config <dosya>
  --seed-history                  Eksik kayıtları geçmiş defterine ekle
  --accept-history                Sapan URL'leri deftere kabul et
  --refresh-candidates            AYK API'den aday metadata'sını yenile
  --json                          JSON çıktısı
  --markdown                      Markdown çıktısı
  --help                          Bu yardım

Güvenlik:
  Rapor çıktısı data/archive veya content/archive altına yazılamaz.
  Adaylar status=unverified ve ingest=false olarak kalır; otomatik arşivleme yoktur.
`;

function parseArgs(argv) {
  const args = [...argv];
  const command = args[0] && !args[0].startsWith("--") ? args.shift() : "report";
  const options = {
    command,
    root: REPO_ROOT,
    out: DEFAULT_PATHS.reportsDir,
    write: false,
    online: false,
    concurrency: 1,
    timeout: 15_000,
    generatedAt: new Date().toISOString(),
    candidateFile: DEFAULT_PATHS.candidateFile,
    historyFile: DEFAULT_PATHS.sourceHistory,
    classificationOverrides: DEFAULT_PATHS.classificationOverrides,
    coverageConfig: DEFAULT_PATHS.coverageConfig,
    seedHistory: false,
    acceptHistory: false,
    refreshCandidates: false,
    json: false,
    markdown: false,
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = () => {
      index += 1;
      if (index >= args.length) throw new Error(`${arg} için değer gerekli.`);
      return args[index];
    };
    switch (arg) {
      case "--root":
        options.root = path.resolve(next());
        break;
      case "--out":
        options.out = path.resolve(next());
        break;
      case "--write":
        options.write = true;
        break;
      case "--online":
        options.online = true;
        break;
      case "--concurrency":
        options.concurrency = Math.max(1, Number.parseInt(next(), 10) || 1);
        break;
      case "--timeout":
        options.timeout = Math.max(1000, Number.parseInt(next(), 10) || 15_000);
        break;
      case "--generated-at": {
        const value = next();
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) throw new Error(`Geçersiz --generated-at: ${value}`);
        options.generatedAt = date.toISOString();
        break;
      }
      case "--candidate-file":
        options.candidateFile = path.resolve(next());
        break;
      case "--history-file":
        options.historyFile = path.resolve(next());
        break;
      case "--classification-overrides":
        options.classificationOverrides = path.resolve(next());
        break;
      case "--coverage-config":
        options.coverageConfig = path.resolve(next());
        break;
      case "--seed-history":
        options.seedHistory = true;
        break;
      case "--accept-history":
        options.acceptHistory = true;
        break;
      case "--refresh-candidates":
        options.refreshCandidates = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--markdown":
        options.markdown = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Bilinmeyen seçenek: ${arg}`);
    }
  }
  if (options.command === "links") options.online = true;
  if (options.command === "check") options.check = true;
  return options;
}

function printSummary(report, written) {
  const quality = report.quality;
  console.log(`Arşiv: ${report.archiveSummary.records} kayıt, ${report.archiveSummary.files} dosya`);
  console.log(`Kalite: ${quality.score === null ? "ölçülemedi" : `${quality.score}/100`} (${quality.level})`);
  console.log(`Kaynak URL: ${report.inventory.summary.recordsWithSourceUrl}/${report.inventory.summary.records}, benzersiz ${report.inventory.summary.uniqueSourceUrls}`);
  console.log(`Birincil kaynak payı: ${(report.classification.summary.primaryShare * 100).toFixed(1)}%`);
  console.log(`İnsan uzman onayı: ${report.humanReview.summary.humanApproved}/${report.humanReview.summary.totalRecords}`);
  console.log(`Hak doğrulanmamış görsel: ${report.imageRights.summary.flaggedImages}`);
  console.log(`Paylaşılan kaynak grubu: ${report.duplicateSources.summary.groupCount}`);
  console.log(`1881-1918 doğrudan biyografik: ${report.coverage.summary.directBiographicalRecords}`);
  console.log(`Doğrulanmamış aday: ${report.candidates.summary.eligibleCandidates}`);
  if (report.linkCheck.mode === "online") {
    console.log(`Bağlantı: ${report.linkCheck.summary.checked} URL, ${report.linkCheck.summary.broken} kırık, ${report.linkCheck.summary.redirected} yönlendirme`);
  } else {
    console.log("Bağlantı: çevrimdışı (ölçülmedi)");
  }
  if (quality.findings.length > 0) {
    console.log("Öne çıkan bulgular:");
    for (const finding of quality.findings.slice(0, 8)) {
      console.log(`  - [${finding.severity}] ${finding.title}`);
    }
  }
  if (written) {
    console.log(`Raporlar yazıldı: ${written.outDir}`);
    console.log(`Dosya sayısı: ${written.files.length}`);
  }
}

async function loadInputs(options) {
  const context = await loadArchiveContext({ root: options.root });
  const [coverageConfig, classificationOverrides, sourceHistory, candidateFile] = await Promise.all([
    loadCoverageConfig(options.coverageConfig),
    loadClassificationOverrides(options.classificationOverrides),
    loadSourceHistory(options.historyFile),
    loadCandidateFile(options.candidateFile),
  ]);
  return { context, coverageConfig, classificationOverrides, sourceHistory, candidateFile };
}

async function runReport(options, { checkOnly = false } = {}) {
  const inputs = await loadInputs(options);
  const candidateUrls = (inputs.candidateFile?.candidates ?? []).map((candidate) => ({
    id: candidate.id,
    sourceId: candidate.sourceId,
    title: candidate.title,
    url: candidate.url,
    institution: candidate.institution,
  }));
  const linkCheck = await checkSourceLinks(inputs.context.records, {
    online: options.online,
    concurrency: options.concurrency,
    timeoutMs: options.timeout,
    candidateUrls,
    checkedAt: options.generatedAt,
  });
  const report = buildCatalogReport({
    ...inputs,
    linkCheck,
    generatedAt: options.generatedAt,
  });
  const written = options.write ? await writeReports(report, options.out, { repoRoot: inputs.context.root }) : null;
  if (options.json) {
    console.log(stableStringify(report));
  } else if (options.markdown) {
    console.log(renderCatalogQualityMarkdown(report));
  } else {
    printSummary(report, written);
  }
  if (checkOnly || options.check) {
    const result = evaluateCheck(report);
    console.log(`Kontrol: ${result.status.toUpperCase()}`);
    for (const failure of result.failures) console.log(`  - [kritik] ${failure.title}: ${failure.detail}`);
    for (const warning of result.warnings.slice(0, 12)) console.log(`  - [uyarı] ${warning.title}`);
    if (!result.ok) process.exitCode = 1;
  }
  return report;
}

async function runInventory(options) {
  const inputs = await loadInputs(options);
  const historyIndex = new Map((inputs.sourceHistory?.sources ?? []).map((entry) => [entry.recordId, entry]));
  const inventory = buildSourceInventory(inputs.context.records, { historyIndex });
  if (options.write) {
    const outDir = assertSafeOutputDir(options.out, inputs.context.root);
    await writeText(path.join(outDir, "source-inventory.md"), renderInventoryMarkdown(inventory));
    await writeText(path.join(outDir, "source-inventory.json"), stableStringify(inventory));
    console.log(`Envanter yazıldı: ${outDir}`);
  }
  if (options.json) console.log(stableStringify(inventory));
  else if (options.markdown) console.log(renderInventoryMarkdown(inventory));
  else {
    console.log(`Kayıt: ${inventory.summary.records}`);
    console.log(`Kaynak URL'si olan: ${inventory.summary.recordsWithSourceUrl}`);
    console.log(`Benzersiz kaynak URL'si: ${inventory.summary.uniqueSourceUrls}`);
    console.log(`Benzersiz tüm URL'ler: ${inventory.summary.uniqueAllUrls}`);
  }
}

async function runHistory(options) {
  const inputs = await loadInputs(options);
  const changedAt = options.generatedAt.slice(0, 10);
  let sourceHistory = inputs.sourceHistory;
  let reconciliation = reconcileSourceHistory(inputs.context.records, sourceHistory, { changedAt });
  let action = null;
  if (options.seedHistory) {
    action = seedSourceHistory(sourceHistory, inputs.context.records, { changedAt });
    sourceHistory = action.history;
    reconciliation = reconcileSourceHistory(inputs.context.records, sourceHistory, { changedAt });
  }
  if (options.acceptHistory) {
    action = acceptHistoryChanges(sourceHistory, reconciliation, { changedAt });
    sourceHistory = action.history;
    reconciliation = reconcileSourceHistory(inputs.context.records, sourceHistory, { changedAt });
  }
  if (options.write) {
    assertSafeOutputDir(path.dirname(options.historyFile), inputs.context.root);
    await writeJson(options.historyFile, sourceHistory);
    console.log(`Kaynak geçmişi defteri yazıldı: ${options.historyFile}`);
    if (action) console.log(JSON.stringify(action, null, 2));
  }
  if (options.json) console.log(stableStringify(reconciliation));
  else if (options.markdown) console.log(renderHistoryMarkdown(reconciliation));
  else {
    console.log(`İzlenen: ${reconciliation.summary.trackedRecords}`);
    console.log(`İzlenmeyen: ${reconciliation.summary.untrackedRecords}`);
    console.log(`Sapma: ${reconciliation.summary.driftRecords}`);
    console.log(`Kabul edilmiş değişiklik: ${reconciliation.summary.totalAcceptedChanges}`);
    for (const row of reconciliation.changedSources) {
      console.log(`  - ${row.recordId}: ${row.originalUrl} -> ${row.currentUrl}`);
    }
    for (const row of reconciliation.drift) {
      console.log(`  - SAPMA ${row.recordId}: ${row.ledgerCurrentUrl} -> ${row.currentUrl}`);
    }
  }
}

async function runCandidates(options) {
  const inputs = await loadInputs(options);
  let candidateFile = inputs.candidateFile;
  if (options.refreshCandidates) {
    const refreshed = await refreshCandidateMetadata(candidateFile.candidates, { checkedAt: options.generatedAt.slice(0, 10) });
    candidateFile = { ...candidateFile, candidates: refreshed.candidates, metadataRefreshedAt: refreshed.checkedAt };
    if (options.write) {
      assertSafeOutputDir(path.dirname(options.candidateFile), inputs.context.root);
      await writeJson(options.candidateFile, candidateFile);
      console.log(`Aday dosyası yenilendi: ${options.candidateFile} (${refreshed.refreshed} başarılı, ${refreshed.failed.length} hata)`);
    }
  }
  const coverage = analyzeEarlyPeriodCoverage(
    inputs.context.records,
    inputs.coverageConfig,
    { candidateSeeds: candidateFile.candidates }
  );
  const linkCheck = options.online
    ? await checkSourceLinks([], {
        online: true,
        concurrency: options.concurrency,
        timeoutMs: options.timeout,
        candidateUrls: candidateFile.candidates.map((candidate) => ({
          id: candidate.id,
          sourceId: candidate.sourceId,
          title: candidate.title,
          url: candidate.url,
          institution: candidate.institution,
        })),
        checkedAt: options.generatedAt,
      })
    : null;
  const candidateReport = buildCandidateReport(candidateFile, inputs.context.records, coverage, { linkCheck });
  if (options.write) {
    const outDir = assertSafeOutputDir(options.out, inputs.context.root);
    await writeText(path.join(outDir, "early-period-candidates.md"), renderCandidatesMarkdown(candidateReport));
    await writeText(
      path.join(outDir, "early-period-candidates.json"),
      stableStringify(candidateReport)
    );
    console.log(`Aday raporu yazıldı: ${outDir}`);
  }
  if (options.json) console.log(stableStringify(candidateReport));
  else if (options.markdown) console.log(renderCandidatesMarkdown(candidateReport));
  else {
    console.log(`Aday: ${candidateReport.summary.eligibleCandidates}`);
    console.log(`Arşivde olduğu için çıkarılan: ${candidateReport.summary.filteredAlreadyInArchive}`);
    console.log(`Politika ihlali: ${candidateReport.summary.policyViolations}`);
    for (const candidate of candidateReport.candidates) {
      console.log(`  - [${candidate.priority}] ${candidate.sourceId} ${candidate.title} (${candidate.status}, ingest=${candidate.ingest})`);
    }
  }
}

async function runLinks(options) {
  const inputs = await loadInputs(options);
  const linkCheck = await checkSourceLinks(inputs.context.records, {
    online: true,
    concurrency: options.concurrency,
    timeoutMs: options.timeout,
    candidateUrls: (inputs.candidateFile?.candidates ?? []).map((candidate) => ({
      id: candidate.id,
      sourceId: candidate.sourceId,
      title: candidate.title,
      url: candidate.url,
      institution: candidate.institution,
    })),
    checkedAt: options.generatedAt,
  });
  if (options.write) {
    const outDir = assertSafeOutputDir(options.out, inputs.context.root);
    await writeText(path.join(outDir, "link-check.md"), renderLinkCheckMarkdown(linkCheck));
    await writeText(path.join(outDir, "link-check.json"), stableStringify(linkCheck));
    console.log(`Bağlantı raporu yazıldı: ${outDir}`);
  }
  if (options.json) console.log(stableStringify(linkCheck));
  else if (options.markdown) console.log(renderLinkCheckMarkdown(linkCheck));
  else {
    console.log(`Denetlenen: ${linkCheck.summary.checked}`);
    console.log(`Kırık: ${linkCheck.summary.broken}`);
    console.log(`Yönlendirme: ${linkCheck.summary.redirected}`);
    for (const row of linkCheck.broken) console.log(`  - KIRIK ${row.url}: ${row.error}`);
    for (const row of linkCheck.redirects) console.log(`  - YÖNLENDİRME ${row.url} -> ${row.finalUrl}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.command === "help") {
    console.log(USAGE);
    return;
  }
  switch (options.command) {
    case "report":
      await runReport(options);
      break;
    case "check":
      await runReport(options, { checkOnly: true });
      break;
    case "inventory":
      await runInventory(options);
      break;
    case "history":
      await runHistory(options);
      break;
    case "candidates":
      await runCandidates(options);
      break;
    case "links":
      await runLinks(options);
      break;
    default:
      throw new Error(`Bilinmeyen komut: ${options.command}`);
  }
}

main().catch((error) => {
  console.error(`Hata: ${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 3;
});
