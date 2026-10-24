import test from "node:test";
import assert from "node:assert/strict";

import {
  loadTestContext,
  makeImage,
  makeQuotation,
  makeRecord,
  validateFixture,
  errorCodes,
  warningCodes,
} from "./helpers.mjs";

const archive = await loadTestContext();

function codes(result) {
  return errorCodes(result);
}

test("gerçek arşiv 168 kayıtla temiz doğrulanır", async () => {
  const result = await validateFixture(archive.records, archive);
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.stats.total, 168);
  assert.equal(result.stats.byStatus.published, 151);
  assert.equal(result.stats.byStatus.reviewed, 16);
  assert.equal(result.stats.byStatus.draft, 1);
  assert.deepEqual(result.stats.byType, {
    photograph: 9,
    document: 35,
    speech: 2,
    event: 69,
    publication: 35,
    place: 18,
  });
  assert.equal(result.stats.withQuotation, 2);
  assert.equal(result.stats.withImage, 21);
  assert.equal(result.stats.unknownDates, 1);
  assert.equal(result.stats.linkOnly, 150);
  assert.equal(result.stats.hostedFiles, 0);
  assert.equal(result.stats.metadataOnly, 0);
});

const V11_CITATION = "Atatürk Ansiklopedisi, “Örnek Kayıt”, erişim 23.10.2026.";

test("1.1.0 kaydı kaynak künyesi ve barındırma bilgisi ister", async () => {
  const record = makeRecord({ schemaVersion: "1.1.0" });
  const result = await validateFixture([record], archive);
  assert.ok(codes(result).includes("KAYNAK_KUNYE"));
  assert.ok(codes(result).includes("KAYIT_BARINDIRMA"));
});

test("dış bağlantı modunda dosya yolu kabul edilmez", async () => {
  const record = makeRecord({
    schemaVersion: "1.1.0",
    source: { citation: V11_CITATION },
    holding: {
      mode: "external_link",
      filePath: "data/archive/files/ornek.pdf",
      note: "Dış bağlantı modunda dosya yolu bulunmamalıdır.",
    },
  });
  const result = await validateFixture([record], archive);
  assert.ok(codes(result).includes("BARINDIRMA_DOSYA"));
});

test("barındırılan dosya güvenli yol ve açık hak gerektirir", async () => {
  const unsafe = makeRecord({
    schemaVersion: "1.1.0",
    source: { citation: V11_CITATION },
    holding: {
      mode: "hosted_file",
      filePath: "../ornek.pdf",
      note: "Dizin dışına çıkan dosya yolu denemesi.",
    },
  });
  const unsafeResult = await validateFixture([unsafe], archive);
  assert.ok(codes(unsafeResult).includes("BARINDIRMA_DOSYA"));

  const closedRights = makeRecord({
    schemaVersion: "1.1.0",
    source: { citation: V11_CITATION },
    holding: {
      mode: "hosted_file",
      filePath: "data/archive/files/ornek.pdf",
      note: "Telif durumu doğrulanmamış dosya.",
    },
  });
  const closedResult = await validateFixture([closedRights], archive);
  assert.ok(codes(closedResult).includes("BARINDIRMA_HAK"));
});

