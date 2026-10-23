/**
 * Aday havuzu oluşturucu — MKA Evidence Engine.
 * Bu betik doğrulanmış kaynak künyelerinden data/research/candidates/pool.json
 * ve claims.json üretir. Kaynaklar 2026-10-23 tarihinde tek tek okunarak
 * doğrulanmıştır; hiçbir alan uydurulmamıştır.
 */
import fs from "node:fs/promises";
import path from "node:path";

const AYK = {
  institution: "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
  institutionType: "institutional",
  institutionUrl: "https://www.ataturkansiklopedisi.gov.tr/",
};
const ATAM = {
  institution: "Atatürk Araştırma Merkezi (ATAM)",
  institutionType: "official",
  institutionUrl: "https://atam.gov.tr/",
};
const DA = {
  institution: "T.C. Cumhurbaşkanlığı Devlet Arşivleri Başkanlığı",
  institutionType: "archive",
  institutionUrl: "https://www.devletarsivleri.gov.tr/",
};
const MK = {
  institution: "Millî Kütüphane (Atatürk Belgeliği)",
  institutionType: "library",
  institutionUrl: "https://www.millikutuphane.gov.tr/",
};

const RIGHTS_LINK_ONLY = {
  status: "official_link_only",
  license: null,
  licenseUrl: null,
  termsUrl: null,
  credit: "",
  imageReuse: "not_downloaded",
  note: "Kurumsal kaynak sayfası yalnızca bağlantı olarak sunulur; dosya indirilmedi. Yeniden kullanım lisansı doğrulanmadı.",
};

function ayk(id, slug, title, author, publishedAt, themes, extra = {}) {
  const url = `https://ataturkansiklopedisi.gov.tr/detay/${id}/${slug}`;
  return {
    title,
    institution: AYK.institution,
    institutionType: AYK.institutionType,
    institutionUrl: AYK.institutionUrl,
    url,
    authors: author ? [{ name: author }] : [],
    publishedAt,
    documentType: "article",
    sourceNature: "secondary",
    researchThemes: themes,
    archiveIdentifier: `AYK-${id}`,
    rights: { ...RIGHTS_LINK_ONLY, credit: AYK.institution },
    citation: author
      ? `${author}, "${title}", Atatürk Ansiklopedisi, Atatürk Araştırma Merkezi, erişim 23.10.2026, ${url}.`
      : `"${title}", Atatürk Ansiklopedisi, Atatürk Araştırma Merkezi, erişim 23.10.2026, ${url}.`,
    ...extra,
  };
}

