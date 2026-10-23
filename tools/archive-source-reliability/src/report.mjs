/**
 * Katalog kalite raporu üretimi.
 *
 * Tüm modüller salt okunur arşiv bağlamından beslenir. Raporlar varsayılan
 * olarak yalnızca araç alanındaki `reports/` dizinine yazılır; arşiv kayıtları
 * ve `web/` dosyaları hiçbir zaman değiştirilmez.
 */

import path from "node:path";

import { buildSourceClassification } from "./classification.mjs";
import { buildCandidateReport } from "./candidates.mjs";
import { analyzeEarlyPeriodCoverage } from "./coverage.mjs";
import { auditDates } from "./date-audit.mjs";
import { detectSharedSources } from "./duplicates.mjs";
import { reconcileSourceHistory } from "./history.mjs";
import { auditHumanReview } from "./human-review.mjs";
import { buildSourceInventory } from "./inventory.mjs";
import { assertSafeOutputDir, writeText } from "./io.mjs";
import { auditImageRights } from "./rights.mjs";
import { auditSourceSufficiency } from "./sufficiency.mjs";
import {
  countBy,
  formatPercent,
  hashString,
  markdownTable,
  round,
  stableStringify,
  toSortedEntries,
} from "./util.mjs";

export const TOOL_NAME = "asrin-kemali-archive-source-reliability";
export const TOOL_VERSION = "1.0.0";
export const REPORT_SCHEMA_VERSION = "1.0.0";

const SEVERITY_RANK = { high: 0, medium: 1, low: 2, info: 3 };
const EMPTY_LINK_CHECK = Object.freeze({
  schemaVersion: "1.0.0",
  mode: "not_run",
  checkedAt: null,
  scope: "source_and_evidence_urls",
  policy: { network: "Varsayılan olarak ağ isteği yapılmaz." },
  summary: {
    checked: 0,
    ok: 0,
    redirected: 0,
    broken: 0,
    sourceChecked: 0,
    sourceOk: 0,
    sourceRedirected: 0,
    sourceBroken: 0,
    criticalBroken: 0,
    candidateChecked: 0,
    candidateBroken: 0,
    byRole: [],
  },
  results: [],
  redirects: [],
  broken: [],
  note: "Çevrimdışı mod: bağlantı durumu ölçülmedi.",
});

function archiveFingerprint(records) {
  const rows = records
    .map((record) => [
      record.id,
      record.title,
      record.type,
      record.date?.start ?? "",
      record.date?.end ?? "",
      record.date?.precision ?? "",
      record.date?.certainty ?? "",
      record.verification?.status ?? "",
      record.source?.institution ?? "",
      record.source?.archiveIdentifier ?? "",
      record.source?.url ?? "",
    ])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "tr"));
  return hashString(stableStringify(rows, 0)).slice(0, 20);
}

