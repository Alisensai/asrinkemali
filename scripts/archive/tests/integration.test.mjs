import test from "node:test";
import assert from "node:assert/strict";

import { loadArchive } from "../lib/load.mjs";
import { validateArchive } from "../lib/validate.mjs";
import { searchRecords } from "../lib/search.mjs";
import { todayInHistory, NO_RECORDS_MESSAGE } from "../lib/today.mjs";

const archive = await loadArchive();
const records = archive.records;

test("örnek arşiv 12-20 kayıt ve altı türü kapsar", () => {
  assert.ok(records.length >= 12 && records.length <= 20);
  assert.deepEqual(
    [...new Set(records.map((record) => record.type))].sort(),
    ["document", "event", "photograph", "place", "publication", "speech"].sort()
  );
  assert.equal(new Set(records.map((record) => record.id)).size, records.length);
});

test("yayımlanmış kayıtlar kaynak, provenans ve yayın haklarına sahiptir", () => {
  const publishableRights = new Set([
    "public_domain",
    "open_license",
    "official_link_only",
    "institutional_terms",
  ]);
  const published = records.filter((record) => record.verification.status === "published");
  assert.equal(published.length, 15);
  for (const record of published) {
    assert.ok(record.source?.url, `${record.id}: kaynak URL'si yok`);
    assert.ok(record.provenance?.some((item) => item.url === record.source.url), `${record.id}: kaynak provenansta yok`);
    assert.ok(publishableRights.has(record.rights.status), `${record.id}: yayın hakları uygun değil`);
    assert.ok(record.verification.reviewedBy, `${record.id}: inceleyen yok`);
    assert.ok(record.verification.reviewedAt, `${record.id}: inceleme tarihi yok`);
    assert.ok(record.date.start, `${record.id}: yayın için tarih yok`);
    for (const [key, value] of Object.entries(record.verification.checks)) {
      if (key === "quoteVerified" && !record.quotation) {
        assert.equal(value, false, `${record.id}: alıntısız kayıtta quoteVerified false olmalı`);
      } else {
        assert.equal(value, true, `${record.id}: ${key} true olmalı`);
      }
    }
  }
});

test("alıntılar yalnızca doğrulanmış kayıtlarda ve kaynak kanıtıyla bulunur", () => {
  const quoted = records.filter((record) => record.quotation);
  assert.equal(quoted.length, 1);
  for (const record of quoted) {
    assert.equal(record.verification.status, "published");
    assert.equal(record.quotation.verified, true);
    assert.equal(record.verification.checks.quoteVerified, true);
    assert.equal(record.quotation.speaker, "Mustafa Kemal Atatürk");
    assert.ok(record.quotation.date);
    assert.ok(record.quotation.context.length >= 20);
    assert.ok(record.quotation.evidence.sourceExcerpt.includes(record.quotation.text));
    assert.equal(record.quotation.date, record.date.start);
  }
});

test("hiçbir görsel indirilmemiş; yalnızca kaynak sayfaya bağlantı var", () => {
  for (const record of records) {
    if (!record.image) continue;
    assert.equal(record.image.localPath, null, `${record.id}: yerel görsel yolu var`);
    assert.ok(["not_downloaded", "link_only"].includes(record.rights.imageReuse), `${record.id}: görsel kullanımı`);
    assert.equal(record.image.url, null, `${record.id}: doğrudan görsel URL'si var`);
    assert.ok(record.image.sourcePageUrl, `${record.id}: kaynak sayfası yok`);
    assert.equal(record.image.displayPolicy, "source_link_only", `${record.id}: gösterim politikası`);
  }
});

test("23 Ekim için doğrulanmış kayıt yoktur ve sabit mesaj döner", () => {
  const result = todayInHistory(records, "2026-10-23");
  assert.deepEqual(result.records, []);
  assert.equal(result.message, NO_RECORDS_MESSAGE);
  assert.equal(result.message, "Bugün için doğrulanmış kayıt eklenmedi");
});

test("Tarihte Bugün yalnızca gerçek takvim günü eşleşmelerini döndürür", () => {
  const cumhuriyet = todayInHistory(records, "2026-10-29");
  assert.deepEqual(cumhuriyet.records.map((record) => record.id), ["cumhuriyetin-ilani-1923"]);

  const withSpeech = todayInHistory(records, "2026-10-29", { types: ["event", "speech"] });
  assert.deepEqual(
    withSpeech.records.map((record) => record.id),
    ["cumhuriyetin-ilani-1923", "onuncu-yil-nutku-1933"]
  );

  const kasim = todayInHistory(records, "2026-11-01");
  assert.deepEqual(
    kasim.records.map((record) => record.id),
    ["saltanatin-kaldirilmasi-1922", "harf-devrimi-1928"]
  );

  const nisan = todayInHistory(records, "2026-04-23");
  assert.deepEqual(nisan.records.map((record) => record.id), ["tbmm-acilisi-1920"]);
});

test("Türkçe arama gerçek arşivde ı/i, İ/i ve ş/s eşitlemesiyle çalışır", () => {
  assert.ok(searchRecords(records, "istiklal").length >= 1);
  assert.ok(searchRecords(records, "İSTİKLAL").length >= 1);
  assert.ok(searchRecords(records, "sisli").length === 0);
  assert.ok(searchRecords(records, "kadin").some((hit) => hit.record.id === "kadinlara-secme-secilme-hakki-1934"));
  assert.ok(searchRecords(records, "KADIN").some((hit) => hit.record.id === "kadinlara-secme-secilme-hakki-1934"));
  assert.ok(searchRecords(records, "meclis").length >= 3);
});

test("kategori, tür ve yıl süzgeçleri gerçek arşivde çalışır", () => {
  assert.ok(searchRecords(records, "kategori:egitim").length >= 2);
  assert.ok(searchRecords(records, "tur:fotograf").length >= 2);
  assert.ok(searchRecords(records, "yil:1923").length >= 2);
  assert.ok(searchRecords(records, { year: 1923, type: "event" }).length >= 2);
  assert.ok(searchRecords(records, "etiket:TBMM").length >= 2);
  assert.equal(searchRecords(records, { q: "tur:fotograf", includeNonPublished: true }).length, 3);
});

test("doğrulama gerçek arşivde sıfır hata üretir", async () => {
  const result = await validateArchive({
    records,
    taxonomy: archive.taxonomy,
    recordSchema: archive.recordSchema,
    taxonomySchema: archive.taxonomySchema,
    root: archive.root,
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.errors.length, 0);
  assert.equal(result.stats.total, records.length);
});