test("metadata_only modu dosya yolu kabul etmez ve istatistiklere yansır", async () => {
  const external = makeRecord({
    id: "dis-baglanti",
    slug: "dis-baglanti",
    title: "Dış Bağlantı Kaydı",
    schemaVersion: "1.1.0",
    source: { citation: V11_CITATION },
    holding: { mode: "external_link", filePath: null, note: "Yalnızca dış bağlantı." },
  });
  const hosted = makeRecord({
    id: "barindirilan",
    slug: "barindirilan",
    title: "Barındırılan Kayıt",
    schemaVersion: "1.1.0",
    source: { citation: V11_CITATION },
    rights: { status: "public_domain" },
    holding: {
      mode: "hosted_file",
      filePath: "data/archive/files/ornek.pdf",
      note: "Kamu malı olduğu varsayılan test dosyası.",
    },
  });
  const metadata = makeRecord({
    id: "yalniz-metadata",
    slug: "yalniz-metadata",
    title: "Yalnızca Metadata Kaydı",
    schemaVersion: "1.1.0",
    source: { citation: V11_CITATION },
    holding: { mode: "metadata_only", filePath: null, note: "Yalnızca künye." },
  });
  const badMetadata = makeRecord({
    id: "hatali-metadata",
    slug: "hatali-metadata",
    title: "Hatalı Metadata Kaydı",
    schemaVersion: "1.1.0",
    source: { citation: V11_CITATION },
    holding: {
      mode: "metadata_only",
      filePath: "data/archive/files/ornek.pdf",
      note: "Metadata modunda dosya yolu olmamalı.",
    },
  });

  const result = await validateFixture([external, hosted, metadata], archive);
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.stats.linkOnly, 1);
  assert.equal(result.stats.hostedFiles, 1);
  assert.equal(result.stats.metadataOnly, 1);

  const badResult = await validateFixture([badMetadata], archive);
  assert.ok(codes(badResult).includes("BARINDIRMA_DOSYA"));
});

test("alıntısız yayımlanmış kayıtta quoteVerified false kabul edilir", async () => {
  const record = makeRecord();
  assert.equal(record.verification.checks.quoteVerified, false);
  const result = await validateFixture([record], archive);
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
});

test("alıntı varsa quoteVerified true zorunludur", async () => {
  const record = makeRecord({ quotation: makeQuotation() });
  const result = await validateFixture([record], archive);
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes("ALINTI_DOGRULAMA"));
  assert.ok(codes(result).includes("YAYIN_KONTROL"));

  const verified = makeRecord({
    quotation: makeQuotation(),
    verification: { checks: { quoteVerified: true } },
  });
  const verifiedResult = await validateFixture([verified], archive);
  assert.equal(verifiedResult.ok, true, JSON.stringify(verifiedResult.errors, null, 2));
});

test("alıntı metni kaynak pasajında birebir bulunmalıdır", async () => {
  const record = makeRecord({
    quotation: makeQuotation({
      text: "Bu metin kaynak pasajında yer almıyor.",
      evidence: { sourceExcerpt: "Kaynak pasajı bambaşka bir cümle içeriyor." },
    }),
    verification: { checks: { quoteVerified: true } },
  });
  const result = await validateFixture([record], archive);
  assert.ok(codes(result).includes("ALINTI_KANIT"));
});

test("alıntı tarihi kayıt tarihiyle aynı olmalıdır", async () => {
  const record = makeRecord({
    quotation: makeQuotation({ date: "1923-10-30" }),
    verification: { checks: { quoteVerified: true } },
  });
  const result = await validateFixture([record], archive);
  assert.ok(codes(result).includes("ALINTI_TARIH"));
});

test("alıntı yokken quoteVerified true olamaz", async () => {
  const record = makeRecord({ verification: { checks: { quoteVerified: true } } });
  const result = await validateFixture([record], archive);
  assert.ok(codes(result).includes("YAYIN_ALINTI"));
});

test("yayın kapısı hak, kaynak ve tarih koşullarını uygular", async () => {
  const unknownRights = makeRecord({ rights: { status: "unknown" } });
  assert.ok(codes(await validateFixture([unknownRights], archive)).includes("HAK_YAYIN"));

  const otherSource = makeRecord({ source: { institutionType: "other" } });
  assert.ok(codes(await validateFixture([otherSource], archive)).includes("KAYNAK_TUR"));

  const rootUrl = "https://ataturkansiklopedisi.gov.tr/";
  const genericSource = makeRecord({
    source: { url: rootUrl },
    provenance: [{ url: rootUrl }],
  });
  assert.ok(codes(await validateFixture([genericSource], archive)).includes("KAYNAK_GENEL"));

  const monthlyEvent = makeRecord({
    date: { start: "1923-10-01", end: null, precision: "month", certainty: "exact", display: "Ekim 1923" },
  });
  assert.ok(codes(await validateFixture([monthlyEvent], archive)).includes("YAYIN_OLAY_TARIH"));

  const noReviewer = makeRecord({ verification: { reviewedBy: null } });
  assert.ok(codes(await validateFixture([noReviewer], archive)).includes("YAYIN_INCELEME"));
});

