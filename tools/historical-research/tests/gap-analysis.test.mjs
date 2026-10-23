import test from "node:test";
import assert from "node:assert/strict";
import { analyzeGaps, recordYearRange } from "../lib/gap-analysis.mjs";
import { makeArchiveRecord } from "./helpers.mjs";

test("arşiv kayıt sayısı analizi: durum dağılımı doğru sayılır", () => {
  const records = [
    makeArchiveRecord({ verification: { ...makeArchiveRecord().verification, status: "published" } }),
    makeArchiveRecord({ verification: { ...makeArchiveRecord().verification, status: "published" } }),
    makeArchiveRecord({ verification: { ...makeArchiveRecord().verification, status: "reviewed" } }),
    makeArchiveRecord({ verification: { ...makeArchiveRecord().verification, status: "draft" } }),
  ];
  const report = analyzeGaps(records, { targetStart: 1881, targetEnd: 1918 });
  assert.equal(report.counts.total, 4);
  assert.equal(report.counts.published, 2);
  assert.equal(report.counts.reviewed, 1);
  assert.equal(report.counts.draft, 1);
});

test("yıl aralığı analizi: kayıtlar yıl aralıklarına doğru dağıtılır", () => {
  const records = [
    makeArchiveRecord({ date: { start: "1923-01-01", end: null, precision: "day", certainty: "exact", display: "1923" } }),
    makeArchiveRecord({ date: { start: "1919-05-19", end: "1919-06-20", precision: "range", certainty: "exact", display: "1919" } }),
    makeArchiveRecord({ date: { start: null, end: null, precision: "unknown", certainty: "unknown", display: "?" } }),
  ];
  const report = analyzeGaps(records);
  assert.equal(recordYearRange(records[1]).start, 1919);
  assert.equal(recordYearRange(records[1]).end, 1919);
  assert.equal(report.recordsByYear[1923], 1);
  // tarih aralığı (range) 1919-05-19 → 1919-06-20 aynı yıl: 1 kayıt-yıl
  assert.equal(report.recordsByYear[1919], 1);
  // tarihsiz kayıt yıl dağılımına girmez
  assert.equal(report.recordsByYear[undefined], undefined);
});

test("yıl aralığı: çok yıllı kayıt her kapsadığı yıla işlenir", () => {
  const records = [
    makeArchiveRecord({ date: { start: "1911-10-01", end: "1913-07-01", precision: "range", certainty: "exact", display: "1911–1913" } }),
  ];
  const report = analyzeGaps(records);
  assert.equal(report.recordsByYear[1911], 1);
  assert.equal(report.recordsByYear[1912], 1);
  assert.equal(report.recordsByYear[1913], 1);
});

test("eksik dönem tespiti: hedef dönemde boş yıllar bulunur", () => {
  const records = [
    makeArchiveRecord({ date: { start: "1915-03-18", end: null, precision: "day", certainty: "exact", display: "1915" } }),
    makeArchiveRecord({ date: { start: "1918-10-31", end: null, precision: "day", certainty: "exact", display: "1918" } }),
  ];
  const report = analyzeGaps(records, { targetStart: 1881, targetEnd: 1918 });
  // 1881-1914 ve 1916-1917 boş
  const first = report.missingRanges.find((range) => range.start === 1881);
  assert.ok(first, "1881'den başlayan boşluk bulunmalı");
  assert.equal(first.end, 1914);
  const second = report.missingRanges.find((range) => range.start === 1916);
  assert.ok(second, "1916 boşluğu bulunmalı");
  assert.equal(second.end, 1917);
});

test("eksik dönem: rapor 'olay yok' demez, yöntem notu taşır", () => {
  const report = analyzeGaps([], { targetStart: 1881, targetEnd: 1885 });
  assert.equal(report.counts.total, 0);
  assert.ok(report.notes.some((note) => note.code === "GAP_METHODOLOGY"));
  assert.match(report.notes[0].message, /olay yok.*anlamına gelmez|kayıt yoğunluğunu ölçer/);
});

