import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { archiveQueryString, archiveStats, getPublishedArchiveRecords, parseArchiveParams, queryArchive, reviewLabel, typeLabel } from "@/lib/archive";
import styles from "../content-platform.module.css";

type SearchParams = Record<string, string | string[] | undefined>;
const TYPE_VALUES = { photograph:"fotograf", document:"belge", speech:"konusma", event:"olay", publication:"yayin", place:"mekan" } as const;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const filtered = Object.values(await searchParams).some(Boolean);
  return { title: "Dijital Arşiv", description: "Kaynak ve kullanım hakkı bilgili Atatürk ve Cumhuriyet dönemi dijital arşiv kataloğu.", alternates: { canonical: "/arsiv" }, robots: filtered ? { index: false, follow: true } : undefined };
}

export default async function ArchivePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filters, warnings } = parseArchiveParams(await searchParams);
  const result = queryArchive(getPublishedArchiveRecords(), filters);
  const stats = archiveStats();
  return <ContentPage eyebrow="DİJİTAL KOLEKSİYON" title="ARŞİV"><div className={styles.stack}>
    <div className={styles.notice} role="note"><strong>{stats.total} kayıt bağlı; {stats.published} kayıt katalogda görüntülenebilir.</strong><p>“Published” durumu insan uzman onayı anlamına gelmez. Görüntülenen kayıtlar kurumsal kaynak bağlantısı ve otomatik denetim taşır; uzman tarihçi incelemesi bekler. {stats.reviewed} incelenen ve {stats.draft} taslak kayıt yayın kapısında tutulur.</p></div>
    <form action="/arsiv" method="get" className={styles.searchForm} aria-label="Arşiv arama ve filtreleri">
      <label className={`${styles.field} ${styles.wideField}`}>Başlık veya anahtar kelime<input type="search" name="q" defaultValue={filters.q} maxLength={120} /></label>
      <label className={styles.field}>Kayıt türü<select name="tur" defaultValue={filters.type ? TYPE_VALUES[filters.type] : ""}><option value="">Tümü</option><option value="fotograf">Fotoğraf</option><option value="belge">Belge</option><option value="konusma">Konuşma</option><option value="olay">Olay</option><option value="yayin">Yayın</option><option value="mekan">Mekân</option></select></label>
      <label className={styles.field}>Kategori<input name="kategori" defaultValue={filters.category} maxLength={120} /></label><label className={styles.field}>Kaynak kurum<input name="kaynak" defaultValue={filters.source} maxLength={120} /></label><label className={styles.field}>Şehir<input name="sehir" defaultValue={filters.city} maxLength={120} /></label>
      <label className={styles.field}>Başlangıç yılı<input type="number" name="baslangic" min="1800" max="2100" defaultValue={filters.yearFrom} /></label><label className={styles.field}>Bitiş yılı<input type="number" name="bitis" min="1800" max="2100" defaultValue={filters.yearTo} /></label>
      <div className={styles.actions}><button className={styles.primaryAction} type="submit">Arşivde ara</button><Link className={styles.secondaryAction} href="/arsiv">Filtreleri temizle</Link></div>
    </form>
    {warnings.length ? <div className={styles.warning} role="status" aria-live="polite">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
    <div className={styles.resultHeader}><h2>Arşiv kayıtları</h2><p aria-live="polite">{result.total} sonuç</p></div>
    {result.items.length ? <ul className={styles.cards}>{result.items.map((record) => <li key={record.id}><Link className={styles.card} href={`/arsiv/${record.slug}`}><span className={styles.cardMeta}><time>{record.date.display}</time><span>{typeLabel(record.type)}</span><span>{record.source.institution}</span></span><h2>{record.title}</h2><p>{record.summary}</p><span className={styles.reviewBadge}>{reviewLabel(record.verification.status)}</span></Link></li>)}</ul> : <div className="empty-state page-empty"><h2>Aramanızla eşleşen yayımlanabilir kayıt bulunmuyor.</h2><p>Filtreleri genişletin. İnceleme ve taslak kayıtlar yayın kapısı nedeniyle sonuçlara eklenmez.</p></div>}
    {result.pageCount > 1 ? <nav className={styles.pagination} aria-label="Arşiv sonuç sayfaları">{result.page > 1 ? <Link href={`/arsiv?${archiveQueryString(filters, result.page - 1)}`}>Önceki</Link> : null}<span>Sayfa {result.page} / {result.pageCount}</span>{result.page < result.pageCount ? <Link href={`/arsiv?${archiveQueryString(filters, result.page + 1)}`}>Sonraki</Link> : null}</nav> : null}
  </div></ContentPage>;
}
