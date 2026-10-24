/**
 * Raporlama — JSON, CSV ve Markdown çıktıları.
 */

import { writeFileAtomic } from "./integration/safe-output.mjs";
import { assertNoCatalogWrite } from "./types.mjs";

/**
 * Boşluk raporunu Markdown'a çevirir.
 * @param {GapReport} report
 */
export function gapReportToMarkdown(report) {
  const lines = [];
  lines.push("# Arşiv Boşluk Analizi Raporu");
  lines.push("");
  lines.push(`- Toplam kayıt: **${report.counts.total}** (yayımlandı: ${report.counts.published}, incelendi: ${report.counts.reviewed}, taslak: ${report.counts.draft})`);
  lines.push(`- Hedef dönem: **${report.targetPeriod.targetStart}–${report.targetPeriod.targetEnd}**`);
  lines.push(`- Hedef dönemle kesişen AYRI kayıt: **${report.targetPeriod.distinctRecords}** (arşivin %${(report.targetPeriod.share * 100).toFixed(1)}'i)`);
  lines.push(`- Hedef dönem kayıt-yıl örnekleme: **${report.targetPeriod.recordYearIncidences}** (çok yıllı kayıtlar her yıl için bir örnek üretir)`);
  lines.push("");
  lines.push("## Yıl Dağılımı");
  lines.push("");
  lines.push("| Yıl | Kayıt |");
  lines.push("|---|---:|");
  const years = Object.keys(report.recordsByYear).map(Number).sort((a, b) => a - b);
  for (const year of years) {
    lines.push(`| ${year} | ${report.recordsByYear[year]} |`);
  }
  lines.push("");
  lines.push("## Tema Kapsamı");
  lines.push("");
  lines.push("| Tema | Kayıt | Kapsam |");
  lines.push("|---|---:|---|");
  for (const theme of report.themeCoverage) {
    lines.push(`| ${theme.label} | ${theme.records} | ${theme.coverage} |`);
  }
  lines.push("");
  lines.push("## Hedef Dönemde Boşluklar");
  lines.push("");
  if (report.missingRanges.length === 0) {
    lines.push("Boş yıl bulunamadı.");
  } else {
    lines.push("| Aralık | Not |");
    lines.push("|---|---|");
    for (const range of report.missingRanges) {
      lines.push(`| ${range.start}–${range.end} | ${range.note} |`);
    }
  }
  lines.push("");
  lines.push("## Yöntem Notları");
  lines.push("");
  for (const note of report.notes) {
    lines.push(`- **${note.code}:** ${note.message}`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Aday havuzunu Markdown'a çevirir.
 */
export function poolToMarkdown(pool, summary) {
  const lines = [];
  lines.push("# Kaynak Adayları Havuzu");
  lines.push("");
  lines.push("Bu havuz YAYIMLANMIŞ ARŞİV DEĞİLDİR. Hiçbir aday, insan onayı olmadan arşive aktarılmaz.");
  lines.push("");
  lines.push(`- Toplam aday: **${summary.total}** (sentetik: ${summary.synthetic})`);
  lines.push("");
  lines.push("## Durum Dağılımı");
  lines.push("");
  lines.push("| Durum | Aday |");
  lines.push("|---|---:|");
  for (const [state, count] of Object.entries(summary.byState)) {
    lines.push(`| ${state} | ${count} |`);
  }
  lines.push("");
  lines.push("## Adaylar");
  lines.push("");
  lines.push("| Kimlik | Başlık | Kurum | Dönem | Durum | Doğrulama |");
  lines.push("|---|---|---|---|---|---|");
  for (const candidate of pool) {
    const period = candidate.periodStart ? `${candidate.periodStart}–${candidate.periodEnd ?? ""}` : (candidate.eventYear ?? "—");
    const flags = [
      candidate.verification?.citationComplete ? "künye ✓" : "künye ✗",
      candidate.verification?.rightsKnown ? "hak bilgisi ✓" : "hak bilgisi ✗",
      candidate.verification?.humanReviewed ? "insan ✓" : "insan ✗",
    ].join(" ");
    lines.push(`| ${candidate.id} | ${candidate.title} | ${candidate.institution} | ${period} | ${candidate.state} | ${flags} |`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * CSV çıktısı (adaylar). Tırnak kaçışları güvenli uygulanır. Sütun kümesi,
 * `importCandidatesFromCsv` ile geri okunabilecek tam kümedir (dışa/içe aktarma uyumu).
 */
export function poolToCsv(pool) {
  const header = ["id", "title", "institution", "institutionType", "institutionUrl", "url", "authors", "publishedAt", "eventYear", "periodStart", "periodEnd", "documentType", "sourceNature", "researchThemes", "accessedAt", "archiveIdentifier", "citation", "synthetic"];
  const escape = (value) => {
    let text = String(value ?? "");
    // Görev 07: hesap tablosu formül enjeksiyonu (=, +, -, @, TAB, CR) nötrlenir.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const rows = [header.join(",")];
  for (const candidate of pool) {
    rows.push([
      candidate.id,
      candidate.title,
      candidate.institution,
      candidate.institutionType,
      candidate.institutionUrl,
      candidate.url,
      (candidate.authors ?? []).map((author) => author.name).join(";"),
      candidate.publishedAt ?? "",
      candidate.eventYear ?? "",
      candidate.periodStart ?? "",
      candidate.periodEnd ?? "",
      candidate.documentType,
      candidate.sourceNature,
      (candidate.researchThemes ?? []).join(";"),
      candidate.accessedAt,
      candidate.archiveIdentifier ?? "",
      candidate.citation ?? "",
      candidate.synthetic ? "true" : "false",
    ].map(escape).join(","));
  }
  return rows.join("\n") + "\n";
}

/** Raporu dosyaya yazar (korumalı yollar hariç). */
export async function writeReport(targetPath, content, options = {}) {
  assertNoCatalogWrite(targetPath);
  // Görev 07: izin listesi + realpath + atomik yazım (katalog dışı keyfî yollar da reddedilir).
  writeFileAtomic(targetPath, content, options);
}
