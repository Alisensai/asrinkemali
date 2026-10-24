/**
 * Test yardımcıları.
 *
 * Gerçek şema ve taksonomi yüklenir; böylece testler üretim sözleşmesinden
 * kopmaz. Örnek kayıtlar yalnızca bellek içinde üretilir, diske yazılmaz.
 */

import { loadArchive } from "../lib/load.mjs";
import { validateArchive } from "../lib/validate.mjs";

const SOURCE_URL = "https://ataturkansiklopedisi.gov.tr/detay/1/Ornek-Kayit";

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)]));
  }
  return value;
}

function merge(base, overrides) {
  if (overrides === undefined) return clone(base);
  if (Array.isArray(overrides)) return clone(overrides);
  if (overrides && typeof overrides === "object" && base && typeof base === "object" && !Array.isArray(base)) {
    const result = clone(base);
    for (const [key, value] of Object.entries(overrides)) {
      result[key] = merge(base[key], value);
    }
    return result;
  }
  return clone(overrides);
}

export function makeRecord(overrides = {}) {
  const base = {
    schemaVersion: "1.0.0",
    id: "ornek-kayit",
    slug: "ornek-kayit",
    title: "Örnek Tarihsel Kayıt",
    type: "event",
    date: {
      start: "1923-10-29",
      end: null,
      precision: "day",
      certainty: "exact",
      display: "29 Ekim 1923",
    },
    people: [],
    locations: [
      {
        name: "Ankara",
        city: "Ankara",
        country: "Türkiye",
      },
    ],
    categories: ["cumhuriyet"],
    summary: "Bu kayıt, doğrulama testlerinde kullanılan örnek bir arşiv kaydıdır.",
    description: "Bu açıklama yalnızca testlerde kullanılan örnek bir arşiv kaydına aittir.",
    source: {
      institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
      institutionType: "institutional",
      institutionUrl: "https://ataturkansiklopedisi.gov.tr/",
      title: "Atatürk Ansiklopedisi: Örnek Kayıt",
      url: SOURCE_URL,
      accessedAt: "2026-10-23",
      publishedAt: null,
      archiveIdentifier: "1",
      note: "Test amaçlı kurumsal kaynak kaydı.",
    },
    provenance: [
      {
        institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
        collection: "Atatürk Ansiklopedisi",
        identifier: "1",
        url: SOURCE_URL,
        accessedAt: "2026-10-23",
        note: "Test amaçlı provenans kaydı.",
      },
    ],
    rights: {
      status: "official_link_only",
      license: null,
      licenseUrl: null,
      termsUrl: null,
      credit: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
      imageReuse: "not_downloaded",
      note: "Test amaçlı hak kaydı; yeniden kullanım lisansı doğrulanmadı.",
    },
    image: null,
    verification: {
      status: "published",
      reviewedBy: "Test denetçisi",
      reviewedAt: "2026-10-23",
      checks: {
        sourceReachable: true,
        dateVerified: true,
        rightsVerified: true,
        quoteVerified: false,
        duplicateChecked: true,
      },
      notes: "Test amaçlı doğrulama kaydı.",
    },
    tags: ["örnek"],
    relatedIds: [],
    createdAt: "2026-10-23T00:00:00Z",
    updatedAt: "2026-10-23T00:00:00Z",
  };
  return merge(base, overrides);
}

export function makeQuotation(overrides = {}) {
  const base = {
    text: "Egemenlik kayıtsız şartsız milletindir.",
    speaker: "Mustafa Kemal Atatürk",
    work: "TBMM Konuşması",
    date: "1923-10-29",
    context: "Test için hazırlanmış, tarih ve bağlamı belirtilmiş örnek alıntı.",
    sourceUrl: SOURCE_URL,
    sourceTitle: "Atatürk Ansiklopedisi: Örnek Kayıt",
    evidence: {
      sourceExcerpt: "Egemenlik kayıtsız şartsız milletindir. Bu ilke TBMM'nin temel dayanağıdır.",
      retrievedAt: "2026-10-23",
      verifiedBy: "Test denetçisi",
      method: "institutional_transcription",
      note: "Test amaçlı kaynak pasajı.",
    },
    verified: true,
  };
  return merge(base, overrides);
}

export function makeImage(overrides = {}) {
  const base = {
    kind: "digitized_original",
    url: null,
    sourcePageUrl: SOURCE_URL,
    alt: "Test için tanımlanmış tarihsel fotoğraf",
    credit: "Atatürk Ansiklopedisi",
    width: null,
    height: null,
    mimeType: null,
    localPath: null,
    displayPolicy: "source_link_only",
  };
  return merge(base, overrides);
}

export async function loadTestContext() {
  const archive = await loadArchive();
  return archive;
}

export async function validateFixture(records, archive, options = {}) {
  return validateArchive({
    records,
    taxonomy: archive.taxonomy,
    recordSchema: archive.recordSchema,
    taxonomySchema: archive.taxonomySchema,
    root: archive.root,
    ...options,
  });
}

export function errorCodes(result) {
  return result.errors.map((error) => error.code);
}

export function warningCodes(result) {
  return result.warnings.map((warning) => warning.code);
}
