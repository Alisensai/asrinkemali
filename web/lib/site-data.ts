import type { ArchiveCollection, ArchiveRecord, ChronologyEntry, HeroSlide, LinkItem, Publication, SearchItem, Shortcut } from "./site-types";

export const primaryNavigation: LinkItem[] = [
  { label: "Ana sayfa", href: "/" },
  { label: "Atatürk", href: "/ataturk" },
  { label: "Kronoloji", href: "/kronoloji" },
  { label: "Arşiv", href: "/arsiv" },
  { label: "Belgeler", href: "/arsiv?tur=belge" },
  { label: "Fotoğraflar", href: "/arsiv?tur=fotograf" },
  { label: "Yayınlar", href: "/yayinlar" },
  { label: "Hakkımızda", href: "/hakkimizda" },
];

const heroImage = {
  src: "/assets/ataturk-hero-temsili.webp",
  alt: "Mustafa Kemal Atatürk'ü betimleyen temsili yapay zekâ canlandırması",
  isIllustrative: true,
} as const;

export const heroSlides: HeroSlide[] = [
  { id: "ataturk", eyebrow: "BAĞIMSIZ TARİH VE KÜLTÜR PLATFORMU", pretitle: "GAZİ MUSTAFA KEMAL", title: "ATATÜRK", summary: "Yaşamı, düşünce dünyası ve dönemine ilişkin kaynaklı içerikler için hazırlanan dijital rehber.", primaryAction: { label: "Arşivi keşfet", href: "/arsiv" }, secondaryAction: { label: "Kronolojiyi incele", href: "/kronoloji" }, image: heroImage },
  { id: "arsiv", eyebrow: "KAYNAK, LİSANS VE PROVENANS ODAKLI", pretitle: "TARİHİN İZİNDE", title: "ARŞİV", summary: "Katalog sayıları gerçek arşiv verisinden hesaplanır; erişilebilir kayıtlar insan tarih uzmanı incelemesi bekler.", primaryAction: { label: "Arşivi keşfet", href: "/arsiv" }, secondaryAction: { label: "Proje ilkeleri", href: "/hakkimizda" }, image: heroImage },
  { id: "hafiza", eyebrow: "BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI", pretitle: "GEÇMİŞTEN GELECEĞE", title: "HAFIZA", summary: "Tarihî materyali bağlamından koparmadan korumayı ve erişilebilir kılmayı amaçlayan bağımsız proje.", primaryAction: { label: "Hakkımızda", href: "/hakkimizda" }, secondaryAction: { label: "Yayınlar", href: "/yayinlar" }, image: heroImage },
  { id: "kutuphane", eyebrow: "DOĞRULANMIŞ KAYNAKLAR İÇİN HAZIRLANIYOR", pretitle: "BİRİNCİL KAYNAKLAR", title: "KÜTÜPHANE", summary: "Açık erişimli metin ve katalog bağlantıları, telif ve kaynak incelemesinin ardından yayımlanacak.", primaryAction: { label: "Katalog durumu", href: "/arsiv?tur=kitap" }, secondaryAction: { label: "Proje ilkeleri", href: "/hakkimizda" }, image: heroImage },
];

export const shortcuts: Shortcut[] = [
  { label: "Arşivi", kicker: "Fotoğraf", href: "/arsiv?tur=fotograf", icon: "image", image: { src: "/assets/fotograf-arsivi.webp", alt: "Temsili fotoğraf arşivi kolajı", isIllustrative: true } },
  { label: "Merkezi", kicker: "Belge", href: "/arsiv?tur=belge", icon: "document", image: { src: "/assets/belge-merkezi.webp", alt: "Temsili belge görseli", isIllustrative: true } },
  { label: "Kütüphane", kicker: "Dijital", href: "/arsiv?tur=kitap", icon: "book", image: { src: "/assets/dijital-kutuphane.webp", alt: "Temsili dijital kütüphane görseli", isIllustrative: true } },
  { label: "Kronolojisi", kicker: "Tarih", href: "/kronoloji", icon: "map", image: { src: "/assets/tarih-atlasi.webp", alt: "Temsili tarih atlası görseli", isIllustrative: true } },
];

export const archiveCollections: ArchiveCollection[] = [
  { type: "FOTOĞRAF", title: "Fotoğraf Koleksiyonu", description: "Kurumsal kaynak sayfalarına yönlendiren, dosya barındırmayan fotoğraf kayıtları.", status: "Katalogdan hesaplanıyor", href: "/arsiv?tur=fotograf", image: { src: "/assets/fotograf-arsivi.webp", alt: "Temsili fotoğraf koleksiyonu", isIllustrative: true } },
  { type: "BELGE", title: "Belge ve Yazışmalar", description: "Kaynak künyesi ve kullanım hakkı bilgisi bulunan belge kataloğu.", status: "Katalogdan hesaplanıyor", href: "/arsiv?tur=belge", image: { src: "/assets/belge-merkezi.webp", alt: "Temsili belge koleksiyonu", isIllustrative: true } },
  { type: "KÜTÜPHANE", title: "Dijital Kütüphane", description: "Kurumsal kataloglardaki kitap ve yayınlara güvenli dış bağlantılar.", status: "Katalogdan hesaplanıyor", href: "/arsiv?tur=yayin", image: { src: "/assets/dijital-kutuphane.webp", alt: "Temsili dijital kütüphane", isIllustrative: true } },
];

export const publications: Publication[] = [];
export const chronology: ChronologyEntry[] = [];
export const archiveRecords: ArchiveRecord[] = [];

export const searchItems: SearchItem[] = [
  { title: "Atatürk bölümü", kind: "Sayfa", href: "/ataturk", keywords: "mustafa kemal yaşam dönem" },
  { title: "Tarih kronolojisi", kind: "Sayfa", href: "/kronoloji", keywords: "kronoloji zaman çizgisi tarih" },
  { title: "Arşiv", kind: "Sayfa", href: "/arsiv", keywords: "belge fotoğraf kitap koleksiyon" },
  { title: "Yayınlar", kind: "Sayfa", href: "/yayinlar", keywords: "araştırma makale yayın" },
  { title: "Tarihte Bugün", kind: "Sayfa", href: "/tarihte-bugun", keywords: "gün ay kaynaklı olay tarih" },
  { title: "Hakkımızda", kind: "Sayfa", href: "/hakkimizda", keywords: "bağımsız proje ilkeler" },
];
