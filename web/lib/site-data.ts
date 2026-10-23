import type { ChronologyEntry, HeroSlide, LinkItem, Publication, Shortcut } from "./site-types";

export const primaryNavigation: LinkItem[] = [
  { label: "Ana sayfa", href: "/" }, { label: "Atatürk", href: "/ataturk" },
  { label: "Kronoloji", href: "#kronoloji" }, { label: "Arşiv", href: "#arsiv" },
  { label: "Belgeler", href: "#arsiv" }, { label: "Fotoğraflar", href: "#arsiv" },
  { label: "Yayınlar", href: "#yayinlar" }, { label: "Akademi", href: "#akademi" },
];

export const heroSlides: HeroSlide[] = [{
  eyebrow: "Bağımsız tarih ve kültür platformu",
  title: "ASRIN KEMALİ",
  summary: "Kaynaklı tarih içeriği için geliştirilen açık, erişilebilir bir altyapı.",
  primaryAction: { label: "Arşivi keşfet", href: "#arsiv" },
  secondaryAction: { label: "Kronolojiyi incele", href: "#kronoloji" },
  image: { src: "/assets/ataturk-hero-temsili.webp", alt: "Temsili Atatürk portresi", isIllustrative: true },
}];

export const shortcuts: Shortcut[] = [
  { label: "Fotoğraf arşivi", href: "#arsiv", description: "Kaynaklı görsel kayıtlar" },
  { label: "Belge merkezi", href: "#arsiv", description: "Doğrulanmış belgeler" },
  { label: "Dijital kütüphane", href: "#arsiv", description: "Açık yayınlar" },
  { label: "Tarih kronolojisi", href: "#kronoloji", description: "Zaman çizelgesi" },
];

export const publications: Publication[] = [];
export const chronology: ChronologyEntry[] = [];
