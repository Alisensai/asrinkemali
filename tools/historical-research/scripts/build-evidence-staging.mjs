/**
 * MKA Evidence Workbench — staging veri üreticisi.
 *
 * Bu betik, PR #19'daki 10 gerçek iddiayı ClaimRecord v2'ye taşır, her iddia
 * için GERÇEK kanıt konumlarını (resmî sayfalardan çıkarılmış kısa alıntılar)
 * EvidenceRecord olarak bağlar, 32 aday için denetim üretir ve araştırma
 * notlarını kaydeder. Tümü YALNIZCA data/research/evidence-staging/ altına yazılır.
 *
 * HİÇBİR ALAN UYDURULMAZ: pasaj bulunamayan alan boş kalır ve inceleme gerekir.
 * İnsan onayı ÜRETİLEMEZ: tüm kayıtlar awaiting_human_review kalır.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createClaimRecord, reviseClaimText } from "../evidence/claims.mjs";
import { bindEvidence } from "../evidence/workflow.mjs";
import { createEvidenceRecord, assessSupport } from "../evidence/evidence.mjs";
import { createNote } from "../evidence/notebook.mjs";
import { auditCandidate } from "../evidence/quality.mjs";
import { assertStagingWrite, stagingWrite } from "../evidence/staging.mjs";

const STAGING = path.resolve(process.cwd(), "data", "research", "evidence-staging");
const ACCESS_DATE = "2026-10-23";

/**
 * PR #19'daki claims.json'daki 10 iddianın metinleri (kısaltılmadan) ve
 * kanıt konumları — 23.10.2026 tarihli resmî sayfa okumalarından.
 */

