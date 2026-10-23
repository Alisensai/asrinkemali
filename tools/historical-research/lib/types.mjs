/**
 * MKA EVIDENCE ENGINE V0.7 — Veri sözleşmesi.
 *
 * Bu modül tarihî araştırma, kaynak adayı, iddia ve provenans kavramlarının
 * TypeScript/JavaScript karşılığını tanımlar. Çalışma zamanı doğrulaması
 * `candidates.mjs` içindeki `validateCandidate` işleviyle yapılır.
 *
 * İlkeler:
 *  - Hiçbir alan "bilinmiyor" durumuyla uydurulmaz; boş/null kalır.
 *  - Kurumsal yayın olması eseri otomatik olarak birincil kaynak yapmaz.
 *  - Yapay zekâ incelemesi insan uzman onayı DEĞİLDİR.
 *  - HTTP 200 yanıtı tarihî doğruluk kanıtı DEĞİLDİR; yalnızca erişilebilirlik
 *    göstergesidir ve `urlStatus` alanında ayrı tutulur.
 */

import path from "node:path";

/** Aday havuzu durumları. Hiçbiri tek başına insan onayı üretmez. */
export const CANDIDATE_STATES = [
  "new",                    // yeni aday
  "investigating",          // kaynak inceleniyor
  "insufficient_info",      // bilgi yetersiz (künye/hak eksik)
  "duplicate",              // mevcut arşivde veya havuzda tekrar
  "awaiting_human_review",  // insan incelemesi bekliyor
  "import_ready",           // dönüştürme hazırlığı tamam; YİNE insan onayı ister
  "rejected",               // reddedildi (gerekçe stateHistory'de)
];

/**
 * @typedef {"new"|"investigating"|"insufficient_info"|"duplicate"|"awaiting_human_review"|"import_ready"|"rejected"} CandidateState
 */

/** Kurum türleri — mevcut arşiv şemasıyla birebir. */
export const INSTITUTION_TYPES = [
  "official", "institutional", "archive", "library", "academic", "other",
];

/** Belge türleri (kaynak adayı düzeyinde). */
export const DOCUMENT_TYPES = [
  "article",            // ansiklopedi maddesi
  "book",               // kitap
  "archive_document",   // arşiv belgesi
  "photograph",         // fotoğraf
  "transcript",         // tutanak/debete
  "catalog",            // katalog kaydı
  "thesis",             // tez
  "other",
];

/**
 * Kaynak niteliği. "primary" yalnızca kaynak özgün belgenin kendisiyse
 * (ör. Devlet Arşivleri'ndeki tarama sureti); kurumun yayımladığı derleme
 * veya ansiklopedi maddesi "secondary"dir.
 *
 * @typedef {"primary"|"secondary"|"unknown"} SourceNature
 */

/**
 * @typedef SourceCandidate
 * @property {"1.0.0"} schemaVersion
 * @property {string} id            "src-YYYY-NNNN" biçiminde aday kimliği
 * @property {string} title         kaynak başlığı (künyeden alınır)
 * @property {string} institution    kaynak kurum
 * @property {string} institutionType
 * @property {string} institutionUrl
 * @property {string} url            özgün kaynak bağlantısı
 * @property {"unchecked"|"reachable"|"unreachable"} urlStatus
 * @property {string|null} urlCheckedAt
 * @property {Array<{name: string, role?: string}>} authors  boş olabilir; ASLA uydurulmaz
 * @property {string|null} publishedAt  YYYY-MM-DD | YYYY-MM | YYYY | null
 * @property {number|null} eventYear  kaynağın işaret ettiği olayın yılı (yoksa null)
 * @property {number|null} periodStart kapsanan tarihî dönemin başlangıç yılı
 * @property {number|null} periodEnd   kapsanan tarihî dönemin bitiş yılı
 * @property {Array<string>} people    ilgili tarihî kişiler
 * @property {Array<string>} locations ilgili mekânlar
 * @property {string} documentType
 * @property {"primary"|"secondary"|"unknown"} sourceNature
 * @property {Array<string>} researchThemes  araştırma başlıkları (bkz. RESEARCH_THEMES)
 * @property {{status: string, license: string|null, licenseUrl: string|null,
 *             termsUrl: string|null, credit: string, imageReuse: "not_downloaded"|"link_only",
 *             note: string}} rights
 * @property {string} accessedAt   YYYY-MM-DD
 * @property {{urlReachable: boolean, citationComplete: boolean, rightsKnown: boolean,
 *             duplicateChecked: boolean, aiReviewed: boolean, humanReviewed: boolean,
 *             notes: string}} verification
 * @property {CandidateState} state
 * @property {Array<{state: CandidateState, at: string, note?: string}>} stateHistory
 * @property {Array<string>} relatedArchiveIds  mevcut arşiv kayıt id'leri
 * @property {Array<string>} claims             desteklenen iddia kimlikleri
 * @property {string|null} archiveIdentifier    kurum arşiv numarası (varsa)
 * @property {string|null} citation            tam künye (yazılabildiyse)
 * @property {boolean} synthetic               sentetik test verisi işareti
 * @property {string|null} notes
 */

