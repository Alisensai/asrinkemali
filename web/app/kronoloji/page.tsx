import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { getPublishedArchiveRecords, reviewLabel } from "@/lib/archive";
import styles from "../content-platform.module.css";

type SearchParams = Record<string, string | string[] | undefined>;
export const metadata: Metadata = { title: "Kronoloji", description: "Kaynak bağlantılı olay kayıtlarını yıl, ay ve güne göre inceleyin.", alternates: { canonical: "/kronoloji" } };
function value(input: string | string[] | undefined) { return Array.isArray(input) ? input[0] : input; }
function numberParam(input: string | string[] | undefined, min: number, max: number) { const raw = value(input); if (!raw || !/^\d+$/.test(raw)) return undefined; const number = Number(raw); return number >= min && number <= max ? number : undefined; }

export default async function ChronologyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams; const year = numberParam(params.yil, 1800, 2100); const month = numberParam(params.ay, 1, 12); const day = numberParam(params.gun, 1, 31); const warnings: string[] = [];
  if (value(params.yil) && !year) warnings.push("Yıl 1800–2100 arasında olmalıdır."); if (value(params.ay) && !month) warnings.push("Ay 1–12 arasında olmalıdır."); if (value(params.gun) && !day) warnings.push("Gün 1–31 arasında olmalıdır.");
  const events = getPublishedArchiveRecords().filter((record) => record.type === "event" && record.date.start).filter((record) => { const [recordYear, recordMonth, recordDay] = record.date.start!.split("-").map(Number); return (!year || recordYear === year) && (!month || recordMonth === month) && (!day || recordDay === day); }).sort((a, b) => (a.date.start ?? "").localeCompare(b.date.start ?? ""));
  return <ContentPage eyebrow="KAYNAKLI ZAMAN ÇİZELGESİ" title="KRONOLOJİ"><div className={styles.stack}><form action="/kronoloji" method="get" className={styles.searchForm} aria-label="Kronoloji tarih filtreleri"><label className={styles.field}>Yıl<input name="yil" type="number" min="1800" max="2100" defaultValue={year} /></label><label className={styles.field}>Ay<input name="ay" type="number" min="1" max="12" defaultValue={month} /></label><label className={styles.field}>Gün<input name="gun" type="number" min="1" max="31" defaultValue={day} /></label><div className={styles.actions}><button className={styles.primaryAction} type="submit">Tarihi filtrele</button><Link className={styles.secondaryAction} href="/kronoloji">Filtreleri temizle</Link></div></form>
    {warnings.length ? <div className={styles.warning} role="status">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}<div className={styles.resultHeader}><h2>Kaynaklı olaylar</h2><p>{events.length} sonuç</p></div>
    {events.length ? <ol className={styles.cards}>{events.map((record) => <li key={record.id}><Link className={styles.card} href={`/arsiv/${record.slug}`}><span className={styles.cardMeta}><time>{record.date.display}</time><span>{record.source.institution}</span></span><h2>{record.title}</h2><p>{record.summary}</p><span className={styles.reviewBadge}>{reviewLabel(record.verification.status)}</span></Link></li>)}</ol> : <div className="empty-state page-empty"><h2>Seçilen tarih için yayımlanabilir olay bulunmuyor.</h2><p>İnceleme veya taslak durumundaki kayıtlar yayın kapısı nedeniyle gösterilmez.</p></div>}
  </div></ContentPage>;
}
