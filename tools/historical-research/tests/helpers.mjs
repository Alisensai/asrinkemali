/**
 * Test yardımcıları — örnek aday/kayıt üreticileri.
 */

export function makeCandidate(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id: "src-2026-0001",
    title: "Mustafa Kemal'in Selanik Çocukluğu",
    institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
    institutionType: "institutional",
    institutionUrl: "https://www.ataturkansiklopedisi.gov.tr/",
    url: "https://www.ataturkansiklopedisi.gov.tr/detay/1/ornek-madde",
    urlStatus: "reachable",
    urlCheckedAt: "2026-10-23",
    authors: [{ name: "Test Yazar" }],
    publishedAt: "2020-01-01",
    eventYear: 1893,
    periodStart: 1881,
    periodEnd: 1899,
    people: ["Mustafa Kemal Atatürk"],
    locations: ["Selanik"],
    documentType: "article",
    sourceNature: "secondary",
    researchThemes: ["cocukluk", "selanik"],
    rights: {
      status: "official_link_only",
      license: null,
      licenseUrl: null,
      termsUrl: null,
      credit: "Atatürk Ansiklopedisi",
      imageReuse: "not_downloaded",
      note: "Yalnızca bağlantı.",
    },
    accessedAt: "2026-10-23",
    verification: {
      urlReachable: true,
      citationComplete: true,
      rightsKnown: true,
      duplicateChecked: true,
      aiReviewed: true,
      humanReviewed: false,
      notes: "",
    },
    state: "awaiting_human_review",
    stateHistory: [{ state: "new", at: "2026-10-23T00:00:00Z" }],
    relatedArchiveIds: [],
    claims: [],
    archiveIdentifier: "AYK-1",
    citation: "Test Yazar, \"Madde\", Atatürk Ansiklopedisi, 2020.",
    synthetic: false,
    notes: null,
    ...overrides,
  };
}

export function makeArchiveRecord(overrides = {}) {
  return {
    schemaVersion: "1.1.0",
    id: "test-record-1",
    slug: "test-record-1",
    title: "Test kaydı",
    type: "event",
    date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" },
    people: [],
    locations: [],
    categories: ["kurulus"],
    summary: "Özet",
    source: {
      institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
      institutionType: "institutional",
      institutionUrl: "https://www.ataturkansiklopedisi.gov.tr/",
      title: "Test kaydı",
      url: "https://www.ataturkansiklopedisi.gov.tr/detay/1/ornek-madde",
      accessedAt: "2026-10-23",
      archiveIdentifier: "AYK-1",
    },
    verification: { status: "published", reviewedBy: "x", reviewedAt: "2026-10-23", checks: {}, notes: "" },
    ...overrides,
  };
}

/**
 * Sentetik aday üreticisi. Her üretilen aday `synthetic: true` taşır.
 */
export function makeSyntheticCandidates(count, seed = 1) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const year = 1881 + Math.floor(random() * 140);
    out.push(
      makeCandidate({
        id: `src-0000-${String(i + 1).padStart(4, "0")}`,
        title: `Sentetik aday ${i}`,
        url: `https://example.org/synthetic/${i}`,
        archiveIdentifier: `SYN-${i}`,
        eventYear: year,
        institution: "Sentetik Test Kurumu",
        synthetic: true,
        verification: {
          urlReachable: true,
          citationComplete: true,
          rightsKnown: true,
          duplicateChecked: true,
          aiReviewed: true,
          humanReviewed: false,
          notes: "",
        },
        state: "new",
      })
    );
  }
  return out;
}

export function makeSyntheticRecords(count, seed = 1) {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const year = 1900 + Math.floor(random() * 60);
    out.push(
      makeArchiveRecord({
        id: `syn-rec-${i}`,
        slug: `syn-rec-${i}`,
        title: `Sentetik kayıt ${i}`,
        date: { start: String(year), end: null, precision: "year", certainty: "estimated", display: String(year) },
        source: { ...makeArchiveRecord().source, url: `https://example.org/rec/${i}`, archiveIdentifier: `SYN-REC-${i}` },
        verification: { status: "published", reviewedBy: "x", reviewedAt: "2026-01-01", checks: {}, notes: "" },
      })
    );
  }
  return out;
}
