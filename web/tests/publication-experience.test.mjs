import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

import { isValidMonthDay, prepareTodayBrief } from "../lib/publishing/today.ts";
import {
  isPubliclyVisible,
  validatePublication,
} from "../lib/publishing/model.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const now = "2026-10-24T12:00:00Z";

function createMockPublication(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id: "test-yayin-001",
    slug: "test-yayin-001",
    kind: "sourced_article",
    title: "Cumhuriyet ve Hukuk Devrimi",
    summary: "Cumhuriyetin ilk yıllarındaki anayasal dönüşümün birincil kaynak analizi.",
    body: [
      { type: "paragraph", text: "Kaynaklara dayalı akademik inceleme içeriği." },
    ],
    category: "Cumhuriyet",
    tags: ["Cumhuriyet", "Hukuk"],
    authors: ["Araştırma Kurulu"],
    bibliography: [
      {
        id: "atam-001",
        title: "Atatürk Ansiklopedisi: 1924 Anayasası",
        institution: "Atatürk Araştırma Merkezi",
        url: "https://ataturkansiklopedisi.gov.tr/detay/1924",
        accessedAt: "2026-10-24",
      },
    ],
    relatedArchiveIds: ["1924-anayasasi"],
    rights: {
      license: "CC BY 4.0",
      holder: "Asrın Kemali Kültür Platformu",
      note: "Kaynak gösterilerek alıntılanabilir.",
    },
    status: "draft",
    approval: null,
    scheduledAt: null,
    publishedAt: null,
    automation: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockArchiveEvent(overrides = {}) {
  return {
    id: "cumhuriyetin-ilani-1923",
    slug: "cumhuriyetin-ilani-1923",
    title: "Cumhuriyet'in İlanı",
    type: "event",
    summary: "29 Ekim 1923'te Cumhuriyet ilan edildi.",
    date: {
      start: "1923-10-29",
      end: null,
      precision: "day",
      certainty: "exact",
      display: "29 Ekim 1923",
    },
    source: {
      title: "TBMM Zabıt Ceridesi",
      institution: "TBMM Açık Erişim Arşivi",
      url: "https://tbmm.gov.tr/zabit",
      accessedAt: "2026-10-24",
    },
    verification: { status: "published" },
    ...overrides,
  };
}

describe("Task 27: Yayınlar ve Tarihte Bugün Deneyimi — Birim Testleri", () => {
  test("Yayın bileşenleri ve sözleşmeleri eksiksiz mevcuttur", () => {
    const components = [
      "PublicationFilters.tsx",
      "PublicationCard.tsx",
      "PublicationEmptyState.tsx",
      "TodayDateSelector.tsx",
      "TodayEventCard.tsx",
      "SourceCitation.tsx",
      "index.ts",
    ];

    for (const comp of components) {
      const fullPath = path.join(root, "components", "publication-experience", comp);
      assert.equal(existsSync(fullPath), true, `Bileşen eksik: ${comp}`);
    }
  });

  // [T-27-001 - T-27-005] Yayın Görünürlük ve Yayın Kapısı
  test("[T-27-001] Kayıt yokken boş durum kartı üretilir ve taslak sızmaz", () => {
    const emptyBrief = prepareTodayBrief([], 10, 29);
    assert.equal(emptyBrief.candidates.length, 0);
    assert.match(emptyBrief.message, /yayın kapısından geçmiş kaynaklı olay bulunmuyor/i);
  });

  test("[T-27-002] Taslak yayın (status=draft) asla kamuya açık görünmez", () => {
    const draft = createMockPublication({ status: "draft" });
    assert.equal(isPubliclyVisible(draft), false);
  });

  test("[T-27-003] Sadece zamanlanmış (scheduled) yayın kamuya açık görünmez", () => {
    const scheduled = createMockPublication({
      status: "scheduled",
      scheduledAt: "2026-10-25T10:00:00Z",
      approval: { kind: "human", approvedBy: "Tarihçi Editör", approvedAt: now },
    });
    assert.equal(isPubliclyVisible(scheduled), false);
  });

  test("[T-27-004] AI taslağı (automation mode) tek başına yayın sayılmaz", () => {
    const aiDraft = createMockPublication({
      status: "draft",
      automation: {
        mode: "ai_assisted",
        provider: "yerel-adapter",
        model: "llm-v1",
        sourceArchiveIds: ["1924-anayasasi"],
        maxCostCents: 10,
        actualCostCents: 2,
      },
    });
    assert.equal(isPubliclyVisible(aiDraft), false);
  });

  test("[T-27-005] İnsan editör onayı bulunmayan published yayın reddedilir", () => {
    const unapproved = createMockPublication({
      status: "published",
      publishedAt: now,
      approval: null, // Eksik onay
    });
    const validation = validatePublication(unapproved);
    assert.equal(validation.ok, false);
    assert.equal(isPubliclyVisible(unapproved), false);
    assert.ok(validation.errors.some((e) => e.includes("insan editör onayı")));
  });

  // [T-27-013 - T-27-015] Yayın Detay Sayfası ve Kaynak Güvenliği
  test("[T-27-013] Publication id ile slug güvenli karakter sınırlarına uymalıdır", () => {
    const invalidSlug = createMockPublication({ slug: "Geçersiz Slug İle Boşluk" });
    const val = validatePublication(invalidSlug);
    assert.equal(val.ok, false);
    assert.ok(val.errors.some((e) => e.includes("güvenli küçük harf")));
  });

  test("[T-27-015] Kaynakça URL'lerinde yalnızca HTTPS protokolüne izin verilir (javascript/http reddi)", () => {
    const insecureHttp = createMockPublication({
      bibliography: [
        {
          id: "b1",
          title: "Güvensiz Bağlantı",
          institution: "Kurum",
          url: "http://insecure.org/test",
          accessedAt: "2026-10-24",
        },
      ],
    });
    const valHttp = validatePublication(insecureHttp);
    assert.equal(valHttp.ok, false);
    assert.ok(valHttp.errors.some((e) => e.includes("HTTPS")));

    const xssJs = createMockPublication({
      bibliography: [
        {
          id: "b2",
          title: "XSS Saldırısı",
          institution: "Kurum",
          url: "javascript:alert(1)",
          accessedAt: "2026-10-24",
        },
      ],
    });
    const valJs = validatePublication(xssJs);
    assert.equal(valJs.ok, false);
    assert.ok(valJs.errors.some((e) => e.includes("HTTPS")));
  });

  // [T-27-021 - T-27-030] Tarihte Bugün Takvim Doğruluğu
  test("[T-27-021] 31 Şubat takvim kontrolünde kesinlikle reddedilir", () => {
    assert.equal(isValidMonthDay(2, 31), false);
    assert.throws(() => prepareTodayBrief([], 2, 31), /geçerli aralıkta/);
  });

  test("[T-27-022] 31 Nisan takvim kontrolünde kesinlikle reddedilir (Nisan 30 gündür)", () => {
    assert.equal(isValidMonthDay(4, 31), false);
    assert.throws(() => prepareTodayBrief([], 4, 31), /geçerli aralıkta/);
  });

  test("[T-27-023] 29 Şubat artık yıl takvim kontrolünde kabul edilir", () => {
    assert.equal(isValidMonthDay(2, 29), true);
    assert.doesNotThrow(() => prepareTodayBrief([], 2, 29));
  });

  test("[T-27-024] 0. ay ve 0. gün takvim kontrolünde reddedilir", () => {
    assert.equal(isValidMonthDay(0, 15), false);
    assert.equal(isValidMonthDay(5, 0), false);
    assert.equal(isValidMonthDay(0, 0), false);
  });

  test("[T-27-025] 13. ay takvim kontrolünde reddedilir", () => {
    assert.equal(isValidMonthDay(13, 1), false);
    assert.throws(() => prepareTodayBrief([], 13, 1), /geçerli aralıkta/);
  });

  test("[T-27-027] Hassasiyeti ay (month) olan kayıtlar Tarihte Bugün seçkisine dahil edilmez", () => {
    const monthPrecision = createMockArchiveEvent({
      date: { start: "1923-10-01", precision: "month", display: "Ekim 1923" },
    });
    const brief = prepareTodayBrief([monthPrecision], 10, 1);
    assert.equal(brief.candidates.length, 0);
  });

  test("[T-27-028] Hassasiyeti yıl (year) olan kayıtlar Tarihte Bugün seçkisine dahil edilmez", () => {
    const yearPrecision = createMockArchiveEvent({
      date: { start: "1923-01-01", precision: "year", display: "1923" },
    });
    const brief = prepareTodayBrief([yearPrecision], 1, 1);
    assert.equal(brief.candidates.length, 0);
  });

  test("[T-27-029] Durumu reviewed veya draft olan arşiv olayları Tarihte Bugün listesine giremez", () => {
    const reviewedEvent = createMockArchiveEvent({
      verification: { status: "reviewed" },
    });
    const draftEvent = createMockArchiveEvent({
      verification: { status: "draft" },
    });
    const brief = prepareTodayBrief([reviewedEvent, draftEvent], 10, 29);
    assert.equal(brief.candidates.length, 0);
  });

  test("[T-27-030] Olay bulunmayan gün için 'tarihî olay yok' iddiası kurulmaz, dürüst boş durum mesajı verilir", () => {
    const brief = prepareTodayBrief([], 1, 1);
    assert.equal(brief.candidates.length, 0);
    assert.equal(brief.message, "Bu gün için yayın kapısından geçmiş kaynaklı olay bulunmuyor.");
    assert.doesNotMatch(brief.message, /olay olmamıştır|tarihî olay yoktur/i);
  });

  // [T-27-031] Europe/Istanbul saat dilimi formatı
  test("[T-27-031] Europe/Istanbul saat dilimi geçerli gün ve ay değerleri üretir", () => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Istanbul",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date());

    const month = Number(parts.find((p) => p.type === "month")?.value);
    const day = Number(parts.find((p) => p.type === "day")?.value);

    assert.ok(month >= 1 && month <= 12);
    assert.ok(day >= 1 && day <= 31);
    assert.equal(isValidMonthDay(month, day), true);
  });

  // [T-27-050] CSS Modülü ve Tipografik Bütçe
  test("[T-27-050] publishing.module.css boş durum, baskı ve responsive kurallarını içerir", () => {
    const css = readFileSync(path.join(root, "app", "publishing.module.css"), "utf8");
    assert.match(css, /\.emptyState/);
    assert.match(css, /\.emptyPrimaryBtn/);
    assert.match(css, /\.emptySecondaryBtn/);
    assert.match(css, /@media\s+print/);
    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
    assert.match(css, /@media\s*\(max-width:\s*380px\)/);
  });
});
