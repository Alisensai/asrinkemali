/**
 * ASRIN KEMALİ — Standart Değerlendirme Sorgu Kümesi ve Qrels
 */

export const EVALUATION_QUERIES = Object.freeze([
  {
    id: "q-01",
    text: "Cumhuriyetin ilanı",
    category: "olay",
    expectedRelevant: ["cumhuriyetin-ilani-1923", "tbmm-43-birlesim-tutanagi-1923"],
  },
  {
    id: "q-02",
    text: "Lozan Barış Antlaşması",
    category: "antlasma",
    expectedRelevant: ["lozan-baris-antlasmasi-1923"],
  },
  {
    id: "q-03",
    text: "TBMM açılışı",
    category: "olay",
    expectedRelevant: ["tbmm-acilis-1920", "tbmm-1-birlesim-tutanagi-1920"],
  },
  {
    id: "q-04",
    text: "Sakarya Meydan Muharebesi",
    category: "askeri",
    expectedRelevant: ["sakarya-meydan-muharebesi-1921"],
  },
  {
    id: "q-05",
    text: "Nutuk",
    category: "yayin",
    expectedRelevant: ["nutuk-1927", "ibb-nutuk-okuma-fotografi-1927"],
  },
  {
    id: "q-06",
    text: "Sivas Kongresi",
    category: "kongre",
    expectedRelevant: ["sivas-kongresi-1919"],
  },
  {
    id: "q-07",
    text: "Erzurum Kongresi",
    category: "kongre",
    expectedRelevant: ["erzurum-kongresi-1919"],
  },
  {
    id: "q-08",
    text: "Mudanya Mütarekesi",
    category: "antlasma",
    expectedRelevant: ["mudanya-mutarekesi-1922"],
  },
  {
    id: "q-09",
    text: "Soyadı Kanunu",
    category: "kanun",
    expectedRelevant: ["soyadi-kanunu-1934", "tbmm-71-birlesim-tutanagi-1934"],
  },
  {
    id: "q-10",
    text: "Menemen Olayı",
    category: "olay",
    expectedRelevant: ["menemen-olayi-1930"],
  },
  // Negatif Sorgular (Sıfır sonuç dönmeli)
  {
    id: "q-neg-01",
    text: "Uzay istasyonu fırlatılışı 1999",
    category: "negatif",
    expectedRelevant: [],
  },
  {
    id: "q-neg-02",
    text: "Xkcd99999 geçersiz sorgu",
    category: "negatif",
    expectedRelevant: [],
  },
]);

/**
 * Graded Qrels Veritabanı (0..3 skala)
 * 3: Doğrudan ve temel kaynak
 * 2: İlgili kaynak
 * 1: Dolaylı değinilen kaynak
 * 0: İlgisiz
 */
export function buildQrelsMap() {
  const qrels = new Map();

  for (const q of EVALUATION_QUERIES) {
    const queryMap = new Map();
    for (const recId of q.expectedRelevant) {
      queryMap.set(recId, 3); // Doğrudan ilgili
    }
    qrels.set(q.id, queryMap);
  }

  return qrels;
}
