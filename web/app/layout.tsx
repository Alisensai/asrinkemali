import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASRIN KEMALİ",
  description: "Bağımsız tarih ve kültür platformu.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