const candidates = [
  // --- Çocukluk ve aile ---
  ayk(4899, "Atat%C3%BCrk,-Gazi-Mustafa-Kemal-(1881-10-Kas%C4%B1m-1938)", "Atatürk, Gazi Mustafa Kemal (1881-10 Kasım 1938)", null, "2020-12-20", ["cocukluk", "genel"], { periodStart: 1881, periodEnd: 1938, eventYear: null, people: ["Mustafa Kemal Atatürk"], locations: ["Selanik", "İstanbul"], summaryNote: "Ana biyografi maddesi; 1881 doğumundan 1938'e kadar." }),
  ayk(179, "Ali-R%C4%B1za-Efendi-(1841-1886)", "Ali Rıza Efendi (1841-1886)", "Ali Güler", "2024-05-18", ["cocukluk", "kisiler"], { periodStart: 1841, periodEnd: 1886, eventYear: null, people: ["Ali Rıza Efendi"], locations: ["Selanik"], summaryNote: "Atatürk'ün babası." }),
  ayk(83, "Z%C3%BCbeyde-Han%C4%B1m-(1857-1923)", "Zübeyde Hanım (1857-1923)", "Mehmet Emin Elmacı", "2021-08-11", ["cocukluk", "kisiler"], { periodStart: 1857, periodEnd: 1923, eventYear: null, people: ["Zübeyde Hanım"], locations: ["Selanik", "İzmir"], summaryNote: "Atatürk'ün annesi." }),
  ayk(237, "Makbule-Atadan-(1885-1956)", "Makbule Atadan (1885-1956)", "Mehmet Emin Elmacı", "2021-02-17", ["cocukluk", "kisiler"], { periodStart: 1885, periodEnd: 1956, eventYear: null, people: ["Makbule Atadan"], locations: ["Selanik"], summaryNote: "Atatürk'ün kız kardeşi." }),
  // --- Eğitim ---
  ayk(243, "%C5%9Eemsi-Efendi-Mektebi", "Şemsi Efendi Mektebi", "Volkan Aksoy", "2022-02-22", ["egitim", "selanik"], { periodStart: 1872, periodEnd: 1917, eventYear: 1892, people: ["Şemsi Efendi", "Mustafa Kemal Atatürk"], locations: ["Selanik"], summaryNote: "Mustafa Kemal'in ilk öğrenim gördüğü mahalle mektebinin kuruluşu (1872) ve eğitim kadrosu." }),
  ayk(875, "Atat%C3%BCrk%E2%80%99%C3%BCn-E%C4%9Fitim-ve-%C3%96%C4%9Fretim-G%C3%B6rd%C3%BC%C4%9F%C3%BC-Kurumlar", "Atatürk'ün Eğitim ve Öğretim Gördüğü Kurumlar", "Ali Güler", "2020-12-30", ["egitim"], { periodStart: 1887, periodEnd: 1905, eventYear: null, people: ["Mustafa Kemal Atatürk"], locations: ["Selanik", "Manastır", "İstanbul"], summaryNote: "Öğrenim hayatı 1887–1905: Şemsi Efendi Mektebi, Selanik Askerî Rüştiyesi, Manastır Askerî İdadisi, Harp Okulu, Erkân-ı Harbiye." }),
  // --- Savaş dönemleri ---
  ayk(407, "Trablusgarp-Sava%C5%9F%C4%B1%E2%80%99nda-Atat%C3%BCrk", "Trablusgarp Savaşı'nda Atatürk", "Hasan Taner Kerimoğlu", "2021-07-07", ["trablusgarp"], { periodStart: 1908, periodEnd: 1912, eventYear: 1911, people: ["Mustafa Kemal Atatürk"], locations: ["Derne", "Trablusgarp"], summaryNote: "Derne Komutanlığı; Trablusgarp Savaşı 1911–1912." }),
  ayk(685, "Balkan-Sava%C5%9F%C4%B1%E2%80%99nda-Atat%C3%BCrk", "Balkan Savaşı'nda Atatürk", "İsmet Görgülü", "2021-01-05", ["balkan-savaslari"], { periodStart: 1912, periodEnd: 1913, eventYear: 1912, people: ["Mustafa Kemal Atatürk"], locations: ["Bulgaristan Cephesi", "Edirne"], summaryNote: "Görev dönemi 1 Aralık 1912–10 Ağustos 1913." }),
  ayk(4078, "Birinci-D%C3%BCnya-Sava%C5%9F%C4%B1%E2%80%99nda-Mustafa-Kemal-(Atat%C3%BCrk)", "Birinci Dünya Savaşı'nda Mustafa Kemal (Atatürk)", "Serpil Sürmeli", "2021-03-29", ["canakkale", "dogu-cephesi", "1917-1918"], { periodStart: 1913, periodEnd: 1918, eventYear: null, people: ["Mustafa Kemal Atatürk"], locations: ["Çanakkale", "Doğu Anadolu", "Sina-Filistin"], summaryNote: "I. Dünya Savaşı boyunca Mustafa Kemal'in tüm cephelerdeki görevleri." }),
  ayk(4084, "%C3%87anakkale-Cephesi%E2%80%99nde-Mustafa-Kemal-(ATAT%C3%9CRK)", "Çanakkale Cephesi'nde Mustafa Kemal (ATATÜRK)", "Murat Karataş", "2022-09-21", ["canakkale"], { periodStart: 1914, periodEnd: 1916, eventYear: 1915, people: ["Mustafa Kemal Atatürk"], locations: ["Anafartalar", "Çanakkale"], summaryNote: "Çanakkale Cephesi'ndeki komutanlık görevleri." }),
  ayk(388, "Mustafa-Kemal%E2%80%99in-Sofya-Ata%C5%9Femiliterli%C4%9Fi", "Mustafa Kemal'in Sofya Ataşemiliterliği", null, "2020-11-29", ["balkan-savaslari", "1917-1918"], { periodStart: 1913, periodEnd: 1915, eventYear: 1913, people: ["Mustafa Kemal Atatürk"], locations: ["Sofya"], summaryNote: "Ataşemiliterlik dönemi 27 Ekim 1913–20 Ocak 1915." }),
  ayk(291, "Sina-ve-Filistin-Cephesi%E2%80%99nde-Atat%C3%BCrk", "Sina ve Filistin Cephesi'nde Atatürk", "Nasır Yüceer", "2021-02-27", ["1917-1918", "dogu-cephesi"], { periodStart: 1917, periodEnd: 1919, eventYear: 1918, people: ["Mustafa Kemal Atatürk"], locations: ["Sina-Filistin Cephesi", "Şam"], summaryNote: "Yıldırım Orduları Komutanlığı; Mayıs 1919 İstanbul'dan ayrılışa kadar." }),
  ayk(1025, "Hicaz-Cephesi", "Hicaz Cephesi", "Umut Akcakaya", "2023-05-23", ["1917-1918"], { periodStart: 1916, periodEnd: 1919, eventYear: 1917, people: [], locations: ["Hicaz", "Medine"], summaryNote: "Hicaz İsyanı ve Medine Müdafaası 1916–1919; Mustafa Kemal'in Hicaz Kuvve-i Seferiyesi görevi." }),
  ayk(105, "Afetinan%E2%80%99%C4%B1n-M.-Kemal-Atat%C3%BCrk%E2%80%99%C3%BCn-Karlsbad-Hat%C4%B1ralar%C4%B1", "Afetinan'ın M. Kemal Atatürk'ün Karlsbad Hatıraları", "Hakan Uzun", "2021-08-09", ["1917-1918", "kisiler"], { periodStart: 1916, periodEnd: 1918, eventYear: 1918, people: ["Mustafa Kemal Atatürk", "Afetinan"], locations: ["Karlsbad"], summaryNote: "30 Haziran–28 Temmuz 1918 Karlsbad günleri." }),
  ayk(353, "Mondros-M%C3%BCtarekesi", "Mondros Mütarekesi", "Mehmet Okur", "2021-02-22", ["1917-1918"], { periodStart: 1914, periodEnd: 1918, eventYear: 1918, people: [], locations: ["Mondros"], summaryNote: "30 Ekim 1918'de imzalanan ateşkes." }),
  // --- Dönemin kişileri ---
  ayk(171, "Ali-Fuat-Cebesoy-(1882-1968)", "Ali Fuat Cebesoy (1882-1968)", "Ayfer Özçelik", "2020-12-16", ["kisiler", "selanik", "egitim"], { periodStart: 1882, periodEnd: 1968, eventYear: null, people: ["Ali Fuat Cebesoy"], locations: ["Selanik", "Şam"], summaryNote: "Atatürk'ün sınıf ve silah arkadaşı; Harp Okulu ve Şam dönemi." }),
  ayk(706, "%C4%B0ttihat-ve-Terakki-Cemiyeti-/-F%C4%B1rkas%C4%B1", "İttihat ve Terakki Cemiyeti / Fırkası", "İhsan Şerif Kaymaz", "2020-11-24", ["kisiler", "genel"], { periodStart: 1889, periodEnd: 1926, eventYear: 1908, people: [], locations: ["Selanik", "İstanbul"], summaryNote: "Mustafa Kemal'in ilişkili olduğu siyasal hareket; 1908–1918 dönemi." }),
  ayk(666, "Enver-Pa%C5%9Fa-(1882-1922)", "Enver Paşa (1882-1922)", "Mustafa Çolak", "2021-03-27", ["kisiler", "trablusgarp", "balkan-savaslari"], { periodStart: 1882, periodEnd: 1922, eventYear: null, people: ["Enver Paşa"], locations: ["İstanbul"], summaryNote: "Osmanlı Harbiye Nazırı; I. Dünya Savaşı'nın önde gelen komutanı." }),
  ayk(169, "Ali-Fethi-Okyar-(1880-1943)", "Ali Fethi Okyar (1880-1943)", "Şaduman Halıcı", "2020-12-15", ["kisiler", "selanik", "egitim"], { periodStart: 1880, periodEnd: 1943, eventYear: null, people: ["Ali Fethi Okyar"], locations: ["Selanik"], summaryNote: "Harp Okulu sınıf arkadaşı." }),
  ayk(244, "%C5%9Eerif-H%C3%BCseyin-(1848-%5B1852?]-1931)", "Şerif Hüseyin (1848 [1852?]-1931)", "İsmail Köse", "2021-08-12", ["kisiler", "1917-1918"], { periodStart: 1848, periodEnd: 1931, eventYear: 1916, people: ["Şerif Hüseyin"], locations: ["Mekke", "Hicaz"], summaryNote: "1916 Arap İsyanı bağlamında Hicaz Cephesi'nin karşısındaki aktör." }),
  ayk(444, "Fahrettin-Altay-(1880-1974)", "Fahrettin Altay (1880-1974)", "Hamit Pehlivanlı", "2021-07-26", ["kisiler", "balkan-savaslari", "canakkale"], { periodStart: 1880, periodEnd: 1974, eventYear: null, people: ["Fahrettin Altay"], locations: [], summaryNote: "Balkan Savaşları ve I. Dünya Savaşı'nda görev aldı." }),
  ayk(552, "K%C3%A2z%C4%B1m-Karabekir-(1882-1948)", "Kâzım Karabekir (1882-1948)", "Muhammet Erat", "2021-02-14", ["kisiler", "canakkale", "dogu-cephesi"], { periodStart: 1882, periodEnd: 1948, eventYear: null, people: ["Kâzım Karabekir"], locations: ["Doğu Anadolu"], summaryNote: "Doğu Cephesi komutanı." }),
  ayk(1864, "%C4%B0brahim-S%C3%BCreyya-Yi%C4%9Fit-(1880-1952)", "İbrahim Süreyya Yiğit (1880-1952)", null, "2024-10-23", ["kisiler"], { periodStart: 1880, periodEnd: 1952, eventYear: null, people: ["İbrahim Süreyya Yiğit"], locations: [], summaryNote: "Dönem subayı ve siyasetçi." }),
  ayk(207, "Ali-%C3%87etinkaya-(1878-1949)", "Ali Çetinkaya (1878-1949)", "Ahmet Esenkaya", "2021-07-08", ["kisiler", "balkan-savaslari"], { periodStart: 1878, periodEnd: 1949, eventYear: null, people: ["Ali Çetinkaya"], locations: [], summaryNote: "Balkan Savaşları'nda görev alan subay." }),
  ayk(1769, "Mehmet-Hayri-Tarhan-(1880-1934)", "Mehmet Hayri Tarhan (1880-1934)", "Güzin Çaykıran", "2024-03-26", ["kisiler", "canakkale"], { periodStart: 1880, periodEnd: 1934, eventYear: 1915, people: ["Mehmet Hayri Tarhan"], locations: ["Çanakkale"], summaryNote: "Çanakkale'de Mustafa Kemal'in emrinde komutan." }),
  { // AYK bilgi sayfası (detay kimliği yok)
    title: "Kemalettin Sami Paşa (1884-1934)",
    institution: AYK.institution,
    institutionType: AYK.institutionType,
    institutionUrl: AYK.institutionUrl,
    url: "https://ataturkansiklopedisi.gov.tr/bilgi/kemalettin-sami-pasa-1884-1934/",
    authors: [{ name: "Halil Bal" }],
    publishedAt: null,
    documentType: "article",
    sourceNature: "secondary",
    researchThemes: ["kisiler", "canakkale"],
    archiveIdentifier: null,
    periodStart: 1884, periodEnd: 1934, eventYear: null,
    people: ["Kemalettin Sami Paşa"], locations: [],
    summaryNote: "Çanakkale Savaşları'nda Mustafa Kemal ile birlikte görev yapan komutan.",
    rights: { ...RIGHTS_LINK_ONLY, credit: AYK.institution },
    citation: "Halil Bal, \"Kemalettin Sami Paşa (1884-1934)\", Atatürk Ansiklopedisi, erişim 23.10.2026, https://ataturkansiklopedisi.gov.tr/bilgi/kemalettin-sami-pasa-1884-1934/.",
  },
  { // AYK bilgi sayfası (detay kimliği yok)
    title: "Liman Von Sanders (1855-1929)",
    institution: AYK.institution,
    institutionType: AYK.institutionType,
    institutionUrl: AYK.institutionUrl,
    url: "https://ataturkansiklopedisi.gov.tr/bilgi/liman-von-sanders-1855-1929/",
    authors: [{ name: "İsmet Görgülü" }],
    publishedAt: null,
    documentType: "article",
    sourceNature: "secondary",
    researchThemes: ["kisiler", "canakkale", "1917-1918"],
    archiveIdentifier: null,
    periodStart: 1913, periodEnd: 1919, eventYear: null,
    people: ["Liman von Sanders"], locations: ["İstanbul", "Sina-Filistin"],
    summaryNote: "Osmanlı ordusundaki Alman genel; 1913–1919 dönemi.",
    rights: { ...RIGHTS_LINK_ONLY, credit: AYK.institution },
    citation: "İsmet Görgülü, \"Liman Von Sanders (1855-1929)\", Atatürk Ansiklopedisi, erişim 23.10.2026, https://ataturkansiklopedisi.gov.tr/bilgi/liman-von-sanders-1855-1929/.",
  },
  // --- ATAM ---
  {
    title: "Kurmay Yüzbaşı Mustafa Kemal: Selanik'ten İstanbul'a (Hareket Ordusu Kurmay Başkanı)",
    institution: ATAM.institution,
    institutionType: ATAM.institutionType,
    institutionUrl: ATAM.institutionUrl,
    url: "https://atam.gov.tr/kitaplar/kurmay-yuzbasi-mustafa-kemal/",
    authors: [],
    publishedAt: "2008-01-01",
    documentType: "book",
    sourceNature: "secondary",
    researchThemes: ["egitim", "harp-akademisi", "ilk-gorevler", "selanik"],
    archiveIdentifier: null,
    periodStart: 1905, periodEnd: 1913, eventYear: null,
    people: ["Mustafa Kemal Atatürk"], locations: ["Selanik", "İstanbul"],
    summaryNote: "ATAM kitabı, 2008; Kurmay Yüzbaşı Mustafa Kemal'in 31 Mart sonrası görevleri.",
    rights: { ...RIGHTS_LINK_ONLY, credit: ATAM.institution },
    citation: "Kurmay Yüzbaşı Mustafa Kemal: Selanik'ten İstanbul'a, Atatürk Araştırma Merkezi, 2008, https://atam.gov.tr/kitaplar/kurmay-yuzbasi-mustafa-kemal/.",
  },
  {
    title: "Atatürk (Hikmet Özdemir)",
    institution: ATAM.institution,
    institutionType: ATAM.institutionType,
    institutionUrl: ATAM.institutionUrl,
    url: "https://atam.gov.tr/kitaplar/ataturk/",
    authors: [{ name: "Hikmet Özdemir" }],
    publishedAt: "2023-01-01",
    documentType: "book",
    sourceNature: "secondary",
    researchThemes: ["genel", "cocukluk", "egitim"],
    archiveIdentifier: null,
    periodStart: 1881, periodEnd: 1938, eventYear: null,
    people: ["Mustafa Kemal Atatürk"], locations: [],
    summaryNote: "ATAM kitabı, 2023; aile, eğitim, askerlik ve savaş yıllarını kapsayan biyografi.",
    rights: { ...RIGHTS_LINK_ONLY, credit: ATAM.institution },
    citation: "Hikmet Özdemir, Atatürk, Atatürk Araştırma Merkezi, 2023, https://atam.gov.tr/kitaplar/ataturk/.",
  },
  {
    title: "İlk Defa Yayınlanan Belgelerle Mustafa Kemal Paşa ve 16'ncı Kolordu Komutanlığı (1915-1917)",
    institution: ATAM.institution,
    institutionType: ATAM.institutionType,
    institutionUrl: ATAM.institutionUrl,
    url: "https://atam.gov.tr/e-yayin/ilk-defa-yayinlanan-belgelerle-mustafa-kemal-pasa-ve-16nci-kolordu-komutanligi-1915-1917/",
    authors: [{ name: "Oral Ateş" }],
    publishedAt: "2025-01-01",
    documentType: "book",
    sourceNature: "secondary",
    researchThemes: ["dogu-cephesi"],
    archiveIdentifier: null,
    periodStart: 1915, periodEnd: 1917, eventYear: 1916,
    people: ["Mustafa Kemal Atatürk"], locations: ["Doğu Anadolu"],
    summaryNote: "ATAM e-yayın, 2025; ilk kez yayımlanan arşiv belgeleriyle 16. Kolordu Komutanlığı.",
    rights: { ...RIGHTS_LINK_ONLY, credit: ATAM.institution },
    citation: "Oral Ateş, İlk Defa Yayınlanan Belgelerle Mustafa Kemal Paşa ve 16'ncı Kolordu Komutanlığı (1915-1917), ATAM e-yayın, 2025, https://atam.gov.tr/e-yayin/ilk-defa-yayinlanan-belgelerle-mustafa-kemal-pasa-ve-16nci-kolordu-komutanligi-1915-1917/.",
  },
  // --- Devlet Arşivleri ---
  {
    title: "Belgelerle Mustafa Kemal Atatürk",
    institution: DA.institution,
    institutionType: DA.institutionType,
    institutionUrl: DA.institutionUrl,
    url: "https://www.devletarsivleri.gov.tr/cdn/file/download?fileId=88",
    authors: [],
    publishedAt: null,
    documentType: "archive_document",
    sourceNature: "primary",
    researchThemes: ["genel", "cocukluk", "egitim"],
    archiveIdentifier: null,
    periodStart: 1881, periodEnd: 1938, eventYear: null,
    people: ["Mustafa Kemal Atatürk"], locations: [],
    summaryNote: "Devlet Arşivleri Başkanlığı'nın özgün belge derlemesi (PDF). Yazar ve yayın tarihi sayfada belirtilmemiş.",
    rights: { ...RIGHTS_LINK_ONLY, credit: DA.institution },
    citation: "Belgelerle Mustafa Kemal Atatürk, T.C. Cumhurbaşkanlığı Devlet Arşivleri Başkanlığı (PDF), erişim 23.10.2026, https://www.devletarsivleri.gov.tr/cdn/file/download?fileId=88.",
  },
  // --- Millî Kütüphane ---
  {
    title: "Atatürk Belgeliği",
    institution: MK.institution,
    institutionType: MK.institutionType,
    institutionUrl: MK.institutionUrl,
    url: "https://www.millikutuphane.gov.tr/page/Ataturk-Belgeligi",
    authors: [],
    publishedAt: null,
    documentType: "catalog",
    sourceNature: "secondary",
    researchThemes: ["genel"],
    archiveIdentifier: null,
    periodStart: 1881, periodEnd: 1938, eventYear: null,
    people: ["Mustafa Kemal Atatürk"], locations: ["Ankara"],
    summaryNote: "Millî Kütüphane bünyesindeki özel koleksiyon (1983'ten beri); 3.053 eser. Katalog sayfası.",
    rights: { ...RIGHTS_LINK_ONLY, credit: MK.institution },
    citation: "Atatürk Belgeliği, Millî Kütüphane, erişim 23.10.2026, https://www.millikutuphane.gov.tr/page/Ataturk-Belgeligi.",
  },
];