test("tema kapsamı: erken dönem temaları tespit edilir", () => {
  const earlyDate = (year) => ({ start: String(year), end: null, precision: "year", certainty: "estimated", display: String(year) });
  const records = [
    makeArchiveRecord({ date: earlyDate(1893), title: "Mustafa Kemal'in Selanik'te çocukluğu ve ailesi", summary: "Selanik", tags: [] }),
    makeArchiveRecord({ date: earlyDate(1915), title: "Çanakkale Savaşları: Anafartalar", summary: "Çanakkale", tags: [] }),
    // Hedef dönem DIŞINDA: tema sayımına girmemeli
    makeArchiveRecord({ date: earlyDate(1923), title: "Çanakkale konusunda sonraki dönem kaydı", summary: "", tags: [] }),
  ];
  const report = analyzeGaps(records);
  const cocukluk = report.themeCoverage.find((theme) => theme.theme === "cocukluk");
  const canakkale = report.themeCoverage.find((theme) => theme.theme === "canakkale");
  assert.ok(cocukluk.records >= 1);
  assert.ok(canakkale.records >= 1);
  // hiç kayıt düşmeyen tema "none" kalır
  const trablus = report.themeCoverage.find((theme) => theme.theme === "trablusgarp");
  assert.equal(trablus.coverage, "none");
});

test("tema eşleştirme: alt dizgi yanlış pozitifleri engellenir", () => {
  const earlyDate = (year) => ({ start: String(year), end: null, precision: "year", certainty: "estimated", display: String(year) });
  // 'yaşam' kelimesi 'şam' temasını tetiklememeli
  const records = [
    makeArchiveRecord({ date: earlyDate(1890), title: "Mustafa Kemal'in yaşam öyküsü", summary: "", tags: [] }),
  ];
  const report = analyzeGaps(records);
  const sam = report.themeCoverage.find((theme) => theme.theme === "sam");
  assert.equal(sam.records, 0, "'yaşam' kelimesi 'şam' temasını tetiklememeli");
  // 'devlet' kelimesi 'ev' veya 'kisiler' temasını tetiklememeli
  const records2 = [
    makeArchiveRecord({ date: earlyDate(1890), title: "Osmanlı devlet yapısı", summary: "", tags: [] }),
  ];
  const report2 = analyzeGaps(records2);
  assert.equal(report2.themeCoverage.find((t) => t.theme === "mekanlar").records, 0, "'devlet' kelimesi 'ev' tema aramasını tetiklememeli");
  // 'Ankara'da Muş depremi' gibi metin 'muş' alt dizgisiyle dogu-cephesi vermemeli
  const records3 = [
    makeArchiveRecord({ date: earlyDate(1890), title: "Ankara'da bir yıl", summary: "", tags: [] }),
  ];
  const report3 = analyzeGaps(records3);
  assert.equal(report3.themeCoverage.find((t) => t.theme === "dogu-cephesi").records, 0, "'muş' alt dizgisi tema tetiklememeli");
});

test("hedef dönem ölçümü: ayrı kayıt ve kayıt-yıl örneklemi ayrı raporlanır", () => {
  const earlyDate = (year) => ({ start: String(year), end: null, precision: "year", certainty: "estimated", display: String(year) });
  const rangeDate = { start: "1911", end: "1913", precision: "range", certainty: "exact", display: "1911–1913" };
  const records = [
    makeArchiveRecord({ date: rangeDate }), // 1 kayıt → 3 kayıt-yıl
    makeArchiveRecord({ date: earlyDate(1915) }),
    makeArchiveRecord({ date: earlyDate(1923) }), // dönem dışı
  ];
  const report = analyzeGaps(records, { targetStart: 1881, targetEnd: 1918 });
  assert.equal(report.targetPeriod.distinctRecords, 2);
  assert.equal(report.targetPeriod.recordYearIncidences, 4);
  assert.equal(report.targetPeriod.share, Number((2 / 3).toFixed(4)));
  // Çok yıllı kayıt payı %100'ü AŞAMAZ (ayrı kayıt bazında hesap)
  const onlyMultiYear = [makeArchiveRecord({ date: rangeDate })];
  const report2 = analyzeGaps(onlyMultiYear, { targetStart: 1881, targetEnd: 1918 });
  assert.ok(report2.targetPeriod.share <= 1);
});

test("boş veri kümesi: hata fırlatmadan sıfır rapor üretilir", () => {
  const report = analyzeGaps([], { targetStart: 1881, targetEnd: 1918 });
  assert.equal(report.counts.total, 0);
  assert.equal(report.missingRanges.length, 1);
  assert.equal(report.missingRanges[0].start, 1881);
  assert.equal(report.missingRanges[0].end, 1918);
  assert.equal(report.targetPeriod.share, 0);
});