function buildArchiveSummary(context) {
  const records = context.records;
  const statusCounts = toSortedEntries(countBy(records, (record) => record.verification?.status ?? "(bilinmiyor)"));
  const typeCounts = toSortedEntries(countBy(records, (record) => record.type ?? "(bilinmiyor)"));
  const institutionCounts = [...countBy(records, (record) => record.source?.institution ?? "(bilinmiyor)").entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
    .map(([institution, count]) => {
      const institutionRecords = records.filter((record) => (record.source?.institution ?? "(bilinmiyor)") === institution);
      return {
        institution,
        count,
        statuses: toSortedEntries(countBy(institutionRecords, (record) => record.verification?.status ?? "(bilinmiyor)")),
        types: toSortedEntries(countBy(institutionRecords, (record) => record.type ?? "(bilinmiyor)")),
      };
    });
  const schemaVersions = toSortedEntries(countBy(records, (record) => record.schemaVersion ?? "(bilinmiyor)"));
  const starts = records.map((record) => record.date?.start).filter(Boolean).sort();
  return {
    records: records.length,
    files: context.fileCount,
    errors: context.errors.length,
    warnings: context.warnings.length,
    statuses: statusCounts,
    types: typeCounts,
    institutions: institutionCounts,
    schemaVersions,
    dateRange: {
      earliest: starts[0] ?? null,
      latest: starts.at(-1) ?? null,
    },
    sourceFingerprint: hashString(
      stableStringify(
        records
          .map((record) => record.source?.url ?? "")
          .filter(Boolean)
          .sort(),
        0
      )
    ).slice(0, 20),
  };
}

function component(key, label, value, weight, note) {
  return {
    key,
    label,
    value: value === null || value === undefined ? null : round(value, 4),
    weight,
    status: value === null || value === undefined ? "not_measured" : "measured",
    note,
  };
}

function computeQuality(parts) {
  const { archiveSummary, inventory, classification, duplicateSources, dateAudit, sourceSufficiency, imageRights, humanReview, coverage, sourceHistory, linkCheck, candidateReport } = parts;
  const total = archiveSummary.records || 0;
  const images = imageRights.summary.totalImages;
  const displayPolicyCoverage =
    images > 0 ? imageRights.images.filter((image) => image.image.displayPolicy && image.image.displayPolicy !== "unknown").length / images : 1;
  const reuseRightsCoverage = images > 0 ? imageRights.summary.verifiedReuseImages / images : 1;
  const linkHealth =
    linkCheck.mode === "online" && linkCheck.summary.sourceChecked > 0
      ? linkCheck.summary.sourceOk / linkCheck.summary.sourceChecked
      : null;
  const components = [
    component(
      "sourceUrlCoverage",
      "Kaynak URL kapsamı",
      total > 0 ? inventory.summary.recordsWithSourceUrl / total : 0,
      0.2,
      "source.url alanı dolu olan kayıt oranı."
    ),
    component(
      "primarySourceShare",
      "Birincil kaynak payı",
      classification.summary.primaryShare,
      0.15,
      "Bağlantılı kaynak sayfasının kanıt rolü; kaydın konusunun değeri değil."
    ),
    component(
      "dateCertainty",
      "Tarih kesinliği",
      total > 0 ? (dateAudit.summary.exactRecords + 0.5 * dateAudit.summary.estimatedRecords) / total : 0,
      0.15,
      "Kesin tarih 1, tahmini tarih 0,5, bilinmeyen 0 puan."
    ),
    component(
      "rightsClarity",
      "Görsel hak netliği",
      images > 0 ? 0.5 * displayPolicyCoverage + 0.5 * reuseRightsCoverage : 1,
      0.2,
      "Gösterim politikası ve yeniden kullanım kanıtının ortalaması."
    ),
    component(
      "humanReviewCoverage",
      "İnsan uzman onayı kapsamı",
      humanReview.summary.humanApprovalCoverage,
      0.2,
      "Makine/otomatik denetim insan onayı sayılmaz."
    ),
    component(
      "linkHealth",
      "Kaynak bağlantısı sağlığı",
      linkHealth,
      0.1,
      "Çevrimiçi modda source.url'nin başarılı yanıt oranı; çevrimdışıysa ölçülmez."
    ),
  ];
  const measured = components.filter((item) => item.value !== null);
  const measuredWeight = measured.reduce((sum, item) => sum + item.weight, 0);
  const score = measuredWeight > 0 ? round((measured.reduce((sum, item) => sum + item.value * item.weight, 0) / measuredWeight) * 100, 1) : null;
  const level = score === null ? "unknown" : score >= 85 ? "strong" : score >= 70 ? "moderate" : score >= 50 ? "needs_attention" : "critical";

  const findings = [];
  const addFinding = (finding) => findings.push(finding);
  if (archiveSummary.errors > 0) {
    addFinding({
      id: "archive-errors",
      severity: "high",
      checkFailure: true,
      title: `${archiveSummary.errors} arşiv doğrulama hatası`,
      detail: "Arşiv yükleyicisi hata döndürdü; kayıtlar güvenilir biçimde değerlendirilemez.",
      count: archiveSummary.errors,
    });
  }
  if (archiveSummary.warnings > 0) {
    addFinding({
      id: "archive-warnings",
      severity: "medium",
      checkFailure: false,
      title: `${archiveSummary.warnings} arşiv doğrulama uyarısı`,
      detail: "Mevcut arşiv doğrulayıcısının uyarıları; ayrıntılar arşiv doğrulama raporunda.",
      count: archiveSummary.warnings,
    });
  }
  if (inventory.summary.recordsWithoutSourceUrl > 0) {
    addFinding({
      id: "missing-source-url",
      severity: "high",
      checkFailure: true,
      title: `${inventory.summary.recordsWithoutSourceUrl} kayıtta source.url yok`,
      detail: "Kaynak URL'si olmayan kayıtlar için kaynak yeterliliği güvenilir biçimde değerlendirilemez.",
      count: inventory.summary.recordsWithoutSourceUrl,
    });
  }
  if (humanReview.summary.missingHumanReview > 0) {
    addFinding({
      id: "human-review-missing",
      severity: "high",
      checkFailure: false,
      title: `${humanReview.summary.missingHumanReview} kayıtta insan uzman onayı kaydı yok`,
      detail: "Makine/otomatik denetim insan onayı sayılmadı; bu bir yayın öncesi iş listesidir.",
      count: humanReview.summary.missingHumanReview,
    });
  }
  if (imageRights.summary.flaggedImages > 0) {
    addFinding({
      id: "image-rights-unverified",
      severity: "high",
      checkFailure: false,
      title: `${imageRights.summary.flaggedImages} görselde yeniden kullanım hakkı doğrulanmamış`,
      detail: "Bağlantı-only gösterim politikası, yeniden kullanım lisansı değildir.",
      count: imageRights.summary.flaggedImages,
    });
  }
  if (duplicateSources.summary.groupCount > 0) {
    const high = duplicateSources.summary.highSeverity > 0;
    addFinding({
      id: "shared-source-groups",
      severity: high ? "high" : "medium",
      checkFailure: high,
      title: `${duplicateSources.summary.groupCount} paylaşılan kaynak grubu`,
      detail: high
        ? "Aynı resmî kaynak birden fazla kayıtta yüksek önemde tekrar ediyor; uzman incelemesi gerekir."
        : "Aynı kaynak kimliği birden fazla kayıtta kullanılıyor; kayıtların ayrı olup olmadığı uzman tarafından değerlendirilmeli.",
      count: duplicateSources.summary.groupCount,
    });
  }
  if (sourceHistory.summary.driftRecords > 0) {
    addFinding({
      id: "source-url-drift",
      severity: "high",
      checkFailure: true,
      title: `${sourceHistory.summary.driftRecords} kaynak URL'si defterden farklı`,
      detail: "Arşiv kaydındaki URL ile kaynak geçmişi defterindeki currentUrl eşleşmiyor; değişiklik uzman onayıyla kabul edilmeli.",
      count: sourceHistory.summary.driftRecords,
    });
  }
  if (linkCheck.mode === "online" && linkCheck.summary.broken > 0) {
    addFinding({
      id: "broken-links",
      severity: "high",
      checkFailure: true,
      title: `${linkCheck.summary.broken} kırık bağlantı`,
      detail: "Çevrimiçi denetimde başarısız yanıt veren URL'ler var.",
      count: linkCheck.summary.broken,
    });
  }
  if (linkCheck.mode === "online" && linkCheck.summary.redirected > 0) {
    addFinding({
      id: "redirected-links",
      severity: "medium",
      checkFailure: false,
      title: `${linkCheck.summary.redirected} yönlendirilen bağlantı`,
      detail: "Bağlantılar çalışıyor ancak son URL değişmiş; kaynak geçmişi defteri güncellenmeli.",
      count: linkCheck.summary.redirected,
    });
  }
  if (dateAudit.summary.highSeverityRecords > 0) {
    addFinding({
      id: "date-issues-high",
      severity: "high",
      checkFailure: true,
      title: `${dateAudit.summary.highSeverityRecords} kayıtta yüksek önemde tarih sorunu`,
      detail: "Tarih modeli veya yayın kapısıyla ilgili yüksek önemde tutarsızlık.",
      count: dateAudit.summary.highSeverityRecords,
    });
  }
  if (sourceSufficiency.summary.belowAdequate > 0) {
    addFinding({
      id: "source-sufficiency-low",
      severity: "medium",
      checkFailure: false,
      title: `${sourceSufficiency.summary.belowAdequate} kayıt kaynak yeterliliğinde yeterli düzeyin altında`,
      detail: "Kaynak künyesi, provenans, tarih veya türe özgü kanıt bileşenlerinden biri eksik.",
      count: sourceSufficiency.summary.belowAdequate,
    });
  }
  if (coverage.summary.directBiographicalRecords === 0) {
    addFinding({
      id: "early-period-direct-gap",
      severity: "high",
      checkFailure: false,
      title: "1881-1918 için doğrudan biyografik kayıt yok",
      detail: "Dönemle kesişen kayıtlar mekân/yayın bağlamıdır; doğrudan olay, belge, konuşma veya fotoğraf kaydı bulunmuyor.",
      count: 0,
    });
  }
  if (candidateReport.summary.eligibleCandidates > 0) {
    addFinding({
      id: "unverified-candidates",
      severity: "low",
      checkFailure: false,
      title: `${candidateReport.summary.eligibleCandidates} doğrulanmamış erken dönem kaynak adayı`,
      detail: "Adaylar `ingest: false` ve `status: unverified`; arşive otomatik eklenmez.",
      count: candidateReport.summary.eligibleCandidates,
    });
  }
  if (candidateReport.summary.policyViolations > 0) {
    addFinding({
      id: "candidate-policy-violations",
      severity: "high",
      checkFailure: true,
      title: `${candidateReport.summary.policyViolations} aday politika ihlali`,
      detail: "Aday dosyasında ingest/status güvenli değildi; araç çıktıyı normalize etti ancak dosya düzeltilmeli.",
      count: candidateReport.summary.policyViolations,
    });
  }

  const sortedFindings = findings.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.id.localeCompare(b.id)
  );

  return {
    score,
    level,
    components,
    scoreBasis:
      linkHealth === null
        ? "Bağlantı sağlığı ölçülmediği için kalan bileşenler kendi ağırlıklarına göre yeniden ölçeklendi."
        : "Tüm bileşenler ölçüldü.",
    measuredWeight,
    findings: sortedFindings,
    criticalFindings: sortedFindings.filter((finding) => finding.severity === "high"),
    warnings: sortedFindings.filter((finding) => finding.severity === "medium" || finding.severity === "low"),
    checkFailures: sortedFindings.filter((finding) => finding.checkFailure),
  };
}

