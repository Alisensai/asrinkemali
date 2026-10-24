import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { checkSourceLinks } from "../src/link-check.mjs";
import {
  buildCatalogReport,
  evaluateCheck,
  renderCandidatesMarkdown,
  renderCatalogQualityMarkdown,
  renderHistoryMarkdown,
  renderInventoryMarkdown,
  renderLinkCheckMarkdown,
  renderReportsIndex,
  writeReports,
} from "../src/report.mjs";
import { REPO_ROOT } from "../src/archive-context.mjs";
import { stableStringify } from "../src/util.mjs";
import { makeContext, makeRecord } from "./fixtures.mjs";

const CONFIG = JSON.parse(await fs.readFile(new URL("../data/coverage-periods.json", import.meta.url), "utf8"));

function records() {
  return [
    makeRecord({
      id: "direct",
      title: "Çanakkale Cephesi'nde Mustafa Kemal",
      type: "event",
      date: { start: "1915-04-25", end: null, precision: "day", certainty: "exact" },
      source: {
        institution: "Türkiye Büyük Millet Meclisi",
        institutionType: "official",
        url: "https://www.tbmm.gov.tr/direct",
        archiveIdentifier: "TBMM-D1",
        citation: "TBMM, \"Çanakkale\", erişim 23.10.2026, https://www.tbmm.gov.tr/direct.",
      },
      provenance: [
        {
          institution: "Türkiye Büyük Millet Meclisi",
          collection: "Test",
          identifier: "TBMM-D1",
          url: "https://www.tbmm.gov.tr/direct",
          accessedAt: "2026-10-23",
          note: "Test.",
        },
      ],
    }),
    makeRecord({
      id: "place",
      title: "Şişli Atatürk Evi",
      type: "place",
      date: { start: "1918-01-01", end: null, precision: "year", certainty: "exact" },
      summary: "Atatürk'ün ikamet ettiği ev.",
      source: {
        institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
        institutionType: "institutional",
        url: "https://www.ataturkansiklopedisi.gov.tr/place",
        archiveIdentifier: "AYK-501",
        citation: "Atatürk Ansiklopedisi, \"Şişli\", erişim 23.10.2026, https://www.ataturkansiklopedisi.gov.tr/place.",
      },
      provenance: [
        {
          institution: "Atatürk Ansiklopedisi",
          collection: "Test",
          identifier: "AYK-501",
          url: "https://www.ataturkansiklopedisi.gov.tr/place",
          accessedAt: "2026-10-23",
          note: "Test.",
        },
      ],
    }),
    makeRecord({
      id: "context",
      title: "Tanin Gazetesi",
      type: "publication",
      date: { start: "1908-08-01", end: null, precision: "day", certainty: "exact" },
      people: [{ name: "Tevfik Fikret", role: "author" }],
      summary: "1908'de yayımlanmaya başlayan gazete.",
      source: {
        institution: "Atatürk Araştırma Merkezi Yayınları",
        institutionType: "institutional",
        url: "https://www.atam.gov.tr/context",
        archiveIdentifier: "ATAM-1",
        citation: "ATAM, \"Tanin\", erişim 23.10.2026, https://www.atam.gov.tr/context.",
      },
      provenance: [
        {
          institution: "Atatürk Araştırma Merkezi",
          collection: "Test",
          identifier: "ATAM-1",
          url: "https://www.atam.gov.tr/context",
          accessedAt: "2026-10-23",
          note: "Test.",
        },
      ],
    }),
  ];
}

function sourceHistory() {
  return {
    schemaVersion: "1.0.0",
    updatedAt: "2026-10-23",
    sources: [
      {
        recordId: "direct",
        institution: "Türkiye Büyük Millet Meclisi",
        originalUrl: "https://www.tbmm.gov.tr/eski-direct",
        currentUrl: "https://www.tbmm.gov.tr/direct",
        changes: [
          {
            changedAt: "2026-10-23",
            from: "https://www.tbmm.gov.tr/eski-direct",
            to: "https://www.tbmm.gov.tr/direct",
            reason: "Kaynak taşındı.",
            evidence: "Yeni URL doğrulandı.",
            author: "Test",
          },
        ],
        lastSeenAt: "2026-10-23",
      },
      {
        recordId: "place",
        institution: "Atatürk Ansiklopedisi",
        originalUrl: "https://www.ataturkansiklopedisi.gov.tr/place",
        currentUrl: "https://www.ataturkansiklopedisi.gov.tr/place",
        changes: [],
        lastSeenAt: "2026-10-23",
      },
    ],
  };
}

function candidateFile() {
  return {
    schemaVersion: "1.0.0",
    discoveredAt: "2026-10-23",
    ingestPolicy: "manual_expert_verification_required",
    candidates: [
      {
        id: "candidate-999",
        sourceId: "AYK-999",
        institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
        institutionType: "institutional",
        title: "Erken Subaylık Adayı",
        url: "https://www.ataturkansiklopedisi.gov.tr/detay/999/aday",
        gapPhases: ["early-officer"],
        coverageType: "dedicated",
        priority: "medium",
        status: "unverified",
        ingest: false,
      },
    ],
  };
}