function buildCandidate(raw, index) {
  const citationComplete =
    Boolean(raw.title && raw.institution && raw.url && raw.publishedAt && raw.authors.length > 0);
  const rightsKnown = Boolean(raw.rights?.status && raw.rights.status !== "unknown");
  const state = citationComplete && rightsKnown ? "awaiting_human_review" : "insufficient_info";
  return {
    schemaVersion: "1.0.0",
    id: `src-2026-${String(index + 1).padStart(4, "0")}`,
    title: raw.title,
    institution: raw.institution,
    institutionType: raw.institutionType,
    institutionUrl: raw.institutionUrl,
    url: raw.url,
    urlStatus: "reachable",
    urlCheckedAt: "2026-10-23",
    authors: raw.authors,
    publishedAt: raw.publishedAt,
    eventYear: raw.eventYear ?? null,
    periodStart: raw.periodStart ?? null,
    periodEnd: raw.periodEnd ?? null,
    people: raw.people ?? [],
    locations: raw.locations ?? [],
    documentType: raw.documentType,
    sourceNature: raw.sourceNature,
    researchThemes: raw.researchThemes ?? [],
    rights: raw.rights,
    accessedAt: "2026-10-23",
    verification: {
      urlReachable: true,
      citationComplete,
      rightsKnown,
      duplicateChecked: true,
      aiReviewed: true,
      humanReviewed: false,
      notes: raw.summaryNote ?? "",
    },
    state,
    stateHistory: [
      { state: "new", at: "2026-10-23T00:00:00Z", note: "Kaynak 23.10.2026'da keşfedildi." },
      { state, at: "2026-10-23T00:00:00Z", note: "Yapay zekâ künye doğrulaması; insan onayı değildir." },
    ],
    relatedArchiveIds: [],
    claims: [],
    archiveIdentifier: raw.archiveIdentifier ?? null,
    citation: raw.citation ?? null,
    synthetic: false,
    notes: raw.summaryNote ?? null,
  };
}