export function buildCatalogReport({
  context,
  coverageConfig,
  classificationOverrides,
  sourceHistory,
  candidateFile,
  linkCheck = EMPTY_LINK_CHECK,
  generatedAt = new Date().toISOString(),
}) {
  const records = context.records;
  const historyIndex = new Map((sourceHistory?.sources ?? []).map((entry) => [entry.recordId, entry]));
  const inventory = buildSourceInventory(records, { historyIndex });
  const classification = buildSourceClassification(records, { overrides: classificationOverrides?.overrides ?? {} });
  const duplicateSources = detectSharedSources(records);
  const dateAudit = auditDates(records);
  const sourceSufficiency = auditSourceSufficiency(records);
  const imageRights = auditImageRights(records);
  const humanReview = auditHumanReview(records);
  const coverage = analyzeEarlyPeriodCoverage(records, coverageConfig, {
    candidateSeeds: candidateFile?.candidates ?? [],
  });
  const candidateReport = buildCandidateReport(candidateFile, records, coverage, { linkCheck });
  const sourceHistoryReport = reconcileSourceHistory(records, sourceHistory, { changedAt: generatedAt.slice(0, 10) });
  const archiveSummary = buildArchiveSummary(context);
  const quality = computeQuality({
    archiveSummary,
    inventory,
    classification,
    duplicateSources,
    dateAudit,
    sourceSufficiency,
    imageRights,
    humanReview,
    coverage,
    sourceHistory: sourceHistoryReport,
    linkCheck,
    candidateReport,
  });

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    tool: {
      name: TOOL_NAME,
      version: TOOL_VERSION,
      readOnlyArchive: true,
      writesOnlyTo: "tools/archive-source-reliability/reports",
    },
    generatedAt,
    archiveFingerprint: archiveFingerprint(records),
    archiveSummary,
    quality,
    inventory,
    classification,
    duplicateSources,
    dateAudit,
    sourceSufficiency,
    imageRights,
    humanReview,
    coverage,
    candidates: candidateReport,
    sourceHistory: sourceHistoryReport,
    linkCheck,
    reproduction: {
      offline: "node src/cli.mjs report --write --generated-at YYYY-MM-DD",
      online: "node src/cli.mjs report --write --online --concurrency 1",
      check: "node src/cli.mjs check --online --concurrency 1",
      tests: "node --test tests/*.test.mjs",
    },
    limitations: [
      "Bağlantı denetimi anlık görüntüdür; resmî sitelerin davranışı sonradan değişebilir.",
      "Kaynak rolü sınıflandırması sezgiseldir; insan uzman değerlendirmesinin yerini almaz.",
      "Görsel hak raporu hukuki görüş değildir; kurum koşulları ve uzman görüşü gerekir.",
      "Aday kaynaklar doğrulanmamıştır ve arşive otomatik eklenmez.",
      "1881-1918 kapsamı kayıt tarihlerine göre hesaplanır; mekân kuruluş tarihi biyografik olay tarihi değildir.",
      "PDF/görsel içerikleri indirilmez veya metin çıkarımı yapılmaz.",
    ],
  };
}

function findingList(findings) {
  if (findings.length === 0) return "- Bulgu yok.";
  return findings
    .map((finding) => `- **${finding.severity.toUpperCase()}** — ${finding.title}: ${finding.detail}`)
    .join("\n");
}

function componentTable(components) {
  return markdownTable(
    ["Bileşen", "Değer", "Ağırlık", "Durum", "Not"],
    components.map((item) => [
      item.label,
      item.value === null ? "ölçülmedi" : formatPercent(item.value),
      formatPercent(item.weight),
      item.status === "measured" ? "ölçüldü" : "ölçülmedi",
      item.note,
    ])
  );
}

function summaryTable(rows) {
  return markdownTable(["Ölçüt", "Değer"], rows);
}

