import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = { title: "Yayınlar", description: "Kaynak incelemesinden geçen araştırma ve yayınlar.", alternates: { canonical: "/yayinlar" } };
export default function PublicationsPage() { return <ContentPage eyebrow="ARAŞTIRMA VE İNCELEME" title="YAYINLAR"><div className="empty-state page-empty"><h2>Henüz doğrulanmış yayın bulunmuyor.</h2><p>Kaynakça ve editör incelemesi tamamlanan çalışmalar burada yayımlanacaktır.</p></div></ContentPage>; }