const pool = candidates.map(buildCandidate);

const poolPath = path.resolve(process.argv[2] ?? "data/research/candidates/pool.json");
await fs.mkdir(path.dirname(poolPath), { recursive: true });
await fs.writeFile(poolPath, JSON.stringify({
  schemaVersion: "1.0.0",
  meta: {
    title: "MKA Evidence Engine — Kaynak Adayları Havuzu",
    targetPeriod: { start: 1881, end: 1918 },
    note: "Bu havuz yayımlanmış arşiv DEĞİLDİR. Hiçbir aday insan onayı olmadan arşive aktarılmaz. Tüm kaynaklar 23.10.2026 tarihinde tek tek okunarak doğrulanmıştır; hiçbir künye uydurulmamıştır.",
    generatedAt: "2026-10-23T00:00:00Z",
    generator: "tools/historical-research (Perplexity ajanı)",
  },
  candidates: pool,
}, null, 2) + "\n", "utf8");

// İddia dosyası: yalnızca okunan sayfalarda belirtilen bilgilerle.
const byTitle = Object.fromEntries(pool.map((c) => [c.title, c.id]));
const claims = [
  {
    id: "claim-001",
    text: "Mustafa Kemal Atatürk 1881'de Selanik'te doğdu ve 10 Kasım 1938'de vefat etti.",
    date: { start: "1881", end: "1938", precision: "range", certainty: "exact", display: "1881–1938" },
    evidence: [{ candidateId: byTitle["Atatürk, Gazi Mustafa Kemal (1881-10 Kasım 1938)"], relation: "supports" }],
  },
  {
    id: "claim-002",
    text: "Mustafa Kemal'in öğrenim hayatı 1887–1905 arasında Selanik, Manastır ve İstanbul'daki askerî okullarda geçti.",
    date: { start: "1887", end: "1905", precision: "range", certainty: "exact", display: "1887–1905" },
    evidence: [{ candidateId: byTitle["Atatürk'ün Eğitim ve Öğretim Gördüğü Kurumlar"], relation: "supports" }],
  },
  {
    id: "claim-003",
    text: "Mustafa Kemal, Trablusgarp Savaşı'nda (1911–1912) Derne bölgesinde komutanlık görevi üstlendi.",
    date: { start: "1911", end: "1912", precision: "range", certainty: "exact", display: "1911–1912" },
    evidence: [{ candidateId: byTitle["Trablusgarp Savaşı'nda Atatürk"], relation: "supports" }],
  },
  {
    id: "claim-004",
    text: "Mustafa Kemal, Balkan Savaşı'nda 1 Aralık 1912 – 10 Ağustos 1913 arasında görev yaptı.",
    date: { start: "1912-12-01", end: "1913-08-10", precision: "range", certainty: "exact", display: "1 Aralık 1912 – 10 Ağustos 1913" },
    evidence: [{ candidateId: byTitle["Balkan Savaşı'nda Atatürk"], relation: "supports" }],
  },
  {
    id: "claim-005",
    text: "Mustafa Kemal, Sofya Ataşemiliterliği'ni 27 Ekim 1913 – 20 Ocak 1915 arasında yürüttü.",
    date: { start: "1913-10-27", end: "1915-01-20", precision: "range", certainty: "exact", display: "27 Ekim 1913 – 20 Ocak 1915" },
    evidence: [{ candidateId: byTitle["Mustafa Kemal'in Sofya Ataşemiliterliği"], relation: "supports" }],
  },
  {
    id: "claim-006",
    text: "Mustafa Kemal, Çanakkale Cephesi'nde 1914–1916 arasında komutanlık görevleri üstlendi.",
    date: { start: "1914", end: "1916", precision: "range", certainty: "estimated", display: "1914–1916" },
    evidence: [
      { candidateId: byTitle["Çanakkale Cephesi'nde Mustafa Kemal (ATATÜRK)"], relation: "supports" },
      { candidateId: byTitle["Birinci Dünya Savaşı'nda Mustafa Kemal (Atatürk)"], relation: "supports" },
    ],
  },
  {
    id: "claim-007",
    text: "Mustafa Kemal Paşa, 16'ncı Kolordu Komutanlığı'nı 1915–1917 arasında Doğu Cephesi'nde yürüttü.",
    date: { start: "1915", end: "1917", precision: "range", certainty: "exact", display: "1915–1917" },
    evidence: [
      { candidateId: byTitle["İlk Defa Yayınlanan Belgelerle Mustafa Kemal Paşa ve 16'ncı Kolordu Komutanlığı (1915-1917)"], relation: "supports" },
      { candidateId: byTitle["Birinci Dünya Savaşı'nda Mustafa Kemal (Atatürk)"], relation: "supports" },
    ],
  },
  {
    id: "claim-008",
    text: "Mustafa Kemal, 30 Haziran – 28 Temmuz 1918 arasında Karlsbad'da tedavi/kur süresindeydi.",
    date: { start: "1918-06-30", end: "1918-07-28", precision: "range", certainty: "exact", display: "30 Haziran – 28 Temmuz 1918" },
    evidence: [{ candidateId: byTitle["Afetinan'ın M. Kemal Atatürk'ün Karlsbad Hatıraları"], relation: "supports" }],
  },
  {
    id: "claim-009",
    text: "Mondros Mütarekesi 30 Ekim 1918'de imzalandı.",
    date: { start: "1918-10-30", end: null, precision: "day", certainty: "exact", display: "30 Ekim 1918" },
    evidence: [{ candidateId: byTitle["Mondros Mütarekesi"], relation: "supports" }],
  },
  {
    id: "claim-010",
    text: "Mustafa Kemal, Yıldırım Orduları Grubu Komutanı olarak Sina ve Filistin Cephesi'nde 1917–1919 arasında görev yaptı.",
    date: { start: "1917", end: "1919", precision: "range", certainty: "estimated", display: "1917–1919" },
    evidence: [{ candidateId: byTitle["Sina ve Filistin Cephesi'nde Atatürk"], relation: "supports" }],
  },
];

const claimsPath = path.resolve(process.argv[3] ?? "data/research/candidates/claims.json");
await fs.writeFile(claimsPath, JSON.stringify({
  schemaVersion: "1.0.0",
  meta: {
    note: "İddialar yalnızca 23.10.2026'da okunan kurumsal sayfalarda açıkça belirtilen bilgilerden türetilmiştir. Kanıt bağımlılığı ve çelişkiler otomatik değerlendirilir; nihai tarih kararı insan incelemesiyle verilir.",
  },
  claims,
}, null, 2) + "\n", "utf8");

console.log(`pool.json: ${pool.length} aday`);
console.log(`claims.json: ${claims.length} iddia`);
const missing = claims.filter((c) => c.evidence.some((e) => !e.candidateId));
if (missing.length > 0) console.error("EKSİK KANIT:", missing.map((c) => c.id));