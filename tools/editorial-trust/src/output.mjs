import { lstatSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { canonicalJson } from "../../../web/lib/editorial-trust/canonical.ts";
import { csvCell, escapeMarkup } from "../../../web/lib/editorial-trust/input-safety.ts";
import { SecurityBoundaryError } from "./repo-reader.mjs";

export const REPORT_DIR = "docs/editorial/trust-gates/reports";

/** Deterministik, okunabilir JSON: anahtarlar sıralı, 2 boşluk girinti. */
export function stableJson(value) {
  return `${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n`;
}

export const CSV_COLUMNS = ["subjectType", "recordId", "slug", "technicalLabel", "rightsStatus", "reviewState", "trustClass", "result", "release_ready", "human_historian_review_verified", "human_editor_approval_verified", "current_revision_matched", "findingCodes"];

export function toCsv(report) {
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of report.rows) {
    const values = [row.subjectType, row.recordId, row.slug, row.technicalLabel, row.rightsStatus, row.reviewState, row.trustClass, row.result, row.flags.release_ready, row.flags.human_historian_review_verified, row.flags.human_editor_approval_verified, row.flags.current_revision_matched, [...new Set(row.findings.map((item) => item.code))].sort().join(" ")];
    lines.push(values.map(csvCell).join(","));
  }
  return `${lines.join("\n")}\n`;
}

const COUNT_LABELS = {
  catalog_records: "Katalog kaydı",
  review_form_files: "Form dosyası",
  matched_forms: "Kayıtla eşleşen form",
  missing_forms: "Eksik form",
  orphan_forms: "Kaydı olmayan (yetim) form",
  duplicate_record_ids: "Yinelenen kayıt kimliği",
  duplicate_forms: "Aynı kayda ikinci form",
  invalid_forms: "Geçersiz form",
  unreadable_files: "Okunamayan dosya",
  pending: "Pending form",
  stale: "Stale form",
  submitted_claim_unverified: "Doğrulanmamış inceleme iddiası",
  identity_verified_real_reviews: "Kimliği doğrulanmış gerçek uzman incelemesi",
  editor_approved_real_decisions: "Doğrulanmış gerçek editör kararı",
  technical_label_published: "Teknik `published` etiketi",
  rights_blocked: "Hak engelli kayıt",
  missing_source_location: "Eksik kaynak konumu",
  release_ready: "Yayına hazır kayıt",
  publication_records: "Makale kaydı",
};

export function toMarkdown(report, gate) {
  const lines = [
    "# Editoryal güven raporu",
    "",
    `- Üretim: ${report.meta.generatedAt}`,
    `- Dal / commit: \`${escapeMarkup(report.meta.branch)}\` / \`${escapeMarkup(report.meta.commit)}\``,
    `- Katalog özeti: \`${report.meta.catalogDigest}\``,
    `- Kısmi veri: ${report.meta.partial ? "**evet**: bütün arşiv için tam sonuç iddia edilemez" : "hayır"}`,
    "",
    "## Ayrık sonuç",
    "",
    "| Katman | Sonuç |",
    "|---|---|",
    `| A. Mühendislik (teknik testler) | ${gate.technical_tests_passed ? "geçti" : "bu raporda doğrulanmadı"} |`,
    `| B. İnsan editoryal yayın hazırlığı | **${gate.release_ready ? "hazır" : "ENGELLİ"}** (${gate.blocked_records} kayıt engelli, ${gate.global_critical_findings} global kritik bulgu) |`,
    "",
    "## Sayımlar",
    "",
    "| Ölçüm | Değer |",
    "|---|---|",
    ...Object.entries(COUNT_LABELS).map(([key, label]) => `| ${label} | ${report.counts[key]} |`),
    "",
    "## Bulgu kodları",
    "",
    "| Kod | Adet |",
    "|---|---|",
    ...Object.entries(report.findingCounts).map(([code, n]) => `| \`${code}\` | ${n} |`),
    "",
    `_${escapeMarkup(report.countingScope)}_`,
    "",
    "## Global bulgular",
    "",
    ...report.globalFindings.map((item) => `- **${item.code}** (${item.severity}): ${escapeMarkup(item.reason)} → ${escapeMarkup(item.remediation)}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function inside(parent, child) {
  return child === parent || child.startsWith(parent + path.sep);
}

/** Yalnız izinli rapor dizinine (repo içi REPORT_DIR veya işletim sistemi geçici dizini) yazar. */
export function resolveOutputDir(root, requested) {
  if (typeof requested !== "string" || !requested || requested.includes("\0")) throw new SecurityBoundaryError("invalid_output_dir");
  const realRoot = realpathSync(root);
  const allowedRepo = path.resolve(realRoot, REPORT_DIR);
  const allowedTmp = realpathSync(os.tmpdir());
  const target = path.resolve(realRoot, requested);
  if (!inside(allowedRepo, target) && !inside(allowedTmp, target)) throw new SecurityBoundaryError("output_dir_not_allowed");
  mkdirSync(target, { recursive: true });
  if (lstatSync(target).isSymbolicLink()) throw new SecurityBoundaryError("symlink_rejected");
  const real = realpathSync(target);
  if (!inside(allowedRepo, real) && !inside(allowedTmp, real)) throw new SecurityBoundaryError("output_dir_not_allowed");
  return real;
}

export function writeReports(root, requested, report, gate) {
  const dir = resolveOutputDir(root, requested);
  const files = {
    "editorial-trust-report.json": stableJson({ ...report, gate }),
    "editorial-trust-report.csv": toCsv(report),
    "editorial-trust-report.md": toMarkdown(report, gate),
  };
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content, "utf8");
  return Object.keys(files).map((name) => path.join(dir, name));
}
