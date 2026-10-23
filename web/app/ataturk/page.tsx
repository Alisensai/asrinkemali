import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = { title: "Atatürk", description: "Mustafa Kemal Atatürk'e ilişkin kaynaklı içerikler için hazırlanan bölüm.", alternates: { canonical: "/ataturk" } };
export default function AtaturkPage() { return <ContentPage eyebrow="KAYNAKLI İÇERİK POLİTİKASI" title="ATATÜRK"><div className="empty-state page-empty"><h2>İçerik hazırlığı sürüyor.</h2><p>Yaşam öyküsü, konuşmalar ve dönemsel bağlam; birincil kaynak, yayın künyesi ve kullanım hakkı bilgileriyle birlikte yayımlanacaktır.</p></div></ContentPage>; }
