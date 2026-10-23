import test from "node:test";
import assert from "node:assert/strict";
import { gapReportToMarkdown, poolToMarkdown, poolToCsv, writeReport } from "../lib/report.mjs";
import { analyzeGaps } from "../lib/gap-analysis.mjs";
import { poolSummary } from "../lib/candidates.mjs";
import { makeCandidate, makeSyntheticRecords } from "./helpers.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

test("boşluk raporu Markdown çıktısı bölümler içerir", () => {
  const report = analyzeGaps(makeSyntheticRecords(10), { targetStart: 1881, targetEnd: 1918 });
  const markdown = gapReportToMarkdown(report);
  assert.match(markdown, /# Arşiv Boşluk Analizi Raporu/);
  assert.match(markdown, /## Yıl Dağılımı/);
  assert.match(markdown, /## Tema Kapsamı/);
  assert.match(markdown, /## Yöntem Notları/);
});

test("CSV doğrulama: ayırıcılar ve tırnak kaçışları güvenli üretilir", () => {
  const pool = [
    makeCandidate({ title: 'Virgül, "tırnak" içeren başlık' }),
    makeCandidate({ id: "src-2026-0002", title: "Normal başlık", url: "https://ornek.gov.tr/2", archiveIdentifier: "AYK-2" }),
  ];
  const csv = poolToCsv(pool);
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 3); // başlık + 2 satır (satır sonu hücre dışına kaçmaz)
  assert.equal(lines[0].split(",").length, 14);
  // Tırnak içeren hücre çift tırnakla kaçışlanır
  assert.ok(csv.includes('"Virgül, ""tırnak""'));
});

test("CSV doğrulama: üretilen CSV geri ayrıştırılabilir", () => {
  const pool = [makeCandidate()];
  const csv = poolToCsv(pool);
  const [header, row] = csv.trim().split("\n");
  assert.equal(header.split(",").length, 14);
  // En basit ayrıştırma: tüm satır tek hücre değil, 14 alan var
  const fields = row.match(/("([^"]|"")*"|[^,]*)/g);
  assert.ok(fields.length >= 14);
});

test("JSON doğrulama: rapor serileştirilebilir ve geri okunabilir", () => {
  const report = analyzeGaps(makeSyntheticRecords(5));
  const json = JSON.stringify(report, null, 2);
  const parsed = JSON.parse(json);
  assert.equal(parsed.counts.total, 5);
  assert.deepEqual(parsed.counts, report.counts);
});

test("havuz Markdown raporu uyarı notu taşır", () => {
  const pool = [makeCandidate()];
  const markdown = poolToMarkdown(pool, poolSummary(pool));
  assert.match(markdown, /YAYIMLANMIŞ ARŞİV DEĞİLDİR|yayımlanmış arşiv DEĞİLDİR/);
  assert.match(markdown, /insan onayı olmadan arşive aktarılmaz/);
});

test("rapor yazımı: korumalı arşiv yollarına yazılamaz", async () => {
  await assert.rejects(
    () => writeReport("data/archive/catalog/rapor.json", "içerik"),
    /Korumalı arşiv yoluna yazma reddedildi/
  );
});

test("rapor yazımı: geçici dizine yazılıp okunabilir", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mka-test-"));
  const target = path.join(dir, "rapor.md");
  await writeReport(target, "# Deneme");
  const content = await fs.readFile(target, "utf8");
  assert.match(content, /# Deneme/);
  await fs.rm(dir, { recursive: true, force: true });
});
