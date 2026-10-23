import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ContentPage";
import { getPublishedArchiveRecord } from "@/lib/archive";
import { publicationKindLabel } from "@/lib/publishing/model";
import { getPublishedPublication, getPublishedPublications } from "@/lib/publishing/repository";
import styles from "../../publishing.module.css";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return getPublishedPublications().map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const record = getPublishedPublication((await params).slug); if (!record) return { title: "Yayın bulunamadı", robots: { index: false, follow: false } }; return { title: record.title, description: record.summary, alternates: { canonical: `/yayinlar/${record.slug}` }, openGraph: { type: "article", title: record.title, description: record.summary, publishedTime: record.publishedAt ?? undefined } }; }

export default async function PublicationDetailPage({ params }: Props) {
  const record = getPublishedPublication((await params).slug); if (!record) notFound();
  const related = record.relatedArchiveIds.map(getPublishedArchiveRecord).filter((item) => item !== undefined);
  return <ContentPage eyebrow={`${publicationKindLabel(record.kind).toLocaleUpperCase("tr-TR")} · ${record.category.toLocaleUpperCase("tr-TR")}`} title={record.title}><article className={styles.article}>
    <p className={styles.lead}>{record.summary}</p><dl className={styles.meta}><dt>Yazar</dt><dd>{record.authors.join(", ")}</dd><dt>Yayın tarihi</dt><dd><time dateTime={record.publishedAt!}>{new Date(record.publishedAt!).toLocaleDateString("tr-TR")}</time></dd><dt>Lisans</dt><dd>{record.rights.license} · {record.rights.holder}</dd></dl>
    <div className={styles.body}>{record.body.map((block, index) => block.type === "heading" ? <h2 key={`${block.type}-${index}`}>{block.text}</h2> : <p key={`${block.type}-${index}`}>{block.text}</p>)}</div>
    <section aria-labelledby="kaynakca"><h2 id="kaynakca">Kaynakça</h2><ol className={styles.bibliography}>{record.bibliography.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><span>{source.institution} · Erişim: {source.accessedAt}</span></li>)}</ol></section>
    <section aria-labelledby="ilgili-arsiv"><h2 id="ilgili-arsiv">İlgili arşiv kayıtları</h2>{related.length ? <ul className={styles.related}>{related.map((item) => <li key={item.id}><Link href={`/arsiv/${item.slug}`}>{item.title}</Link></li>)}</ul> : <p>Yayıma açık ilişkili arşiv kaydı bulunmuyor.</p>}</section>
  </article></ContentPage>;
}
