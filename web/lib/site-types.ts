export type LinkItem = { label: string; href: string };

export type SiteImage = { src: string; alt: string; isIllustrative: boolean };

export type HeroSlide = {
  id: string;
  eyebrow: string;
  pretitle: string;
  title: string;
  summary: string;
  primaryAction: LinkItem;
  secondaryAction: LinkItem;
  image: SiteImage;
};

export type Shortcut = LinkItem & {
  kicker: string;
  image: SiteImage;
  icon: "image" | "document" | "book" | "map";
};

export type Publication = {
  id: string;
  category: string;
  title: string;
  publishedAt: string;
  href: string;
  image: SiteImage;
  source: string;
};

export type ChronologyEntry = { year: string; description: string; source: string; href?: string };

export type ArchiveRecord = {
  id: string;
  slug: string;
  title: string;
  type: "belge" | "fotoğraf" | "kitap" | "süreli-yayın";
  date: string;
  description: string;
  source: string;
  license: string;
  image?: SiteImage;
  verificationStatus: "taslak" | "doğrulandı" | "inceleme-gerekli";
};

export type ArchiveCollection = {
  type: string;
  title: string;
  description: string;
  status: string;
  href: string;
  image: SiteImage;
};

export type SearchItem = { title: string; kind: string; href: string; keywords: string };
