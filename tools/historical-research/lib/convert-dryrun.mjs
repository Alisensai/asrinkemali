/**
 * Dry-run dönüşüm: kaynak adayı → ArchiveRecord v1.1.0 taslağı.
 *
 * Kritik kurallar:
 *  - Üretilen kayıt HER ZAMAN `verification.status: "draft"` olur.
 *  - `published` durumu bu modülle ÜRETİLEMEZ (kod düzeyinde imkânsız).
 *  - Eksik künye, bilinmeyen hak veya insan incelemesi eksikse dönüşüm ENGELLENİR.
 *  - Gerçek katalog dosyalarına yazma YOKTUR; çıktı yalnızca bellek veya
 *    `data/research/candidates/exports/` dizinine yazılır.
 *  - Mevcut arşivle URL/kimlik tekrarı varsa dönüşüm ENGELLENİR.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeUrl, titleSimilarity, foldTr } from "./dedupe.mjs";
import { validateCandidate } from "./candidates.mjs";
import { assertNoCatalogWrite } from "./types.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * @param {SourceCandidate} candidate
 * @param {Array} archiveRecords mevcut arşiv kayıtları (tekrar denetimi için)
 * @param {{archiveValidator?: Function}} [deps] bağımlılık enjeksiyonu (testler için)
 * @returns {DryRunResult}
 */
