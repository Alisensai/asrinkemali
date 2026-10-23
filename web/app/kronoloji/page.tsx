import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = { title: "Kronoloji", description: "Kaynak doğrulamalı tarih kronolojisi hazırlık sayfası.", alternates: { canonical: "/kronoloji" } };
export default function ChronologyPage() { return <ContentPage eyebrow="ZAMAN ÇİZELGESİ" title="KRONOLOJİ"><div className="empty-state page-empty"><h2>Doğrulanmış kayıt bekleniyor.</h2><p>Tarih, olay açıklaması ve kaynak bağlantısı birlikte doğrulanmadan kronoloji kaydı yayımlanmaz.</p></div></ContentPage>; }
