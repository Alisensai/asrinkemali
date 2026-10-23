import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ContentPage";
import { getPublishedArchiveRecord, getPublishedArchiveRecords, reviewLabel, typeLabel } from "@/lib/archive";
import styles from "../../content-platform.module.css";

export function generateStaticParams() { return getPublishedArchiveRecords().map((record) => ({ slug: record.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const record = getPublishedArchiveRecord(slug); if (!record) return { title: "Kayıt bulunamadı", robots: { index: false, follow: false } }; return { title: record.title, description: record.summary, alternates: { canonical: `/arsiv/${record.slug}` }, robots: { index: false, follow: true }, openGraph: { type: "article", locale: "tr_TR", title: record.title, description: record.summary, url: `/arsiv/${record.slug}` } }; }

export default async function ArchiveDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const record = getPublishedArchiveRecord(slug); if (!record) notFound();
  return <ContentPage eyebrow={typeLabel(record.type).toLocaleUpperCase("tr-TR")} title={record.title}><article className={styles.detail}>
    <span className={styles.reviewBadge}>{reviewLabel(record.verification.status)}</span><p>{record.description ?? record.summary}</p>
    <dl className={styles.details}><dt>Kayıt numarası</dt><dd>{record.id}</dd><dt>Tarih</dt><dd>{record.date.display}{record.date.certainty === "estimated" ? " (tahmini)" : ""}</dd><dt>Tür</dt><dd>{typeLabel(record.type)}</dd>
      {record.locations.length ? <><dt>Yer</dt><dd>{record.locations.map((location) => location.city ?? location.name).join(", ")}</dd></> : null}
      <dt>Kaynak kurum</dt><dd>{record.source.institution}</dd><dt>Kaynak künyesi</dt><dd>{record.source.citation ?? record.source.title}</dd>
      <dt>Orijinal kaynak</dt><dd><a className={styles.externalLink} href={record.source.url} target="_blank" rel="noopener noreferrer external">Kurumsal kaynak sayfasını aç</a></dd>
      <dt>Kullanım hakkı</dt><dd>{record.rights.status.replaceAll("_", " ")} — {record.rights.note}{record.rights.licenseUrl ? <> · <a className={styles.externalLink} href={record.rights.licenseUrl} target="_blank" rel="noopener noreferrer external">Lisans koşulları</a></> : null}</dd>
      <dt>İnceleme durumu</dt><dd>{reviewLabel(record.verification.status)}{record.verification.reviewedBy ? ` — ${record.verification.reviewedBy}` : ""}</dd><dt>Kategoriler</dt><dd>{record.categories.join(", ")}</dd>
    </dl><p className={styles.notice}>Bu katalog kaydı dosya indirme hizmeti sunmaz. Kaynağa yalnız yukarıdaki kurumsal dış bağlantı üzerinden erişilir.</p>
  </article></ContentPage>;
}