export function convertCandidateToDraft(candidate, archiveRecords = [], deps = {}) {
  const blockers = [];
  const issues = [];

  if (!candidate || typeof candidate !== "object") {
    return { outcome: "invalid", candidateId: null, record: null, issues: [], blockers: [{ code: "NOT_OBJECT", message: "Aday nesnesi yok." }] };
  }

  const validation = validateCandidate(candidate);
  issues.push(...validation.issues);
  if (!validation.ok) {
    return {
      outcome: "invalid",
      candidateId: candidate.id ?? null,
      record: null,
      issues,
      blockers: issues.map((issue) => ({ code: issue.code, message: issue.message })),
    };
  }

  // --- Engeller (bloklar) ---
  if (candidate.synthetic === true) {
    blockers.push({
      code: "SYNTHETIC_FORBIDDEN",
      message: "Sentetik test verisi gerçek arşiv kaydına dönüştürülemez.",
    });
  }
  if (!validation.citationComplete) {
    blockers.push({
      code: "CITATION_INCOMPLETE",
      message: "Künye eksik (yazar/yayın tarihi). Eksik alanlar uydurulamaz; insan incelemesi gerekir.",
    });
  }
  if (!validation.rightsKnown) {
    blockers.push({
      code: "RIGHTS_UNKNOWN",
      message: "Telif/kullanım hakkı bilinmiyor; kayıt yalnızca bağlantı künyesi olarak değerlendirilebilir.",
    });
  }
  if (candidate.verification?.urlReachable !== true) {
    blockers.push({
      code: "URL_NOT_REACHABLE",
      message: "Kaynak bağlantısı erişilebilir değil veya denetlenmemiş. Erişilebilirlik ≠ doğruluk; ancak en azından erişim denetlenmelidir.",
    });
  }
  if (candidate.verification?.humanReviewed !== true) {
    blockers.push({
      code: "HUMAN_REVIEW_REQUIRED",
      message: "İnsan incelemesi kaydı yok. Yapay zekâ incelemesi insan onayı yerine geçmez.",
    });
  }
  if (candidate.state !== "import_ready") {
    blockers.push({
      code: "STATE_NOT_IMPORT_READY",
      message: `Aday durumu 'import_ready' değil: ${candidate.state}.`,
    });
  }

  // Arşivle tekrar denetimi
  const normalized = normalizeUrl(candidate.url);
  const duplicateInArchive = archiveRecords.find((record) => normalizeUrl(record?.source?.url) === normalized);
  if (duplicateInArchive) {
    blockers.push({
      code: "DUPLICATE_IN_ARCHIVE",
      message: `Aynı URL mevcut arşivde zaten var: ${duplicateInArchive.id}.`,
    });
  }
  const similarInArchive = archiveRecords.find(
    (record) =>
      record?.source?.institution === candidate.institution &&
      record?.source?.archiveIdentifier &&
      candidate.archiveIdentifier &&
      String(record.source.archiveIdentifier).toUpperCase() === String(candidate.archiveIdentifier).toUpperCase()
  );
  if (similarInArchive) {
    blockers.push({
      code: "DUPLICATE_IN_ARCHIVE",
      message: `Aynı kurum arşiv kimliği mevcut arşivde zaten var: ${similarInArchive.id}.`,
    });
  }

  if (blockers.length > 0) {
    return { outcome: "blocked", candidateId: candidate.id, record: null, issues, blockers };
  }

  // --- Kayıt üretimi (draft) ---
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const slugBase = foldTr(candidate.title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  const record = {
    schemaVersion: "1.1.0",
    id: `research-${candidate.id}`,
    slug: slugBase,
    title: candidate.title,
    type: mapDocumentTypeToRecordType(candidate.documentType),
    date: buildArchiveDate(candidate),
    people: (candidate.authors ?? []).map((author) => ({ name: author.name, role: "author" })),
    locations: (candidate.locations ?? []).map((name) => ({ name })),
    categories: mapThemesToCategories(candidate.researchThemes ?? []),
    summary: candidate.citation ?? candidate.title,
    description: buildDescription(candidate),
    source: {
      institution: candidate.institution,
      institutionType: candidate.institutionType,
      institutionUrl: candidate.institutionUrl,
      title: candidate.title,
      url: candidate.url,
      citation: candidate.citation ?? null,
      accessedAt: candidate.accessedAt,
      publishedAt: candidate.publishedAt ?? null,
      archiveIdentifier: candidate.archiveIdentifier ?? null,
      note: "MKA Evidence Engine dry-run dönüşümünden üretildi; henüz yayımlanmamıştır.",
    },
    provenance: [
      {
        institution: candidate.institution,
        collection: null,
        identifier: candidate.archiveIdentifier ?? null,
        url: candidate.url,
        accessedAt: candidate.accessedAt,
        note: "Aday havuzundan dönüştürüldü.",
      },
    ],
    rights: {
      status: mapRightsStatus(candidate.rights?.status),
      license: candidate.rights?.license ?? null,
      licenseUrl: candidate.rights?.licenseUrl ?? null,
      termsUrl: candidate.rights?.termsUrl ?? null,
      credit: candidate.rights?.credit ?? candidate.institution,
      imageReuse: "not_downloaded",
      note: "Dry-run kaydı; hak bilgisi aday havuzundaki doğrulamadan alınır.",
    },
    image: null,
    holding: {
      mode: "external_link",
      filePath: null,
      note: "Dry-run: dosya barındırılmaz, yalnızca dış bağlantı önerilir.",
    },
    verification: {
      status: "draft",
      reviewedBy: null,
      reviewedAt: null,
      checks: {
        sourceReachable: Boolean(candidate.verification?.urlReachable),
        dateVerified: Boolean(candidate.eventYear),
        rightsVerified: Boolean(candidate.verification?.rightsKnown),
        quoteVerified: false,
        duplicateChecked: Boolean(candidate.verification?.duplicateChecked),
      },
      notes: "MKA Evidence Engine dry-run çıktısı. İnsan uzman onayı YOKTUR; yayımlanamaz.",
    },
    tags: [candidate.institution, String(candidate.eventYear ?? candidate.periodStart ?? "")].filter(Boolean),
    relatedIds: [...(candidate.relatedArchiveIds ?? [])],
    createdAt: now,
    updatedAt: now,
  };

  return { outcome: "ok", candidateId: candidate.id, record, issues, blockers: [] };
}

function mapDocumentTypeToRecordType(documentType) {
  switch (documentType) {
    case "article": return "event";
    case "book": return "publication";
    case "archive_document": return "document";
    case "photograph": return "photograph";
    case "transcript": return "document";
    case "catalog": return "publication";
    case "thesis": return "publication";
    default: return "document";
  }
}

function buildArchiveDate(candidate) {
  if (candidate.eventYear != null) {
    return {
      start: String(candidate.eventYear),
      end: null,
      precision: "year",
      certainty: "estimated",
      display: String(candidate.eventYear),
      note: "Aday havuzundaki olay yılından; insan incelemesiyle kesinleştirilmelidir.",
    };
  }
  return {
    start: null,
    end: null,
    precision: "unknown",
    certainty: "unknown",
    display: "Tarih doğrulanmadı",
    note: "Adayda olay yılı belirtilmedi; uydurulmaz.",
  };
}

function mapThemesToCategories(themes) {
  const mapping = {
    "cocukluk": "genel",
    "selanik": "genel",
    "egitim": "egitim",
    "manastir": "genel",
    "harp-okulu": "egitim",
    "harp-akademisi": "egitim",
    "ilk-gorevler": "genel",
    "sam": "genel",
    "trablusgarp": "savas",
    "balkan-savaslari": "savas",
    "canakkale": "savas",
    "dogu-cephesi": "savas",
    "1917-1918": "genel",
    "kisiler": "genel",
    "mekanlar": "genel",
    "genel": "genel",
  };
  const out = new Set();
  for (const theme of themes) {
    const category = mapping[theme];
    if (category) out.add(category);
  }
  return [...out];
}

function mapRightsStatus(status) {
  const allowed = ["public_domain", "open_license", "official_link_only", "institutional_terms", "unknown", "permission_required", "ai_representative"];
  return allowed.includes(status) ? status : "unknown";
}

function buildDescription(candidate) {
  return `${candidate.title} — ${candidate.institution}. Bu kayıt MKA Evidence Engine dry-run dönüşümüdür; ` +
    "henüz yayımlanmamıştır ve insan uzman incelemesi beklemektedir.";
}

/**
 * Dry-run çıktısını güvenli dizine yazar (yalnızca exports/).
 */
export function draftExportPath(root, candidateId) {
  const target = path.join(root, "data", "research", "candidates", "exports", `${candidateId}.json`);
  assertNoCatalogWrite(target);
  return target;
}

export { REPO_ROOT };