/**
 * Tarihî iddia. Kaynağın desteklediği veya çeliştiği tek, yapılandırılmış önerme.
 *
 * @typedef HistoricalClaim
 * @property {string} id  "claim-NNN"
 * @property {string} text  iddia metni (Türkçe)
 * @property {{start: string|null, end: string|null, precision: "day"|"month"|"year"|"range"|"unknown",
 *             certainty: "exact"|"estimated"|"unknown", display: string}} date
 * @property {Array<{candidateId: string, relation: "supports"|"contradicts"|"partial",
 *             quote?: string, note?: string}>} evidence
 * @property {"unverified"|"corroborated"|"contested"|"conflict"} status
 * @property {string|null} conflictNote
 */

/** Araştırma başlıkları — 1881–1918 odaklı, genişletilebilir. */
export const RESEARCH_THEMES = [
  "cocukluk",            // çocukluğu, aile yaşamı
  "selanik",            // Selanik dönemi
  "egitim",             // ilk öğrenim, askerî okullar
  "manastir",           // Manastır yılları
  "harp-okulu",         // Harp Okulu
  "harp-akademisi",     // Harp Akademisi
  "ilk-gorevler",       // ilk askerî görevleri
  "sam",                // Şam dönemi
  "trablusgarp",        // Trablusgarp Savaşı
  "balkan-savaslari",   // Balkan Savaşları
  "canakkale",          // Çanakkale Savaşları
  "dogu-cephesi",       // Doğu Cephesi
  "1917-1918",          // 1917–1918 dönemi
  "kisiler",            // dönemin tarihî kişileri
  "mekanlar",           // dönemin tarihî mekânları
  "genel",              // genel/yaşam
];

/**
 * Boşluk analizi raporu.
 *
 * @typedef GapReport
 * @property {{total: number, published: number, reviewed: number, draft: number}} counts
 * @property {Record<number, number>} recordsByYear
 * @property {Array<{start: number, end: number, count: number}>} yearRanges
 * @property {Array<{theme: string, label: string, records: number, coverage: "none"|"sparse"|"partial"|"covered"}>} themeCoverage
 * @property {Array<{start: number, end: number, note: string}>} missingRanges
 * @property {{targetStart: number, targetEnd: number, targetRecords: number,
 *             share: number}} targetPeriod
 * @property {Array<{code: string, message: string}>} notes
 */

/**
 * Dry-run dönüşüm sonucu.
 *
 * @typedef DryRunResult
 * @property {"ok"|"blocked"|"invalid"} outcome
 * @property {string|null} candidateId
 * @property {object|null} record        üretilen ArchiveRecord taslağı (draft)
 * @property {Array<{code: string, path: string, message: string}>} issues
 * @property {Array<{code: string, message: string}>} blockers
 */

export const CATALOG_WRITE_GUARDS = [
  "data/archive/catalog",
  "content/archive/records",
  "schemas",
];

export function assertNoCatalogWrite(targetPath) {
  // Mutlak yolları da yakalamak için önce çözümle (normalize) et.
  // resolve() yolu mutlak yapar ve '..' katmanlarını açar; böylece
  // '/repo/data/archive/catalog/x' gibi mutlak girgiler de denetlenir.
  let resolved;
  try {
    resolved = path.resolve(String(targetPath));
  } catch {
    resolved = String(targetPath).replaceAll("\\", "/");
  }
  const normalized = resolved.replaceAll("\\", "/");
  for (const guard of CATALOG_WRITE_GUARDS) {
    // Korumalı yolun kendisi VE onun altındaki her yol (mutlak veya göreli,
    // katman geçişli) reddedilir.
    if (
      normalized === guard ||
      normalized.startsWith(`${guard}/`) ||
      normalized.includes(`/${guard}/`) ||
      normalized.endsWith(`/${guard}`)
    ) {
      throw new Error(
        `Korumalı arşiv yoluna yazma reddedildi: ${targetPath}. ` +
        "Gerçek katalog dosyaları yalnızca insan onayıyla, ayrı bir süreçte değişir."
      );
    }
  }
}