async function buildReport() {
  const context = makeContext(records());
  const linkCheck = await checkSourceLinks(context.records, { online: false });
  return buildCatalogReport({
    context,
    coverageConfig: CONFIG,
    classificationOverrides: { overrides: {} },
    sourceHistory: sourceHistory(),
    candidateFile: candidateFile(),
    linkCheck,
    generatedAt: "2026-10-23T00:00:00.000Z",
  });
}

test("katalog raporu tüm denetim bölümlerini ve deterministik özetleri üretir", async () => {
  const report = await buildReport();
  assert.equal(report.schemaVersion, "1.0.0");
  assert.equal(report.tool.readOnlyArchive, true);
  assert.equal(report.generatedAt, "2026-10-23T00:00:00.000Z");
  assert.equal(report.archiveSummary.records, 3);
  assert.equal(report.inventory.summary.records, 3);
  assert.equal(report.inventory.summary.recordsWithSourceUrl, 3);
  assert.equal(report.classification.summary.total, 3);
  assert.equal(report.coverage.summary.totalRecords, 3);
  assert.equal(report.coverage.summary.directBiographicalRecords, 1);
  assert.equal(report.candidates.summary.eligibleCandidates, 1);
  assert.equal(report.candidates.candidates[0].ingest, false);
  assert.equal(report.sourceHistory.summary.trackedRecords, 2);
  assert.equal(report.sourceHistory.summary.untrackedRecords, 1);
  assert.equal(report.sourceHistory.summary.changedSourceRecords, 1);
  assert.equal(report.sourceHistory.summary.driftRecords, 0);
  assert.equal(report.linkCheck.mode, "not_run");
  assert.ok(report.quality.components.length >= 6);
  assert.ok(Array.isArray(report.quality.findings));
  assert.ok(report.reproduction.offline.includes("--write"));
  assert.ok(report.limitations.length >= 5);
});

test("aynı girdi ve generatedAt deterministik JSON üretir", async () => {
  const first = await buildReport();
  const second = await buildReport();
  assert.equal(stableStringify(first), stableStringify(second));
});

test("değerlendirme kritik arıza yoksa geçer, insan onayı uyarısı üretir", async () => {
  const report = await buildReport();
  const result = evaluateCheck(report);
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.equal(result.failures.length, 0);
  assert.ok(result.warnings.some((warning) => warning.id === "human-review-missing"));
  assert.ok(result.warnings.some((warning) => warning.id === "unverified-candidates"));
  assert.ok(report.coverage.gaps.some((gap) => gap.id === "missing-direct-types"));
});

test("markdown çıktıları ana rapor bölümlerini ve güvenlik notlarını içerir", async () => {
  const report = await buildReport();
  const quality = renderCatalogQualityMarkdown(report);
  assert.match(quality, /Katalog Kalite Raporu/);
  assert.match(quality, /Kaynak envanteri/);
  assert.match(quality, /Paylaşılan kaynak/);
  assert.match(quality, /1881-1918/);
  assert.match(quality, /doğrudan biyografik/i);
  assert.match(quality, /salt okunur/i);

  const inventory = renderInventoryMarkdown(report.inventory);
  assert.match(inventory, /Kaynak URL Envanteri/);
  const history = renderHistoryMarkdown(report.sourceHistory);
  assert.match(history, /Kaynak URL Geçmişi/);
  assert.match(history, /eski-direct/);
  const candidates = renderCandidatesMarkdown(report.candidates);
  assert.match(candidates, /Erken Dönem Kaynak Adayları/);
  assert.match(candidates, /ingest=false/);
  const links = renderLinkCheckMarkdown(report.linkCheck);
  assert.match(links, /çevrimdışı/i);
  const index = renderReportsIndex(report);
  assert.match(index, /catalog-quality\.md/);
  assert.match(index, /early-period-candidates\.md/);
});

test("rapor yazımı yalnızca güvenli çıktı dizinine yazar", async () => {
  const report = await buildReport();
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-kemali-v07-report-"));
  try {
    const written = await writeReports(report, outDir, { repoRoot: REPO_ROOT });
    assert.equal(written.files.length, 16);
    assert.equal(written.outDir, path.resolve(outDir));
    const names = written.files.map((file) => file.file).sort();
    assert.ok(names.includes("catalog-quality.json"));
    assert.ok(names.includes("catalog-quality.md"));
    assert.ok(names.includes("source-inventory.json"));
    assert.ok(names.includes("early-period-candidates.json"));
    assert.ok(names.includes("link-check.json"));
    assert.ok(names.includes("README.md"));
    const json = JSON.parse(await fs.readFile(path.join(outDir, "catalog-quality.json"), "utf8"));
    assert.equal(json.archiveSummary.records, 3);
    const readme = await fs.readFile(path.join(outDir, "README.md"), "utf8");
    assert.match(readme, /Raporlar/);
  } finally {
    await fs.rm(outDir, { recursive: true, force: true });
  }
});

test("arşiv ve git dizinlerine rapor yazımı reddedilir", async () => {
  const report = await buildReport();
  const forbidden = [
    path.join(REPO_ROOT, "data", "archive", "catalog"),
    path.join(REPO_ROOT, "content", "archive", "records"),
    path.join(REPO_ROOT, ".git", "reports"),
  ];
  for (const outDir of forbidden) {
    await assert.rejects(
      () => writeReports(report, outDir, { repoRoot: REPO_ROOT }),
      /Güvenlik: rapor çıktısı/
    );
  }
});