/** @type {Array<{ id: string; text: string; dateRange: any; category: string; relatedPeople: string[]; relatedPlaces: string[]; relatedEvents: string[]; uncertaintyNote: string|null; revision?: { text: string; note: string; dateRange?: any }; locator: any; quote: string|null; assessment: { supports: boolean; method: "direct_passage"|"metadata_only"|"title_only"; note: string }; candidateId: string|null; dateRangeEvidence?: any; extraEvidence?: Array<{ id: string; relation: "supports"|"contradicts"; locator: any; quote: string|null; dateRange?: any; assessment: { supports: boolean|null; method: "direct_passage"|"metadata_only"; note: string } }> }>} */
const CLAIM_DATA = [
  {
    id: "claim-001",
    text: "Mustafa Kemal Atatürk 1881'de Selanik'te doğdu ve 10 Kasım 1938'de vefat etti.",
    dateRange: { start: "1881", end: "1938", precision: "range", certainty: "exact", display: "1881–1938" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: ["Selanik"],
    relatedEvents: [],
    uncertaintyNote: "Doğum günü nüfus kaydında yazılı değildir; 19 Mayıs kabul edilmiştir (kaynağın kendisi bu belirsizliği belirtir).",
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/4899/",
      title: "Atatürk, Gazi Mustafa Kemal (1881-10 Kasım 1938)",
      author: "Şerafettin Turan",
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "Gümrük memuru Ali Rıza ile Zübeyde çiftinin dördüncü çocukları olan Mustafa, 1881'de Selanik'te ... doğmuştur.",
    assessment: { supports: true, method: "direct_passage", note: "Doğum yılı ve şehri pasajda açıkça geçiyor; ölüm tarihi ayrı pasajda: '10 Kasım 1938 Perşembe sabahı saat 09.05'te hayata gözlerini yumdu.'" },
    candidateId: "src-2026-0001",
  },
  {
    id: "claim-002",
    text: "Atatürk Ansiklopedisi'nin \"Atatürk'ün Eğitim ve Öğretim Gördüğü Kurumlar\" maddesi, öğrenim hayatını 1887–2005 aralığında Şemsi Efendi Mektebi'nden Erkân-ı Harbiye Mektebi'ne uzanan kurumlarla belgeler (madde künyesi ve kapsam aralığı; tam metin pasajı ayrıca kaydedilmeli).",
    revision: {
      text: "Atatürk Ansiklopedisi'nin \"Atatürk'ün Eğitim ve Öğretim Gördüğü Kurumlar\" maddesi, öğrenim hayatını 1887–1905 aralığında Şemsi Efendi Mektebi'nden Erkân-ı Harbiye Mektebi'ne uzanan kurumlarla belgeler.",
      note: "v1 metnindeki '1887–2005' bir yazım hatasıydı (doğrusu 1887–1905); v1'in kanıtları v2 için yeniden değerlendirildi ve kaynak pasajlarından desteklendi.",
      dateRange: { start: "1887", end: "1905", precision: "range", certainty: "exact", display: "1887–1905" },
    },
    dateRange: { start: "1887", end: "1905", precision: "range", certainty: "exact", display: "1887–1905" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: ["Selanik", "Manastır", "İstanbul"],
    relatedEvents: [],
    uncertaintyNote: null,
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/875/",
      title: "Atatürk'ün Eğitim ve Öğretim Gördüğü Kurumlar",
      author: null,
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "Şemsi Efendi, küçük Mustafa okuluna kaydolduğu zaman (1887) 14 yıllık tecrübeli, ünü bütün Selanik'te yayılmış bir öğretmendir.",
    assessment: { supports: true, method: "direct_passage", note: "1887 başlangıcı bu pasajla; 1905 bitişi maddenin başka pasajıyla: 'Mustafa Kemal 29 Kânunuevvel 1320, yani 11 Ocak 1905 Çarşamba günü Erkan-ı Harbiye Yüzbaşılığı ile mektepten neşet ederek...'" },
    candidateId: "src-2026-0002",
  },
  {
    id: "claim-003",
    text: "Mustafa Kemal, Trablusgarp Savaşı'nda (1911–1912) Derne bölgesinde komutanlık görevi üstlendi.",
    dateRange: { start: "1911", end: "1912", precision: "range", certainty: "exact", display: "1911–1912" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: ["Derne", "Trablusgarp"],
    relatedEvents: ["Trablusgarp Savaşı"],
    uncertaintyNote: null,
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/407/",
      title: "Trablusgarp Savaşı (1911-1912)",
      author: "Hasan Taner Kerimoğlu",
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "5 Mart 1912 tarihinde Derne Komutanlığı'na atanan Mustafa Kemal, böylece geniş bir bölgedeki Osmanlı savunma güçlerini komuta etme görevini üstlenmiş oldu.",
    assessment: { supports: true, method: "direct_passage", note: "Derne Komutanlığı ataması ve görev kapsamı pasajda açıkça geçiyor." },
    candidateId: "src-2026-0003",
  },
  {
    id: "claim-004",
    text: "Mustafa Kemal'in Balkan Savaşı'ndaki görev süresi 1 Aralık 1912 ile 10 Ağustos 1913 arasındaydı.",
    dateRange: { start: "1912-12-01", end: "1913-08-10", precision: "day", certainty: "exact", display: "1 Aralık 1912 – 10 Ağustos 1913" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: ["Balkanlar"],
    relatedEvents: ["Balkan Savaşı"],
    uncertaintyNote: null,
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/685/",
      title: "Balkan Savaşı'nda Mustafa Kemal",
      author: "İsmet Görgülü",
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "Atatürk, Balkan Savaşı'nda 1 Aralık 1912'den 10 Ağustos 1913'e kadar 8 ay 10 gün görev yapar.",
    assessment: { supports: true, method: "direct_passage", note: "Görev süresi kesin günlerle pasajda açıkça geçiyor." },
    candidateId: "src-2026-0004",
  },
  {
    id: "claim-005",
    text: "Mustafa Kemal'in Sofya Ataşemiliterliği görevi 27 Ekim 1913 ile 20 Ocak 1915 arasında yürüttü.",
    dateRange: { start: "1913-10-27", end: "1915-01-20", precision: "day", certainty: "exact", display: "27 Ekim 1913 – 20 Ocak 1915" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: ["Sofya"],
    relatedEvents: [],
    uncertaintyNote: "Kaynak, ATANMA tarihini (27 Ekim 1913) ve İCRA dönemini (20 Kasım 1913 – 25 Ocak 1915) ayrı ayrı verir; madde başlığı 27 Ekim 1913 – 20 Ocak 1915 aralığını kullanır. Hangi aralığın kullanılacağı insan incelemesinde netleştirilmelidir.",
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/388/",
      title: "Mustafa Kemal'in Sofya Ataşemiliterliği",
      author: "Zekeriya Türkmen",
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "Sofya Askerî Ataşeliğine de 27 Ekim 1913 tarihinde Kurmay Binbaşı Mustafa Kemal (Atatürk) atanmıştır.",
    assessment: { supports: true, method: "direct_passage", note: "Atama tarihi bu pasajda; icra dönemi başka pasajda: '20 Kasım 1913 – 25 Ocak 1915 tarihleri arasında Sofya Askerî Ataşelik görevini yürüten Mustafa Kemal'. İki tarih semantiği farklıdır — çelişki adayı olarak kaydedildi." },
    candidateId: "src-2026-0011",
    extraEvidence: [
      {
        id: "ev-005-b",
        relation: "supports",
        locator: {
          url: "https://ataturkansiklopedisi.gov.tr/detay/388/",
          title: "Mustafa Kemal'in Sofya Ataşemiliterliği",
          author: "Zekeriya Türkmen",
          institution: "Atatürk Ansiklopedisi",
          page: null, section: "icra dönemi", locator: null,
        },
        quote: "20 Kasım 1913 – 25 Ocak 1915 tarihleri arasında Sofya Askerî Ataşelik görevini yürüten Mustafa Kemal",
        dateRange: { start: "1913-11-20", end: "1915-01-25", precision: "day", certainty: "exact", display: "20 Kasım 1913 – 25 Ocak 1915 (icra dönemi)" },
        assessment: { supports: true, method: "direct_passage", note: "İcra dönemi pasajı; atama tarihinden farklı aralık." },
      },
    ],
  },
  {
    id: "claim-006",
    text: "Atatürk Ansiklopedisi'nin \"Çanakkale Cephesi\" maddesi, Mustafa Kemal'in cephe görevini 1914–1916 dönemini kapsayacak şekilde ele alır.",
    revision: {
      text: "Atatürk Ansiklopedisi'nin \"Çanakkale Cephesi\" maddesine göre Mustafa Kemal, Çanakkale Cephesi'nde 20 Ocak 1915'te 19'uncu Tümen Komutanı olarak göreve atanmış ve 10 Aralık 1915'te cepheden ayrılmıştır.",
      note: "v1'deki '1914–1916' tahmini dönem aralığı, kaynak pasajından çıkarılan kesin tarihlerle (20 Ocak 1915 – 10 Aralık 1915) değiştirildi; v1 kanıtları v2 için yeniden değerlendirildi.",
      dateRange: { start: "1915-01-20", end: "1915-12-10", precision: "day", certainty: "exact", display: "20 Ocak 1915 – 10 Aralık 1915" },
    },
    dateRange: { start: "1915-01-20", end: "1915-12-10", precision: "day", certainty: "exact", display: "20 Ocak 1915 – 10 Aralık 1915" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: ["Çanakkale"],
    relatedEvents: ["Çanakkale Savaşları"],
    uncertaintyNote: null,
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/4084/",
      title: "Çanakkale Cephesi",
      author: "Murat Karataş",
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "20 Ocak 1915'te 19'uncu Tümen Komutanı olarak cephede göreve atanmış, 10 Aralık 1915'te cepheden ayrılmıştır.",
    assessment: { supports: true, method: "direct_passage", note: "Cephe görevi kesin tarihlerle pasajda açıkça geçiyor." },
    candidateId: "src-2026-0015",
  },
  {
    id: "claim-007",
    text: "ATAM'ın yayımladığı \"İlk Defa Yayınlanan Belgelerle Mustafa Kemal Paşa ve 16'ncı Kolordu Komutanlığı (1915-1917)\" kitabı, Mustafa Kemal'in 19 Ağustos 1915 – 18 Aralık 1916 arasındaki 16'ncı Kolordu Komutanlığı görevini belgelerle ele alır.",
    dateRange: { start: "1915-08-19", end: "1916-12-18", precision: "day", certainty: "exact", display: "19 Ağustos 1915 – 18 Aralık 1916" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: [],
    relatedEvents: ["16'ncı Kolordu Komutanlığı"],
    uncertaintyNote: "Kitabın başlığı 1915-1917 kapsamı bildirir; giriş metni ise komuta dönemini 19 Ağustos 1915 – 18 Aralık 1916 olarak verir. Başlık aralığı ile komuta aralığı farklıdır (kitap 1917 olaylarını da içeriyor olabilir) — insan incelemesi gerekir.",
    locator: {
      url: "https://atam.gov.tr/e-yayinlar/ilk-defa-yayinlanan-belgelerle-mustafa-kemal-pasa-ve-16nci-kolordu-komutanligi-1915-1917/",
      title: "İlk Defa Yayınlanan Belgelerle Mustafa Kemal Paşa ve 16'ncı Kolordu Komutanlığı (1915-1917)",
      author: "Oral Ateş",
      institution: "Atatürk Araştırma Merkezi (ATAM)",
      page: null, section: "kitap tanıtım/giriş", locator: null,
    },
    quote: "Bilindiği üzere Mustafa Kemal Atatürk 19 Ağustos 1915-18 Aralık 1916 tarihleri arasında, 16'ncı Kolordu Komutanlığı emrindeki askerlerle birlikte son derece zor koşullar altında kahramanca görev yapmıştır.",
    assessment: { supports: true, method: "direct_passage", note: "Kitabın kendi tanıtım/giriş metninden; komuta dönemini kesin tarihlerle verir. NOT: kitap künyesinde ISBN 978-975-17-6251-1, arşiv listesinde 978-975-17-6277-1 görünüyor — künye farkı denetim notuna işlendi." },
    candidateId: "src-2026-0029",
  },
  {
    id: "claim-008",
    text: "Mustafa Kemal'in Karlsbad'da tuttuğu günlük, 30 Haziran 1918 ile 28 Temmuz 1918 arasını kapsar.",
    dateRange: { start: "1918-06-30", end: "1918-07-28", precision: "day", certainty: "exact", display: "30 Haziran 1918 – 28 Temmuz 1918" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: ["Karlsbad"],
    relatedEvents: [],
    uncertaintyNote: "Atatürk Ansiklopedisi'nin iki maddesi günlüğün bitiş tarihini FARKLI veriyor (28 Temmuz vs 27 Temmuz 1918) — çelişki adayı kaydedildi, insan incelemesi gerekir.",
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/105/",
      title: "Karlsbad Günleri ve Günlüğü",
      author: null,
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "Mustafa Kemal Atatürk, 30 Haziran 1918 Pazar gününden 28 Temmuz 1918 Pazar gününe kadar tuttuğu ve yaklaşık bir aylık süreyi kapsayan günlüğünde",
    assessment: { supports: true, method: "direct_passage", note: "Günlük dönemi 28 Temmuz bitişli pasaj." },
    candidateId: "src-2026-0018",
    extraEvidence: [
      {
        id: "ev-008-b",
        relation: "contradicts",
        locator: {
          url: "https://ataturkansiklopedisi.gov.tr/detay/4078/",
          title: "Bilinmeyen Hatıralarıyla Atatürk, 1912-1916 Yılları Arasındaki Hâtıraları",
          author: "Nurettin Poyraz",
          institution: "Atatürk Ansiklopedisi",
          page: null, section: "Karlsbad günlüğü bölümü", locator: null,
        },
        quote: "Mustafa Kemal Paşa, Karlsbad'da iken 30 Haziran-27 Temmuz 1918 tarihleri arasını kapsayan, başına gelen olayları kaydettiği hatıralarını kaleme aldı.",
        dateRange: { start: "1918-06-30", end: "1918-07-27", precision: "day", certainty: "exact", display: "30 Haziran – 27 Temmuz 1918" },
        assessment: { supports: true, method: "direct_passage", note: "Aynı günlük için 27 Temmuz bitişli pasaj — detay maddesiyle çelişiyor (çelişki adayı)." },
      },
    ],
  },
  {
    id: "claim-009",
    text: "Mondros Mütarekesi 30 Ekim 1918'de imzalandı.",
    dateRange: { start: "1918-10-30", end: "1918-10-30", precision: "day", certainty: "exact", display: "30 Ekim 1918" },
    category: "olay",
    relatedPeople: [],
    relatedPlaces: ["Mondros"],
    relatedEvents: ["Mondros Mütarekesi"],
    uncertaintyNote: null,
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/353/",
      title: "Mondros Mütarekesi",
      author: null,
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "heyet, İstanbul'dan gelecek cevabı beklemeden mütarekeyi imzaladı (30 Ekim 1918)",
    assessment: { supports: true, method: "direct_passage", note: "İmza tarihi parantez içinde açıkça geçiyor." },
    candidateId: "src-2026-0019",
  },
  {
    id: "claim-010",
    text: "Atatürk Ansiklopedisi'nin \"Sina ve Filistin Cephesi\" maddesi, 1917-1919 dönemini kapsar; Mustafa Kemal'in İstanbul'da geçirdiği 13 Kasım 1918 – 16 Mayıs 1919 aralığını da belgeler.",
    dateRange: { start: "1917", end: "1919", precision: "range", certainty: "exact", display: "1917–1919" },
    category: "biyografi",
    relatedPeople: ["Mustafa Kemal Atatürk"],
    relatedPlaces: ["Sina ve Filistin", "İstanbul"],
    relatedEvents: ["Sina ve Filistin Cephesi"],
    uncertaintyNote: null,
    locator: {
      url: "https://ataturkansiklopedisi.gov.tr/detay/291/",
      title: "Sina ve Filistin Cephesi",
      author: "Nasır Yüceer",
      institution: "Atatürk Ansiklopedisi",
      page: null, section: null, locator: null,
    },
    quote: "13 Kasım 1918 tarihinden 16 Mayıs 1919 tarihine kadar İstanbul'da kalarak memleketin genel durumunu yakın arkadaşlarıyla kritik eden Mustafa Kemal Paşa",
    assessment: { supports: true, method: "direct_passage", note: "1919 İstanbul dönemi bu pasajla; madde kapsamı 1917 (Yıldırım Orduları Grubu) ile başlar — kapsam aralığı maddenin bölüm yapısından çıkar." },
    candidateId: "src-2026-0021",
  },
];

/** Künye araştırması bulguları (8 eksik aday için) — uydurma yok. */
const METADATA_FINDINGS = {
  "src-2026-0001": { authors: [{ name: "Şerafettin Turan" }], publishedAt: "2020-12-20", note: "Yazar ve tarih resmî künye bölümünden doğrulandı (23.10.2026)." },
  "src-2026-0011": { authors: [{ name: "Zekeriya Türkmen" }], publishedAt: "2020-11-29", note: "Yazar (Öğretim Üyesi Zekeriya Türkmen) ve tarih resmî künyeden doğrulandı." },
  "src-2026-0023": { authors: [{ name: "Nejdet Bilgi" }], publishedAt: "2024-10-23", note: "Yazar resmî künyeden doğrulandı; tarih zaten kayıtlıydı." },
  "src-2026-0026": { publishedAt: null, note: "Yazar (Halil Bal) kayıtlı; yayın tarihi resmî sayfada belirtilmiyor — boş bırakıldı (uydurulmadı)." },
  "src-2026-0027": { publishedAt: "2020-11-29", note: "Yazar (İsmet Görgülü) kayıtlı; tarih resmî künyeden doğrulandı." },
  "src-2026-0028": { authors: [{ name: "İsmail Özçelik" }], note: "Kitap künyesinde yazar boş; ATAM arşiv listesinde 'İsmail Özçelik' görünüyor. İki farklı ISBN (978-975-16-1983-9 künyede, 975-16-1821-5 listede) — baskı farkı olabilir; insan incelemesi gerekli." },
  "src-2026-0031": { note: "Künye DOĞRULANAMADI: Devlet Arşivleri yayın listesinde 'Belgelerle Mustafa Kemal Atatürk ve Türk-Bulgar İlişkileri (1913-1938), Ankara 2002' başlıklı eser muhtemel eşleşme; PDF indirilmeden kesin künye doğrulanamaz (insan incelemesi gerekli). Alanlar boş bırakıldı." },
  "src-2026-0032": { note: "Kurumsal koleksiyon (Millî Kütüphane Atatürk Belgeliği): tekil künye yok; sayfa beyanına göre 1983'ten beri hizmette, 3.053 materyal. Yazar/tarih alanları uygulanamaz — kurumsal künye olarak kaydedildi." },
};

async function main() {
  // 1) İddiaları ClaimRecord v2'ye taşı ve kanıtları bağla
  const claims = [];
  const evidenceRecords = [];
  for (const data of CLAIM_DATA) {
    let claim = createClaimRecord({
      id: data.id,
      text: data.text,
      dateRange: data.dateRange,
      category: data.category,
      relatedPeople: data.relatedPeople,
      relatedPlaces: data.relatedPlaces,
      relatedEvents: data.relatedEvents,
      uncertaintyNote: data.uncertaintyNote,
    });
    // v1 kanıtı (pasaj) — v1'e bağlanır
    const v1Evidence = createEvidenceRecord({
      id: `ev-${data.id.replace("claim-", "")}-1`,
      claimId: data.id,
      claimVersion: 1,
      relation: "supports",
      locator: data.locator,
      shortQuote: data.quote,
      accessDate: ACCESS_DATE,
      candidateId: data.candidateId ?? null,
      dateRange: data.dateRange,
    });
    const assessedV1 = assessSupport(v1Evidence, {
      actuallySupports: data.assessment.supports ? true : null,
      method: data.assessment.method,
      note: data.assessment.note,
    });
    let bound = bindEvidence(claim, assessedV1);
    claim = bound.claim;
    // Revizyon varsa uygula (eski kanıt stale kalır)
    if (data.revision) {
      claim = reviseClaimText(claim, data.revision.text, data.revision.note, data.revision.dateRange ?? data.dateRange);
      // v2 için kanıtı YENİDEN değerlendirip bağla (aynı kaynak, güncel sürüm)
      const v2Evidence = createEvidenceRecord({
        id: `${assessedV1.id}-v2`,
        dateRange: data.revision.dateRange ?? data.dateRange,
        claimId: data.id,
        claimVersion: claim.currentVersion,
        relation: "supports",
        locator: data.locator,
        shortQuote: data.quote,
        accessDate: ACCESS_DATE,
        candidateId: data.candidateId ?? null,
      });
      const assessedV2 = assessSupport(v2Evidence, {
        actuallySupports: data.assessment.supports ? true : null,
        method: data.assessment.method,
        note: `${data.assessment.note} [v2 metnine göre yeniden değerlendirildi]`,
      });
      bound = bindEvidence(claim, assessedV2);
      claim = bound.claim;
      evidenceRecords.push(assessedV1); // v1 kanıt denetim izi olarak korunur (stale)
      evidenceRecords.push(assessedV2);
    } else {
      evidenceRecords.push(assessedV1);
    }
    // Ek kanıtlar (aynı sürüme)
    for (const extra of data.extraEvidence ?? []) {
      const extraRecord = createEvidenceRecord({
        id: extra.id,
        claimId: data.id,
        claimVersion: claim.currentVersion,
        relation: extra.relation,
        locator: extra.locator,
        shortQuote: extra.quote,
        accessDate: ACCESS_DATE,
        dateRange: extra.dateRange ?? data.dateRange,
      });
      const assessedExtra = assessSupport(extraRecord, {
        actuallySupports: extra.assessment.supports === null ? null : extra.assessment.supports,
        method: extra.assessment.method,
        note: extra.assessment.note,
      });
      const boundExtra = bindEvidence(claim, assessedExtra);
      claim = boundExtra.claim;
      evidenceRecords.push(assessedExtra);
    }
    claims.push(claim);
  }

  // 2) Araştırma notları
  const notes = [
    createNote({
      id: "note-001", kind: "research_question", author: "MKA Evidence Workbench",
      text: "claim-005 (Sofya Ataşemiliterliği): kaynak atama tarihini (27 Ekim 1913) ve icra dönemini (20 Kasım 1913 – 25 Ocak 1915) ayrı veriyor; madde başlığı ise 27 Ekim 1913 – 20 Ocak 1915 kullanıyor. İddia hangi aralığa göre yazılmalı? İnsan tarihçi incelemesi gerekli.",
      target: { claimId: "claim-005" },
      linkedRecordIds: ["ev-005-1", "ev-005-b"],
    }),
    createNote({
      id: "note-002", kind: "comparison", author: "MKA Evidence Workbench",
      text: "claim-008 (Karlsbad günlüğü): aynı kurumun iki maddesi bitiş tarihini farklı veriyor (detay/105: 28 Temmuz 1918; detay/4078: 27 Temmuz 1918). Her iki pasaj da alıntı olarak kaydedildi; çelişki adayı üretildi. Kaynaklardan biri diğerinden türemiş olabilir — bağımsızlık incelemesi gerekli.",
      target: { claimId: "claim-008" },
      linkedRecordIds: ["ev-008-1", "ev-008-b"],
    }),
    createNote({
      id: "note-003", kind: "missing_info", author: "MKA Evidence Workbench",
      text: "src-2026-0031 (Devlet Arşivleri 'Belgelerle Mustafa Kemal Atatürk'): künye doğrulanamadı; PDF indirilmedi (telif/boyut). Yayın listesindeki 'Belgelerle Mustafa Kemal Atatürk ve Türk-Bulgar İlişkileri (1913-1938), Ankara 2002' muhtemel eşleşme — insan incelemesi ile künye tamamlanmalı.",
      target: { candidateId: "src-2026-0031" },
      linkedRecordIds: [],
    }),
    createNote({
      id: "note-004", kind: "commentary", author: "MKA Evidence Workbench",
      text: "ATAM kitabı (src-2026-0029) künyesinde ISBN 978-975-17-6251-1 yazıyor; ATAM arşiv listesi 978-975-17-6277-1 gösteriyor. Fark, baskı/liste hatası olabilir — yayınevi kaynağından doğrulanmalı. Bu bir YORUMDUR, kaynakta yazan ifade değildir.",
      target: { candidateId: "src-2026-0029" },
      linkedRecordIds: [],
    }),
  ];

  // 3) 32 adayın denetimi (PR #19 havuzundan)
  const poolPath = path.resolve(process.cwd(), "data", "research", "candidates", "pool.json");
  const pool = JSON.parse(await fs.readFile(poolPath, "utf8"));
  const audits = [];
  for (const candidate of pool.candidates) {
    const finding = METADATA_FINDINGS[candidate.id];
    const enriched = finding
      ? {
          ...candidate,
          authors: finding.authors ?? candidate.authors,
          publishedAt: finding.publishedAt ?? candidate.publishedAt,
        }
      : candidate;
    const audit = auditCandidate(enriched, { targetStart: 1881, targetEnd: 1918 });
    if (finding?.note) audit.findings.push(`Künye araştırması (23.10.2026): ${finding.note}`);
    audits.push(audit);
  }

  // 4) Yazım (yalnızca staging)
  const payload = (name, value) => stagingWrite(name, JSON.stringify(value, null, 2));
  await payload("claims-v2.json", { schemaVersion: "2.0.0", generatedAt: new Date().toISOString(), claims });
  await payload("evidence.json", { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), evidence: evidenceRecords });
  await payload("candidate-audits.json", { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), audits });
  await payload("notes.json", { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), notes });

  // 5) Çelişki adayları (yalnız kesin tarihli, insan incelemesi bekler)
  const { findDateContradictions } = await import("../evidence/contradictions.mjs");
  const contradictionCandidates = [];
  for (const claim of claims) {
    contradictionCandidates.push(...findDateContradictions(claim, evidenceRecords));
  }
  await payload("contradictions.json", {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    note: "Adaylar kesin tarihî çelişki DEĞİLDİR; insan incelemesi bekler.",
    candidates: contradictionCandidates,
  });
  console.log(`contradictions.json: ${contradictionCandidates.length} aday`);

  // Özet
  const revised = claims.filter((claim) => claim.currentVersion > 1).map((claim) => claim.id);
  console.log(`claims-v2.json: ${claims.length} iddia (revize edilenler: ${revised.join(", ") || "yok"})`);
  console.log(`evidence.json: ${evidenceRecords.length} kanıt kaydı`);
  console.log(`candidate-audits.json: ${audits.length} denetim`);
  console.log(`notes.json: ${notes.length} araştırma notu`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