export function renderCatalogQualityMarkdown(report) {
  const { archiveSummary, quality, inventory, classification, duplicateSources, dateAudit, sourceSufficiency, imageRights, humanReview, coverage, candidates, sourceHistory, linkCheck } = report;
  const statusRows = archiveSummary.statuses.map((item) => [item.key, item.count]);
  const phaseRows = coverage.phaseMatrix.map((phase) => [
    phase.label,
    `${phase.start} – ${phase.end}`,
    phase.status,
    phase.directCount,
    phase.associatedCount,
    phase.contextualCount,
    phase.referenceOnlyCount,
    phase.candidateIds.join(", ") || "—",
  ]);
  return [
    "# Katalog Kalite Raporu",
    "",
    `**Araç:** ${report.tool.name} v${report.tool.version}  `,
    `**Üretim:** ${report.generatedAt}  `,
    `**Arşiv parmak izi:** \`${report.archiveFingerprint}\`  `,
    `**Kaynak parmak izi:** \`${archiveSummary.sourceFingerprint}\`  `,
    "**Mod:** Salt okunur arşiv taraması",
    "",
    "> Bu rapor bir yayın kapısı değildir. Ölçümleri ve uzman incelemesi gerektiren alanları görünür kılar.",
    "",
    "## 1. Yönetici özeti",
    "",
    summaryTable([
      ["Toplam kayıt", archiveSummary.records],
      ["Yayımlandı", archiveSummary.statuses.find((item) => item.key === "published")?.count ?? 0],
      ["İncelendi", archiveSummary.statuses.find((item) => item.key === "reviewed")?.count ?? 0],
      ["Taslak", archiveSummary.statuses.find((item) => item.key === "draft")?.count ?? 0],
      ["Arşiv hatası", archiveSummary.errors],
      ["Arşiv uyarısı", archiveSummary.warnings],
      ["Kaynak URL'si olan kayıt", `${inventory.summary.recordsWithSourceUrl} / ${inventory.summary.records}`],
      ["Benzersiz kaynak URL'si", inventory.summary.uniqueSourceUrls],
      ["Benzersiz tüm URL'ler", inventory.summary.uniqueAllUrls],
      ["Birincil kaynak payı", formatPercent(classification.summary.primaryShare)],
      ["İnsan uzman onayı", `${humanReview.summary.humanApproved} / ${humanReview.summary.totalRecords}`],
      ["Kullanım hakkı doğrulanmamış görsel", imageRights.summary.flaggedImages],
      ["Paylaşılan kaynak grubu", duplicateSources.summary.groupCount],
      ["Kaynak URL değişikliği (kabul edilmiş)", sourceHistory.summary.totalAcceptedChanges],
      ["1881-1918 doğrudan biyografik kayıt", coverage.summary.directBiographicalRecords],
      ["Doğrulanmamış erken dönem adayı", candidates.summary.eligibleCandidates],
      ["Çevrimiçi bağlantı denetimi", linkCheck.mode === "online" ? `${linkCheck.summary.checked} URL` : "çalıştırılmadı"],
    ]),
    "",
    `Durum dağılımı: ${statusRows.map(([key, count]) => `${key}: ${count}`).join(", ")}.`,
    "",
    "## 2. Kalite puanı",
    "",
    `**Puan:** ${quality.score === null ? "ölçülemedi" : `${quality.score} / 100`} — **${quality.level}**`,
    "",
    componentTable(quality.components),
    "",
    `> ${quality.scoreBasis}`,
    "",
    "Puan, tarihsel doğruluk veya yayın onayı değildir; yalnızca seçili kalite bileşenlerinin ağırlıklı göstergesidir.",
    "",
    "## 3. Öne çıkan bulgular",
    "",
    findingList(quality.findings),
    "",
    "## 4. Kaynak envanteri",
    "",
    markdownTable(
      ["Kurum", "Kayıt", "Kaynak URL'si"],
      inventory.summary.byInstitution.map((item) => {
        const rows = inventory.records.filter((record) => (record.institution ?? "(bilinmiyor)") === item.key);
        return [item.key, item.count, rows.filter((record) => record.sourceUrl).length];
      })
    ),
    "",
    `Ayrıntılı kayıt ve URL envanteri: [source-inventory.md](source-inventory.md) / [source-inventory.json](source-inventory.json).`,
    "",
    "## 5. Birincil / ikincil kaynak sınıflandırması",
    "",
    markdownTable(
      ["Rol", "Kayıt", "Pay"],
      classification.summary.byRole.map((item) => [item.key, item.count, formatPercent(item.count / classification.summary.total)])
    ),
    "",
    "> Sınıflandırma, bağlantılı kaynak sayfasının kanıt rolüdür; kaydın konusunun tarihsel değeri değildir.",
    "",
    "## 6. Bağlantı denetimi",
    "",
    linkCheck.mode === "online"
      ? markdownTable(
          ["Ölçüt", "Değer"],
          [
            ["Denetlenen URL", linkCheck.summary.checked],
            ["Başarılı", linkCheck.summary.ok],
            ["Yönlendirilen", linkCheck.summary.redirected],
            ["Kırık", linkCheck.summary.broken],
            ["Kaynak URL'si kırık", linkCheck.summary.sourceBroken],
            ["Kritik kanıt URL'si kırık", linkCheck.summary.criticalBroken],
            ["Aday URL'si kırık", linkCheck.summary.candidateBroken],
          ]
        )
      : `Çevrimdışı mod: ${linkCheck.note}`,
    "",
    "## 7. Paylaşılan resmî kaynaklar",
    "",
    duplicateSources.groups.length === 0
      ? "Paylaşılan kaynak grubu bulunmadı."
      : markdownTable(
          ["Önem", "Türler", "Kayıtlar", "Kaynak kimliği", "Not"],
          duplicateSources.groups.slice(0, 10).map((group) => [
            group.severity,
            group.kinds.join(", "),
            group.recordIds.join(", "),
            group.archiveIdentifiers.join(", ") || group.keys.join(", "),
            group.notes.join(" "),
          ])
        ),
    "",
    "## 8. Kaynak URL geçmişi",
    "",
    `İzlenen kayıt: ${sourceHistory.summary.trackedRecords}. Kabul edilmiş değişiklik: ${sourceHistory.summary.totalAcceptedChanges}. Defterden sapan kayıt: ${sourceHistory.summary.driftRecords}.`,
    "",
    sourceHistory.changedSources.length === 0
      ? "Kaynak URL değişikliği kaydı yok."
      : markdownTable(
          ["Kayıt", "Özgün URL", "Güncel URL", "Değişiklik"],
          sourceHistory.changedSources.map((row) => [
            row.recordId,
            row.originalUrl,
            row.currentUrl,
            row.changes.map((change) => `${change.changedAt}: ${change.reason}`).join("<br>"),
          ])
        ),
    "",
    "## 9. Tarih ve kaynak yeterliliği",
    "",
    summaryTable([
      ["Tarih sorunu olan kayıt", dateAudit.summary.recordsWithIssues],
      ["Yüksek önemde tarih sorunu", dateAudit.summary.highSeverityRecords],
      ["Tahmini tarihli kayıt", dateAudit.summary.estimatedRecords],
      ["Bilinmeyen tarihli kayıt", dateAudit.summary.unknownRecords],
      ["Ortalama kaynak yeterliliği", sourceSufficiency.summary.averageScore],
      ["Yeterli düzeyin altında", sourceSufficiency.summary.belowAdequate],
      ["Künyesi eksik kayıt", sourceSufficiency.summary.citationMissing],
      ["Düzeyi sınırlandırılan kayıt", sourceSufficiency.summary.cappedRecords],
    ]),
    "",
    "## 10. Kullanım hakkı doğrulanmamış görseller",
    "",
    summaryTable([
      ["Toplam görsel", imageRights.summary.totalImages],
      ["Yeniden kullanımı doğrulanmış", imageRights.summary.verifiedReuseImages],
      ["İşaretlenen görsel", imageRights.summary.flaggedImages],
      ["Bağlantı-only / doğrulanmamış", imageRights.summary.linkOnlyUnverifiedImages],
      ["Hak durumu bilinmeyen kayıt", imageRights.summary.recordsWithUnknownRights],
    ]),
    "",
    "> Bağlantı-only gösterim politikası yeniden kullanım lisansı değildir.",
    "",
    "## 11. İnsan uzman onayı",
    "",
    summaryTable([
      ["Toplam kayıt", humanReview.summary.totalRecords],
      ["İnsan uzman onayı olan", humanReview.summary.humanApproved],
      ["İnsan uzman onayı olmayan", humanReview.summary.missingHumanReview],
      ["Makine/otomatik denetim", humanReview.summary.aiReviewed],
      ["İnceleyen yok", humanReview.summary.unreviewed],
      ["İnceleyen niteliği belirsiz", humanReview.summary.unknownReviewer],
    ]),
    "",
    "Ayrı iş listesi: [human-review-required.md](human-review-required.md).",
    "",
    "## 12. 1881-1918 erken dönem kapsamı",
    "",
    summaryTable([
      ["Dönemle kesişen kayıt", coverage.summary.periodRecordCount],
      ["Doğrudan biyografik kayıt", coverage.summary.directBiographicalRecords],
      ["İlişkili mekân kaydı", coverage.summary.associatedPlaceRecords],
      ["Bağlam kaydı", coverage.summary.contextualRecords],
      ["Erken yaşam referansı (tarih dönem dışı)", coverage.summary.earlyLifeReferenceOutsideDate],
      ["Kayıtsız yıl", coverage.summary.emptyYearCount],
      ["Doğrudan kaydı olan evre", `${coverage.summary.phasesWithDirect} / ${coverage.summary.phaseCount}`],
    ]),
    "",
    markdownTable(["Evre", "Dönem", "Durum", "Doğrudan", "Mekân", "Bağlam", "Referans", "Adaylar"], phaseRows),
    "",
    "Ayrıntılı kapsam raporu: [early-period-coverage.md](early-period-coverage.md).",
    "",
    "## 13. Erken dönem kaynak adayları",
    "",
    `Toplam aday: ${candidates.summary.eligibleCandidates}; arşivde bulunduğu için çıkarılan: ${candidates.summary.filteredAlreadyInArchive}; politika ihlali: ${candidates.summary.policyViolations}.`,
    "",
    "Tüm adaylar **unverified** ve **ingest: false** durumundadır. İnsan uzman doğrulaması olmadan arşive eklenmez.",
    "",
    markdownTable(
      ["Öncelik", "Kaynak", "Başlık", "Evreler", "Tür", "Durum"],
      candidates.candidates.slice(0, 15).map((candidate) => [
        candidate.priority,
        candidate.sourceId,
        candidate.title,
        candidate.phaseLabels.join(", "),
        candidate.coverageType,
        `${candidate.status} / ingest=${candidate.ingest}`,
      ])
    ),
    "",
    "Ayrıntılı aday raporu: [early-period-candidates.md](early-period-candidates.md).",
    "",
    "## 14. Yeniden üretim",
    "",
    "```bash",
    report.reproduction.offline,
    report.reproduction.online,
    report.reproduction.check,
    report.reproduction.tests,
    "```",
    "",
    "## 15. Sınırlamalar",
    "",
    ...report.limitations.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export function renderInventoryMarkdown(inventory) {
  return [
    "# Kaynak URL Envanteri",
    "",
    `Toplam kayıt: **${inventory.summary.records}**  `,
    `Kaynak URL'si olan: **${inventory.summary.recordsWithSourceUrl}**  `,
    `Benzersiz kaynak URL'si: **${inventory.summary.uniqueSourceUrls}**  `,
    `Benzersiz tüm URL'ler: **${inventory.summary.uniqueAllUrls}**  `,
    `Benzersiz konak: **${inventory.summary.uniqueHosts}**`,
    "",
    "## Kurum dağılımı",
    "",
    markdownTable(
      ["Kurum", "Kayıt", "Kaynak URL'si"],
      inventory.summary.byInstitution.map((item) => {
        const rows = inventory.records.filter((record) => (record.institution ?? "(bilinmiyor)") === item.key);
        return [item.key, item.count, rows.filter((record) => record.sourceUrl).length];
      })
    ),
    "",
    "## Rol dağılımı",
    "",
    markdownTable(["Rol", "URL girdisi"], inventory.summary.byRole.map((item) => [item.key, item.count])),
    "",
    "## Kayıtlar",
    "",
    markdownTable(
      ["Kayıt", "Başlık", "Tür", "Durum", "Kurum", "Kaynak URL'si", "URL sayısı", "Geçmiş"],
      inventory.records.map((record) => [
        record.recordId,
        record.title,
        record.type,
        record.status,
        record.institution,
        record.sourceUrl ?? "—",
        record.urlCount,
        record.historyStatus,
      ])
    ),
    "",
  ].join("\n");
}

export function renderClassificationMarkdown(classification) {
  return [
    "# Birincil / İkincil Kaynak Sınıflandırması",
    "",
    "> Bu sınıflandırma, bağlantılı kaynak sayfasının kanıt rolüdür; kaydın konusunun tarihsel değeri değildir.",
    "",
    `Toplam: **${classification.summary.total}**  `,
    `Birincil: **${classification.summary.primaryCount}**  `,
    `İkincil: **${classification.summary.secondaryCount}**  `,
    `Referans: **${classification.summary.referenceCount}**  `,
    `Bilinmeyen: **${classification.summary.unknownCount}**  `,
    `Birincil pay: **${formatPercent(classification.summary.primaryShare)}**`,
    "",
    "## Kurum bazında",
    "",
    markdownTable(
      ["Kurum", "Kayıt", "Rol dağılımı"],
      classification.summary.byInstitution.map((item) => [
        item.institution,
        item.count,
        item.roleBreakdown.map((role) => `${role.key}: ${role.count}`).join(", "),
      ])
    ),
    "",
    "## Tür bazında",
    "",
    markdownTable(
      ["Tür", "Kayıt", "Rol dağılımı"],
      classification.summary.byType.map((item) => [
        item.type,
        item.count,
        item.roleBreakdown.map((role) => `${role.key}: ${role.count}`).join(", "),
      ])
    ),
    "",
    "## Kayıtlar",
    "",
    markdownTable(
      ["Kayıt", "Başlık", "Kurum", "Tür", "Rol", "Kanıt düzeyi", "Güven", "Geçersiz kılma"],
      classification.records.map((record) => [
        record.recordId,
        record.title,
        record.institution,
        record.type,
        record.role,
        record.evidenceLevel,
        record.confidence,
        record.overridden ? "evet" : "hayır",
      ])
    ),
    "",
  ].join("\n");
}

export function renderSharedSourcesMarkdown(duplicates) {
  return [
    "# Paylaşılan Resmî Kaynaklar",
    "",
    `Grup: **${duplicates.summary.groupCount}**  `,
    `Yüksek önem: **${duplicates.summary.highSeverity}**  `,
    `Orta önem: **${duplicates.summary.mediumSeverity}**  `,
    `Etkilenen kayıt: **${duplicates.summary.sharedRecordCount}**`,
    "",
    "> Aynı kaynağın birden fazla kayıtta kullanılması her zaman hata değildir; ancak kayıtların ayrı konuları mı yoksa tekrar mı olduğu uzman tarafından değerlendirilmelidir.",
    "",
    duplicates.groups.length === 0
      ? "Paylaşılan kaynak grubu bulunmadı."
      : markdownTable(
          ["Önem", "Türler", "Kayıtlar", "Kaynak URL'leri", "Kurum kimliği", "Not"],
          duplicates.groups.map((group) => [
            group.severity,
            group.kinds.join(", "),
            group.recordIds.join(", "),
            group.sourceUrls.join("<br>"),
            group.archiveIdentifiers.join(", ") || group.keys.join(", "),
            group.notes.join(" "),
          ])
        ),
    "",
  ].join("\n");
}

export function renderHistoryMarkdown(sourceHistory) {
  return [
    "# Kaynak URL Geçmişi",
    "",
    `İzlenen kayıt: **${sourceHistory.summary.trackedRecords}**  `,
    `İzlenmeyen kayıt: **${sourceHistory.summary.untrackedRecords}**  `,
    `Kabul edilmiş değişiklik: **${sourceHistory.summary.totalAcceptedChanges}**  `,
    `Defterden sapan: **${sourceHistory.summary.driftRecords}**  `,
    `Özgün URL'si korunan: **${sourceHistory.summary.originalPreservedRecords}**  `,
    `Defterde olup arşivde olmayan: **${sourceHistory.summary.orphanedEntries}**`,
    "",
    "## Değişiklik kaydı olan kaynaklar",
    "",
    sourceHistory.changedSources.length === 0
      ? "Değişiklik kaydı yok."
      : markdownTable(
          ["Kayıt", "Kurum", "Özgün URL", "Güncel URL", "Değişiklikler"],
          sourceHistory.changedSources.map((row) => [
            row.recordId,
            row.institution,
            row.originalUrl,
            row.currentUrl,
            row.changes.map((change) => `${change.changedAt}: ${change.from} → ${change.to} (${change.reason})`).join("<br>"),
          ])
        ),
    "",
    "## Defterden sapan kayıtlar",
    "",
    sourceHistory.drift.length === 0
      ? "Sapma yok."
      : markdownTable(
          ["Kayıt", "Önceki URL", "Arşivdeki URL", "Önerilen değişiklik"],
          sourceHistory.drift.map((row) => [row.recordId, row.ledgerCurrentUrl, row.currentUrl, row.proposedChange?.reason ?? "—"])
        ),
    "",
    "## İzlenmeyen kayıtlar",
    "",
    sourceHistory.untracked.length === 0
      ? "Tüm kayıtlar defterde izleniyor."
      : sourceHistory.untracked.map((row) => `- ${row.recordId}: ${row.currentUrl ?? "URL yok"}`).join("\n"),
    "",
    "> Defteri güncellemek için `node src/cli.mjs history --seed-history --write` veya uzman incelemesi sonrası `node src/cli.mjs history --accept-history --write` kullanın. Varsayılan rapor defteri yazmaz.",
    "",
  ].join("\n");
}

export function renderDateAndSourceAuditMarkdown(dateAudit, sourceSufficiency) {
  return [
    "# Tarih ve Kaynak Yeterliliği Denetimi",
    "",
    "## Tarih denetimi",
    "",
    summaryTable([
      ["Toplam kayıt", dateAudit.summary.totalRecords],
      ["Sorunlu kayıt", dateAudit.summary.recordsWithIssues],
      ["Yüksek önemde sorunlu kayıt", dateAudit.summary.highSeverityRecords],
      ["Kesin tarih", dateAudit.summary.exactRecords],
      ["Tahmini tarih", dateAudit.summary.estimatedRecords],
      ["Bilinmeyen tarih", dateAudit.summary.unknownRecords],
      ["Tahmini tarihli yayında", dateAudit.summary.estimatedPublished],
      ["Bilinmeyen tarihli yayında", dateAudit.summary.unknownPublished],
    ]),
    "",
    "### Tarih sorunları",
    "",
    dateAudit.issues.length === 0
      ? "Tarih sorunu bulunmadı."
      : markdownTable(
          ["Önem", "Kod", "Kayıt", "Mesaj", "Alan"],
          dateAudit.issues.map((item) => [item.severity, item.code, item.recordId, item.message, item.field])
        ),
    "",
    "## Kaynak yeterliliği",
    "",
    summaryTable([
      ["Toplam kayıt", sourceSufficiency.summary.totalRecords],
      ["Ortalama puan", sourceSufficiency.summary.averageScore],
      ["Güçlü", sourceSufficiency.summary.strongRecords],
      ["Yeterli", sourceSufficiency.summary.adequateRecords],
      ["Kısmi", sourceSufficiency.summary.partialRecords],
      ["Zayıf", sourceSufficiency.summary.weakRecords],
      ["Yeterli düzeyin altında", sourceSufficiency.summary.belowAdequate],
      ["Künyesi eksik", sourceSufficiency.summary.citationMissing],
      ["Düzeyi sınırlandırılan", sourceSufficiency.summary.cappedRecords],
    ]),
    "",
    "### En düşük puanlı kayıtlar",
    "",
    markdownTable(
      ["Kayıt", "Başlık", "Puan", "Düzey", "Eksikler"],
      sourceSufficiency.records.slice(0, 30).map((record) => [
        record.recordId,
        record.title,
        record.score,
        record.level,
        record.deficits.map((deficit) => deficit.label).join(", ") || "—",
      ])
    ),
    "",
  ].join("\n");
}

export function renderRightsMarkdown(imageRights) {
  return [
    "# Kullanım Hakkı Doğrulanmamış Görseller",
    "",
    `Toplam görsel: **${imageRights.summary.totalImages}**  `,
    `Yeniden kullanımı doğrulanmış: **${imageRights.summary.verifiedReuseImages}**  `,
    `İşaretlenen: **${imageRights.summary.flaggedImages}**  `,
    `Bağlantı-only / doğrulanmamış: **${imageRights.summary.linkOnlyUnverifiedImages}**  `,
    `Hak durumu bilinmeyen kayıt: **${imageRights.summary.recordsWithUnknownRights}**`,
    "",
    "> Bağlantı-only gösterim politikası, yeniden kullanım lisansı değildir. Bu rapor hukuki görüş değildir.",
    "",
    "## İşaretlenen görseller",
    "",
    imageRights.flagged.length === 0
      ? "İşaretlenen görsel yok."
      : markdownTable(
          ["Kayıt", "Başlık", "Kurum", "Rol", "Hak durumu", "Gösterim", "Kaynak sayfası", "Not"],
          imageRights.flagged.map((image) => [
            image.recordId,
            image.title,
            image.institution,
            image.classification,
            image.rights.status,
            image.image.displayPolicy,
            image.image.sourcePageUrl ?? "—",
            image.rights.note,
          ])
        ),
    "",
    "## Görseli olmayan ama hak durumu bilinmeyen kayıtlar",
    "",
    imageRights.unknownRightsRecords.length === 0
      ? "Yok."
      : markdownTable(
          ["Kayıt", "Başlık", "Durum", "Hak durumu", "Görsel", "Not"],
          imageRights.unknownRightsRecords.map((record) => [
            record.recordId,
            record.title,
            record.status,
            record.rightsStatus,
            record.hasImage ? "var" : "yok",
            record.note,
          ])
        ),
    "",
  ].join("\n");
}

export function renderHumanReviewMarkdown(humanReview) {
  return [
    "# İnsan Uzman Onayı Gereken Kayıtlar",
    "",
    `Toplam kayıt: **${humanReview.summary.totalRecords}**  `,
    `İnsan onayı olan: **${humanReview.summary.humanApproved}**  `,
    `İnsan onayı olmayan: **${humanReview.summary.missingHumanReview}**  `,
    `Makine/otomatik denetim: **${humanReview.summary.aiReviewed}**  `,
    `İnceleyen yok: **${humanReview.summary.unreviewed}**  `,
    `İnceleyen niteliği belirsiz: **${humanReview.summary.unknownReviewer}**`,
    "",
    "> Makine/otomatik denetim (`OpenCode`, `yapay zekâ` vb.) insan uzman onayı sayılmaz. Bu rapor hiçbir inceleme sistemine yazmaz; yalnızca iş listesi üretir.",
    "",
    "## Durum bazında",
    "",
    markdownTable(
      ["Durum", "Kayıt", "İnsan onayı", "Onaysız"],
      humanReview.summary.byStatus.map((item) => [item.status, item.count, item.humanApproved, item.missingHumanReview])
    ),
    "",
    "## İş listesi",
    "",
    markdownTable(
      ["Kayıt", "Başlık", "Durum", "Tür", "Kurum", "İnceleyen", "İnceleyen türü", "Tarih"],
      humanReview.worklist.map((record) => [
        record.recordId,
        record.title,
        record.status,
        record.type,
        record.institution,
        record.reviewedBy ?? "—",
        record.reviewerKind,
        record.reviewedAt ?? "—",
      ])
    ),
    "",
  ].join("\n");
}

export function renderCoverageMarkdown(coverage) {
  return [
    "# 1881-1918 Erken Dönem Kapsamı",
    "",
    `Dönem: **${coverage.period.label}** (${coverage.period.start} – ${coverage.period.end})`,
    "",
    summaryTable([
      ["Toplam kayıt", coverage.summary.totalRecords],
      ["Dönemle kesişen", coverage.summary.periodRecordCount],
      ["Doğrudan biyografik", coverage.summary.directBiographicalRecords],
      ["İlişkili mekân", coverage.summary.associatedPlaceRecords],
      ["Bağlam", coverage.summary.contextualRecords],
      ["Erken yaşam referansı (tarih dönem dışı)", coverage.summary.earlyLifeReferenceOutsideDate],
      ["Tarihsiz", coverage.summary.undatedRecords],
      ["Dönem dışı", coverage.summary.outOfPeriodRecords],
      ["Kayıt bulunan yıl", coverage.summary.yearsWithAnyRecord.join(", ") || "—"],
      ["Kayıtsız yıl", coverage.summary.emptyYearCount],
      ["Doğrudan kaydı olan evre", `${coverage.summary.phasesWithDirect} / ${coverage.summary.phaseCount}`],
    ]),
    "",
    "## Evre matrisi",
    "",
    markdownTable(
      ["Evre", "Dönem", "Durum", "Dönem içi", "Doğrudan", "Mekân", "Bağlam", "Referans", "Adaylar"],
      coverage.phaseMatrix.map((phase) => [
        phase.label,
        `${phase.start} – ${phase.end}`,
        phase.status,
        phase.inPeriodRecordCount,
        phase.directCount,
        phase.associatedCount,
        phase.contextualCount,
        phase.referenceOnlyCount,
        phase.candidateIds.join(", ") || "—",
      ])
    ),
    "",
    "## Boş yıl aralıkları",
    "",
    coverage.gaps.find((gap) => gap.id === "empty-year-ranges")?.detail ?? "Boş yıl aralığı yok.",
    "",
    "## Dönemle kesişen ve erken yaşam referansı kayıtları",
    "",
    markdownTable(
      ["Kayıt", "Başlık", "Tür", "Tarih", "Kapsam rolü", "Tarih rolü", "Evreler"],
      coverage.records
        .filter((record) => record.inPeriod || record.coverageRole === "early-life-reference-outside-date")
        .map((record) => [
          record.recordId,
          record.title,
          record.type,
          `${record.date.start ?? "—"}${record.date.end ? ` – ${record.date.end}` : ""}`,
          record.coverageRole,
          record.dateRole,
          [...record.phaseIds, ...record.referencePhaseIds].join(", ") || "—",
        ])
    ),
    "",
    "## Boşluklar",
    "",
    coverage.gaps.length === 0
      ? "Kapsam boşluğu bulunmadı."
      : coverage.gaps.map((gap) => `- **${gap.severity.toUpperCase()}** — ${gap.label}: ${gap.detail}`).join("\n"),
    "",
    "## Öneriler",
    "",
    coverage.recommendations.map((item) => `- ${item}`).join("\n"),
    "",
  ].join("\n");
}

export function renderCandidatesMarkdown(candidates) {
  return [
    "# Erken Dönem Kaynak Adayları",
    "",
    "> **Bu dosyadaki adaylar arşiv kaydı değildir.** Tümü `status: unverified` ve `ingest: false` durumundadır. İnsan uzman doğrulaması olmadan arşive eklenemez.",
    "",
    `Toplam aday: **${candidates.summary.eligibleCandidates}**  `,
    `Arşivde bulunduğu için çıkarılan: **${candidates.summary.filteredAlreadyInArchive}**  `,
    `Yüksek öncelik: **${candidates.summary.highPriority}**  `,
    `Politika ihlali: **${candidates.summary.policyViolations}**  `,
    `Evresinde aday olan: **${candidates.summary.phasesWithCandidates}**  `,
    `Yalnızca genel biyografi adayı olan evre: **${candidates.summary.broadOnlyPhases}**`,
    "",
    "## Evre kapsamı",
    "",
    markdownTable(
      ["Evre", "Doğrudan kayıt", "Adaylar", "Aday kapsamı"],
      candidates.phaseCoverage.map((phase) => [
        phase.label,
        phase.directCount,
        phase.candidateIds.join(", ") || "—",
        phase.candidateCoverage,
      ])
    ),
    "",
    "## Adaylar",
    "",
    markdownTable(
      ["Öncelik", "Kaynak", "Başlık", "Yazar", "Dönem", "Evreler", "Tür", "Durum", "URL"],
      candidates.candidates.map((candidate) => [
        candidate.priority,
        candidate.sourceId,
        candidate.title,
        candidate.author,
        candidate.period,
        candidate.phaseLabels.join(", "),
        candidate.coverageType,
        `${candidate.status} / ingest=${candidate.ingest}`,
        candidate.url,
      ])
    ),
    "",
    "## Arşivde bulunduğu için çıkarılanlar",
    "",
    candidates.filtered.length === 0
      ? "Yok."
      : markdownTable(
          ["Kaynak", "Başlık", "Neden"],
          candidates.filtered.map((candidate) => [candidate.sourceId, candidate.title, candidate.reason])
        ),
    "",
    "## Doğrulama politikası",
    "",
    candidates.candidates.length === 0
      ? "Aday yok."
      : candidates.candidates
          .map(
            (candidate) =>
              `- **${candidate.sourceId} — ${candidate.title}:** ${candidate.whyCandidate} Doğrulama notu: ${candidate.verificationNotes}`
          )
          .join("\n"),
    "",
  ].join("\n");
}

export function renderLinkCheckMarkdown(linkCheck) {
  if (linkCheck.mode !== "online") {
    return [
      "# Bağlantı Denetimi",
      "",
      "Çevrimdışı mod: bağlantı durumu ölçülmedi.",
      "",
      linkCheck.note ?? "",
      "",
      "Çevrimiçi denetim için: `node src/cli.mjs report --write --online --concurrency 1`",
      "",
    ].join("\n");
  }
  return [
    "# Bağlantı Denetimi",
    "",
    `Denetim zamanı: **${linkCheck.checkedAt}**  `,
    `Süre: **${linkCheck.durationMs} ms**`,
    "",
    summaryTable([
      ["Denetlenen URL", linkCheck.summary.checked],
      ["Başarılı", linkCheck.summary.ok],
      ["Yönlendirilen", linkCheck.summary.redirected],
      ["Kırık", linkCheck.summary.broken],
      ["Kaynak URL'si denetlenen", linkCheck.summary.sourceChecked],
      ["Kaynak URL'si kırık", linkCheck.summary.sourceBroken],
      ["Kritik kanıt URL'si kırık", linkCheck.summary.criticalBroken],
      ["Aday URL'si denetlenen", linkCheck.summary.candidateChecked],
      ["Aday URL'si kırık", linkCheck.summary.candidateBroken],
    ]),
    "",
    "## Kırık bağlantılar",
    "",
    linkCheck.broken.length === 0
      ? "Kırık bağlantı yok."
      : markdownTable(
          ["URL", "Durum", "Hata", "Kayıtlar", "Roller"],
          linkCheck.broken.map((row) => [row.url, row.status, row.error, row.recordIds.join(", "), row.roles.join(", ")])
        ),
    "",
    "## Yönlendirilen bağlantılar",
    "",
    linkCheck.redirects.length === 0
      ? "Yönlendirme yok."
      : markdownTable(
          ["Asıl URL", "Son URL", "Durum", "Kayıtlar", "Roller"],
          linkCheck.redirects.map((row) => [row.url, row.finalUrl, row.status, row.recordIds.join(", "), row.roles.join(", ")])
        ),
    "",
  ].join("\n");
}

export function renderReportsIndex(report) {
  return [
    "# Üretilen Raporlar",
    "",
    `Üretim: ${report.generatedAt}  `,
    `Arşiv parmak izi: \`${report.archiveFingerprint}\``,
    "",
    markdownTable(
      ["Dosya", "İçerik"],
      [
        ["catalog-quality.md", "Yönetici özeti, kalite puanı, öne çıkan bulgular."],
        ["catalog-quality.json", "Tüm bölümleri içeren makine-okunur rapor."],
        ["source-inventory.md / .json", "Kayıt bazında kaynak URL envanteri."],
        ["source-classification.md", "Birincil/ikincil/referans sınıflandırması."],
        ["shared-sources.md", "Aynı resmî kaynağa bağlı kayıt grupları."],
        ["source-url-history.md", "Özgün/güncel URL ve değişiklik defteri."],
        ["date-and-source-audit.md", "Tarih kesinliği ve kaynak yeterliliği."],
        ["unknown-rights-images.md", "Kullanım hakkı doğrulanmamış görseller."],
        ["human-review-required.md", "İnsan uzman onayı iş listesi."],
        ["early-period-coverage.md", "1881-1918 kapsam ve boşluk analizi."],
        ["early-period-candidates.md / .json", "Doğrulanmamış erken dönem adayları."],
        ["link-check.md / .json", "Çevrimiçi/çevrimdışı bağlantı denetimi."],
      ]
    ),
    "",
    "> Raporlar `reports/` altında üretilir; arşiv kayıtları salt okunurdur.",
    "",
  ].join("\n");
}

export async function writeReports(report, outDir, { repoRoot }) {
  const safeOutDir = assertSafeOutputDir(outDir, repoRoot);
  const files = new Map();
  const add = (name, content) => {
    files.set(name, content.endsWith("\n") ? content : `${content}\n`);
  };
  add("catalog-quality.json", stableStringify(report));
  add("catalog-quality.md", renderCatalogQualityMarkdown(report));
  add(
    "source-inventory.json",
    stableStringify({ schemaVersion: report.inventory.schemaVersion, summary: report.inventory.summary, records: report.inventory.records, urls: report.inventory.urls })
  );
  add("source-inventory.md", renderInventoryMarkdown(report.inventory));
  add("source-classification.md", renderClassificationMarkdown(report.classification));
  add("shared-sources.md", renderSharedSourcesMarkdown(report.duplicateSources));
  add("source-url-history.md", renderHistoryMarkdown(report.sourceHistory));
  add("date-and-source-audit.md", renderDateAndSourceAuditMarkdown(report.dateAudit, report.sourceSufficiency));
  add("unknown-rights-images.md", renderRightsMarkdown(report.imageRights));
  add("human-review-required.md", renderHumanReviewMarkdown(report.humanReview));
  add("early-period-coverage.md", renderCoverageMarkdown(report.coverage));
  add("early-period-candidates.md", renderCandidatesMarkdown(report.candidates));
  add(
    "early-period-candidates.json",
    stableStringify({
      schemaVersion: report.candidates.schemaVersion,
      discoveredAt: report.candidates.discoveredAt,
      policy: report.candidates.policy,
      summary: report.candidates.summary,
      phaseCoverage: report.candidates.phaseCoverage,
      candidates: report.candidates.candidates,
      filtered: report.candidates.filtered,
      policyViolations: report.candidates.policyViolations,
    })
  );
  add("link-check.json", stableStringify(report.linkCheck));
  add("link-check.md", renderLinkCheckMarkdown(report.linkCheck));
  add("README.md", renderReportsIndex(report));

  const written = [];
  for (const [name, content] of [...files.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"))) {
    const filePath = path.join(safeOutDir, name);
    await writeText(filePath, content);
    written.push({ file: name, path: filePath, bytes: Buffer.byteLength(content, "utf8") });
  }
  return { outDir: safeOutDir, files: written };
}

export function evaluateCheck(report) {
  const failures = report.quality.findings.filter((finding) => finding.checkFailure);
  const warnings = report.quality.findings.filter((finding) => !finding.checkFailure && finding.severity !== "info");
  return {
    ok: failures.length === 0,
    status: failures.length === 0 ? "pass" : "fail",
    failures,
    warnings,
    note:
      failures.length === 0
        ? "Kritik kontrol hatası yok. İnsan onayı, hak ve kapsam uyarıları yayın öncesi iş listesidir."
        : "Kritik kontrol hatası var; ayrıntılar failures listesinde.",
  };
}
