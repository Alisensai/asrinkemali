/**
 * Test fixture'ları. Gerçek arşive yazmaz; yalnızca bellek içi kayıt üretir.
 */

import { REPO_ROOT } from "../src/archive-context.mjs";

export const GENERATED_AT = "2026-10-23T00:00:00.000Z";

export function makeRecord(overrides = {}) {
  const base = {
    schemaVersion: "1.1.0",
    id: "test-record",
    title: "Test Kaydı",
    type: "event",
    summary: "Test amaçlı kayıt.",
    description: "Test amaçlı açıklama.",
    date: {
      start: "1920-04-23",
      end: null,
      precision: "day",
      certainty: "exact",
      display: "23 Nisan 1920",
      note: null,
    },
    people: [{ name: "Mustafa Kemal Atatürk", role: "subject" }],
    locations: [{ name: "Ankara", country: "Türkiye", latitude: 39.9334, longitude: 32.8597 }],
    tags: ["Test"],
    source: {
      institution: "Türkiye Büyük Millet Meclisi",
      institutionType: "official",
      institutionUrl: "https://www.tbmm.gov.tr/",
      title: "TBMM test kaynağı",
      url: "https://www.tbmm.gov.tr/test-kaynak",
      citation: "TBMM, \"Test Kaynağı\", erişim 23.10.2026, https://www.tbmm.gov.tr/test-kaynak.",
      accessedAt: "2026-10-23",
      publishedAt: null,
      archiveIdentifier: "TBMM-TEST",
      note: "Test kaynağı.",
    },
    provenance: [
      {
        institution: "Türkiye Büyük Millet Meclisi",
        collection: "Test koleksiyonu",
        identifier: "TBMM-TEST",
        url: "https://www.tbmm.gov.tr/test-kaynak",
        accessedAt: "2026-10-23",
        note: "Test provenansı.",
      },
    ],
    rights: {
      status: "official_link_only",
      license: null,
      licenseUrl: null,
      termsUrl: null,
      credit: "TBMM",
      imageReuse: "link_only",
      note: "Yalnızca kaynağa bağlantı.",
    },
    image: null,
    verification: {
      status: "reviewed",
      reviewedBy: "OpenCode arşiv denetimi (yapay zekâ)",
      reviewedAt: "2026-10-23",
      notes: "Test denetimi.",
      checks: {
        sourceReachable: true,
        dateVerified: true,
        duplicateChecked: true,
        quoteVerified: false,
        rightsVerified: false,
      },
    },
    createdAt: "2026-10-23T00:00:00.000Z",
    updatedAt: "2026-10-23T00:00:00.000Z",
  };
  return {
    ...base,
    ...overrides,
    date: overrides.date === null ? null : { ...base.date, ...(overrides.date ?? {}) },
    source: { ...base.source, ...(overrides.source ?? {}) },
    provenance: overrides.provenance ?? base.provenance,
    rights: { ...base.rights, ...(overrides.rights ?? {}) },
    verification: {
      ...base.verification,
      ...(overrides.verification ?? {}),
      checks: { ...base.verification.checks, ...(overrides.verification?.checks ?? {}) },
    },
    image: overrides.image === undefined ? base.image : overrides.image,
  };
}

export function makeImageRecord(overrides = {}) {
  return makeRecord({
    type: "photograph",
    image: {
      kind: "digitized_original",
      url: "https://cdn.tbmm.gov.tr/test.jpg",
      sourcePageUrl: "https://www.tbmm.gov.tr/test-fotograf",
      alt: "Test fotoğrafı",
      credit: "TBMM",
      width: 1200,
      height: 800,
      mimeType: "image/jpeg",
      localPath: null,
      displayPolicy: "source_link_only",
    },
    ...overrides,
    rights: {
      status: "official_link_only",
      imageReuse: "link_only",
      credit: "TBMM",
      note: "Yalnızca kaynağa bağlantı.",
      ...(overrides.rights ?? {}),
    },
  });
}

export function makeContext(records) {
  return {
    root: REPO_ROOT,
    records,
    fileCount: records.length,
    errors: [],
    warnings: [],
    archive: { records, files: [], errors: [], warnings: [] },
  };
}

export function fakeResponse(status, { location = null, body = true } = {}) {
  return {
    status,
    headers: { get: (name) => (String(name).toLowerCase() === "location" ? location : null) },
    body: body ? { cancel: async () => {} } : null,
  };
}

export const EMPTY_CANDIDATE_FILE = Object.freeze({
  schemaVersion: "1.0.0",
  discoveredAt: null,
  status: "unverified",
  ingestPolicy: "manual_expert_verification_required",
  candidates: [],
});

export const EMPTY_HISTORY = Object.freeze({
  schemaVersion: "1.0.0",
  updatedAt: null,
  policy: "Test geçmişi.",
  sources: [],
});

export const EMPTY_OVERRIDES = Object.freeze({ schemaVersion: "1.0.0", overrides: {} });
