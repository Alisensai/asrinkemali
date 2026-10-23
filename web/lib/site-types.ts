export type LinkItem = { label: string; href: string };

export type HeroSlide = {
  eyebrow: string;
  title: string;
  summary: string;
  primaryAction: LinkItem;
  secondaryAction: LinkItem;
  image?: { src: string; alt: string; isIllustrative: boolean };
};

export type Shortcut = LinkItem & { description: string; image?: { src: string; alt: string } };

export type Publication = {
  id: string;
  category: string;
  title: string;
  publishedAt: string;
  href: string;
  image?: { src: string; alt: string; isIllustrative: boolean };
};

export type ChronologyEntry = { year: string; description: string; href?: string };

export type ArchiveRecord = {
  id: string;
  title: string;
  type: "belge" | "fotoğraf" | "kitap" | "süreli-yayın";
  date: string;
  description: string;
  source: string;
  license: string;
  image?: { src: string; alt: string; isIllustrative: boolean };
  verificationStatus: "taslak" | "doğrulandı" | "inceleme-gerekli";
};
