/**
 * Çelişki adayı motoru.
 *
 * KURALLAR:
 * - Olay tarihi ile yayın tarihi rakip tarih DEĞİLDİR (farklı semantikler).
 * - Üst üste binen belirsiz aralıklar otomatik çelişki DEĞİLDİR.
 * - Motor yalnız İNCELEME ADAYI üretir; kesin tarihî çelişki kararı insanındır.
 * - Her aday, çelişen iki kanıt KONUMUNU gösterir (evidenceId çifti).
 */

/**
 * @typedef {import("./contracts.d.ts").ContradictionCandidate} ContradictionCandidate
 * @typedef {import("./contracts.d.ts").EvidenceRecord} EvidenceRecord
 * @typedef {import("./contracts.d.ts").ClaimRecord} ClaimRecord
 */

/**
 * İddia çiftleri arasında tarih çelişkisi adayı üretir.
 * Yalnızca aynı iddia için iki farklı kaynakta ÇAKIŞMAYAN kesin tarih
 * raporlandığında aday üretilir; belirsiz/kesin olmayan aralıklar aday üretmez.
 * @param {ClaimRecord} claim
 * @param {EvidenceRecord[]} evidence
 * @returns {ContradictionCandidate[]}
 */
export function findDateContradictions(claim, evidence) {
  /** @type {import("./contracts.d.ts").ContradictionCandidate[]} */
  const candidates = [];
  const relevant = evidence.filter((item) => item.claimId === claim.id && item.claimVersion === claim.currentVersion);
  for (let i = 0; i < relevant.length; i += 1) {
    for (let j = i + 1; j < relevant.length; j += 1) {
      const a = relevant[i];
      const b = relevant[j];
      const rangeA = extractDateRange(a);
      const rangeB = extractDateRange(b);
      if (!rangeA || !rangeB) continue;
      if (rangeA.certainty !== "exact" || rangeB.certainty !== "exact") continue;
      // Kesin aralıklar AYNI DEĞİLSE (ayrık VEYA farklı uçlar) aday üretilir.
      // Kapsayan/kapsanan aralıklar da farklı uç taşıdığında aday üretir
      // (ör. aynı günlük için 28 Temmuz ile 27 Temmuz bitişi) — bu adaylar
      // tarih SEMANTİK farkı da olabilir; insan incelemesi belirler.
      if (rangeA.start !== rangeB.start || (rangeA.end ?? rangeA.start) !== (rangeB.end ?? rangeB.start)) {
        if (!rangesOverlap(rangeA, rangeB)) {
          candidates.push({
            id: `cdx-${claim.id}-${a.id}-${b.id}`,
            field: "event_date",
            evidenceIds: [a.id, b.id],
            claimId: claim.id,
            description:
              `İddia ${claim.id} için iki kaynak farklı tarih aralığı raporluyor: ` +
              `"${rangeA.display}" (${a.locator.institution}) ve "${rangeB.display}" (${b.locator.institution}). ` +
              "Aralıklar örtüşmüyor; tarih semantikleri (atama/icra/günlük dönemi) karşılaştırılmalı. Bu aday kesin çelişki DEĞİLDİR.",
            status: "needs_review",
            createdAt: new Date().toISOString(),
          });
        } else {
          candidates.push({
            id: `cdx-${claim.id}-${a.id}-${b.id}`,
            field: "event_date",
            evidenceIds: [a.id, b.id],
            claimId: claim.id,
            description:
              `İddia ${claim.id} için iki kaynak örtüşen ancak uçları farklı kesin aralıklar raporluyor: ` +
              `"${rangeA.display}" (${a.locator.institution}) ve "${rangeB.display}" (${b.locator.institution}). ` +
              "Uç farkı, farklı tarih semantiğinden (kapsam/atama/icra) de kaynaklanabilir; kanıt konumları karşılaştırılmalı. Bu aday kesin çelişki DEĞİLDİR.",
            status: "needs_review",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }
  return candidates;
}

/**
 * Kanıt kaydındaki alıntıdan tarih aralığı çıkarımı — yalnız açık kaynak
 * beyanlarından; uydurma yok. Kanıt kaydı claim'e bağlı dateRange taşımıyorsa
 * null döner (motor tahmin yürütmez).
 * @param {EvidenceRecord} record
 */
function extractDateRange(record) {
  const meta = /** @type {any} */ (record).dateRange;
  if (meta && typeof meta === "object" && meta.display) {
    return meta;
  }
  return null;
}

/**
 * İki kesin aralığın örtüşüp örtüşmediği.
 * @param {{ start: string, end?: string|null }} a
 * @param {{ start: string, end?: string|null }} b
 */
function rangesOverlap(a, b) {
  const startA = Date.parse(a.start);
  const endA = Date.parse(a.end ?? a.start);
  const startB = Date.parse(b.start);
  const endB = Date.parse(b.end ?? b.start);
  if ([startA, endA, startB, endB].some((value) => Number.isNaN(value))) return true; // ayrıştırılamayan format: çelişki ÜRETME
  return startA <= endB && startB <= endA;
}

/**
 * Çelişki adayını insan incelemesi sonucuyla kapatır (karar asla otomatik verilmez).
 * @param {ContradictionCandidate} candidate
 * @param {"dismissed"} decision
 * @returns {ContradictionCandidate}
 */
export function resolveContradictionCandidate(candidate, decision) {
  if (decision !== "dismissed") {
    throw new Error("Otomatik 'kesin çelişki' kararı verilemez; yalnızca insan incelemesiyle kapatılabilir.");
  }
  return { ...candidate, status: "dismissed" };
}

/**
 * Çelişki adayları doğrulaması.
 * @param {unknown} value
 * @returns {{ ok: boolean; issues: Array<{ code: string; message: string }> }}
 */
export function validateContradictionCandidate(value) {
  const issues = [];
  if (typeof value !== "object" || value === null) {
    return { ok: false, issues: [{ code: "TYPE", message: "Çelişki adayı bir nesne olmalı." }] };
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (record.status === "confirmed") {
    issues.push({ code: "AUTO_CONFIRMED", message: "Çelişki adayı otomatik 'kesin' işaretlenemez; insan incelemesi gerekir." });
  }
  const ids = record.evidenceIds;
  if (!Array.isArray(ids) || ids.length !== 2) {
    issues.push({ code: "EVIDENCE_PAIR", message: "Aday, tam olarak iki kanıt kimliği göstermelidir." });
  }
  return { ok: issues.length === 0, issues };
}