test("fotoğraf kaydı yayın için görsel nesnesi ister", async () => {
  const record = makeRecord({ type: "photograph", image: null });
  const result = await validateFixture([record], archive);
  assert.ok(codes(result).includes("GORSEL_EKSIK"));
  assert.ok(codes(result).includes("YAYIN_FOTOGRAF"));
});

test("görsel güvenlik kuralları: link-only ve AI temsili", async () => {
  const linked = makeRecord({
    type: "photograph",
    image: makeImage({ url: "https://ataturkansiklopedisi.gov.tr/detay/1/Ornek-Kayit" }),
    rights: { imageReuse: "link_only" },
  });
  const linkedResult = await validateFixture([linked], archive);
  assert.ok(codes(linkedResult).includes("GORSEL_LINK"));

  const ai = makeRecord({
    type: "photograph",
    image: makeImage({ kind: "ai_representative", alt: "Temsili yapay zekâ görseli", url: null }),
    rights: { status: "ai_representative", imageReuse: "ai_representative" },
  });
  const aiResult = await validateFixture([ai], archive);
  assert.ok(codes(aiResult).includes("AI_YAYIN"));
});

test("tekrar, taksonomi ve ilişki denetimleri", async () => {
  const base = makeRecord();
  const duplicateResult = await validateFixture([base, makeRecord()], archive);
  assert.ok(codes(duplicateResult).includes("TEKRAR_ID"));
  assert.ok(codes(duplicateResult).includes("TEKRAR_KAYIT"));

  const unknownCategory = makeRecord({ categories: ["bilinmeyen"] });
  assert.ok(codes(await validateFixture([unknownCategory], archive)).includes("TAKSONOMI_KATEGORI"));

  const unknownRelation = makeRecord({ relatedIds: ["olmayan-kayit"] });
  const relationResult = await validateFixture([unknownRelation], archive);
  assert.ok(warningCodes(relationResult).includes("ILISKI"));
  const strictResult = await validateFixture([unknownRelation], archive, { strict: true });
  assert.ok(codes(strictResult).includes("SIKI_KIP"));
});

test("kaynak URL'si provenansta yer almalıdır", async () => {
  const record = makeRecord({
    provenance: [{ url: "https://ataturkansiklopedisi.gov.tr/detay/2/Baska-Kayit" }],
  });
  const result = await validateFixture([record], archive);
  assert.ok(codes(result).includes("PROVENANS_URL"));
});

test("HTML ve güvenli olmayan URL'ler güvenlik katmanında yakalanır", async () => {
  const html = makeRecord({ title: "<script>alert(1)</script>" });
  assert.ok(codes(await validateFixture([html], archive)).includes("GUVENLIK_METIN"));

  const unsafeUrl = makeRecord({
    source: { url: "http://ataturkansiklopedisi.gov.tr/detay/1/Ornek-Kayit" },
    provenance: [{ url: "http://ataturkansiklopedisi.gov.tr/detay/1/Ornek-Kayit" }],
  });
  assert.ok(codes(await validateFixture([unsafeUrl], archive)).includes("GUVENLIK_URL"));
});

test("şema dışı alanlar ve geçersiz alan türleri raporlanır", async () => {
  const extra = makeRecord({ beklenmeyen: "alan" });
  const result = await validateFixture([extra], archive);
  assert.ok(codes(result).includes("SEMA"));

  const wrongType = makeRecord({ title: 42 });
  const wrongResult = await validateFixture([wrongType], archive);
  assert.ok(codes(wrongResult).includes("SEMA"));
});
