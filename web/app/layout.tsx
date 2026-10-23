import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Montserrat, Playfair_Display } from "next/font/google";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const display = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], weight: ["700", "800", "900"], variable: "--font-playfair", display: "swap" });
const body = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const sans = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const canIndex = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ASRIN KEMALİ | Tarih, Hafıza, Miras", template: "%s | ASRIN KEMALİ" },
  description: "Mustafa Kemal Atatürk ve dönemine ilişkin kaynaklı içerikler hazırlayan bağımsız dijital tarih ve kültür platformu.",
  alternates: { canonical: "/" },
  robots: { index: canIndex, follow: canIndex },
  icons: { icon: "/assets/mka-arma.webp" },
  openGraph: { type: "website", locale: "tr_TR", title: "ASRIN KEMALİ", description: "Bağımsız dijital tarih ve kültür platformu.", images: [{ url: "/assets/ataturk-hero-temsili.webp", alt: "ASRIN KEMALİ temsili kapak görseli" }] },
  twitter: { card: "summary_large_image", title: "ASRIN KEMALİ", description: "Bağımsız dijital tarih ve kültür platformu.", images: ["/assets/ataturk-hero-temsili.webp"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr" className={`${display.variable} ${playfair.variable} ${body.variable} ${sans.variable}`}><body><SiteHeader />{children}<Footer /></body></html>;
}
