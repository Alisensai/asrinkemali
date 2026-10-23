import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { normalizeTurkish } from "@/lib/archive";
import { publicationKindLabel } from "@/lib/publishing/model";
import { getPublicationCategories, getPublishedPublications } from "@/lib/publishing/repository";
import type { PublicationKind } from "../../../schemas/publication-record.types";
import styles from "../publishing.module.css";

type SearchParams = Record<string, string | string[] | undefined>;
const KINDS: PublicationKind[] = ["research_article", "biography", "historical_analysis", "sourced_article"];
export const metadata: Metadata = { title: "Yayınlar", description: "Kaynakça ve insan editör onayı bulunan araştırma yazıları.", alternates: { canonical: "/yayinlar" } };
function one(value: string | string[] | undefined) { return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? ""; }

export default async function PublicationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams; const category = one(params.kategori); const kindParam = one(params.tur); const kind = KINDS.includes(kindParam as PublicationKind) ? kindParam as PublicationKind : undefined;
  const publications = getPublishedPublications().filter((record) => !category || normalizeTurkish(record.category) === normalizeTurkish(category)).filter((record) => !kind || record.kind === kind);
  return <ContentPage eyebrow="ARAŞTIRMA VE İNCELEME" title="YAYINLAR"><div className={styles.stack}>
    <form action="/yayinlar" method="get" className={styles.filters} aria-label="Yayın filtreleri"><label>Kategori<select name="kategori" defaultValue={category}><option value="">Tüm kategoriler</option>{getPublicationCategories().map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Yayın türü<select name="tur" defaultValue={kind ?? ""}><option value="">Tüm türler</option>{KINDS.map((item) => <option key={item} value={item}>{publicationKindLabel(item)}</option>)}</select></label><div className={styles.actions}><button type="submit">Filtrele</button><Link href="/yayinlar">Temizle</Link></div></form>
    <div className={styles.resultHeader}><h2>Editör onaylı yayınlar</h2><p aria-live="polite">{publications.length} sonuç</p></div>
    {publications.length ? <ul className={styles.cards}>{publications.map((record) => <li key={record.id}><Link href={`/yayinlar/${record.slug}`} className={styles.card}><span>{publicationKindLabel(record.kind)} · {record.category}</span><h2>{record.title}</h2><p>{record.summary}</p><small>{record.authors.join(", ")} · {new Date(record.publishedAt!).toLocaleDateString("tr-TR")}</small></Link></li>)}</ul> : <div className="empty-state page-empty"><h2>Henüz doğrulanmış yayın bulunmuyor.</h2><p>Bu filtrelerde kaynakça ve insan editör incelemesi tamamlanmış yayın yok; taslaklar gösterilmez.</p></div>}
  </div></ContentPage>;
}
