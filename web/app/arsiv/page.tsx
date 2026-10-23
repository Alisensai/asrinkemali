import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = { title: "Arşiv", description: "Kaynak ve lisans denetimli dijital arşiv.", alternates: { canonical: "/arsiv" } };
const labels: Record<string, string> = { belge: "belge", fotograf: "fotoğraf", kitap: "kitap" };
export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ tur?: string }> }) { const { tur } = await searchParams; const selected = tur && labels[tur] ? labels[tur] : "arşiv"; return <ContentPage eyebrow="DİJİTAL KOLEKSİYON" title="ARŞİV"><nav className="archive-page-filters" aria-label="Arşiv türleri"><Link href="/arsiv">Tümü</Link><Link href="/arsiv?tur=fotograf">Fotoğraf</Link><Link href="/arsiv?tur=belge">Belge</Link><Link href="/arsiv?tur=kitap">Kitap</Link></nav><div className="empty-state page-empty"><h2>Doğrulanmış {selected} kaydı bulunmuyor.</h2><p>Kayıtlar kaynak, lisans, tarih ve provenans denetimi tamamlandıktan sonra yayımlanacaktır.</p></div></ContentPage>; }
