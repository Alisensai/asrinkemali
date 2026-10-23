import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { getPublishedArchiveRecords } from "@/lib/archive";
import { prepareTodayBrief } from "@/lib/publishing/today";
import styles from "../publishing.module.css";

type SearchParams = Record<string, string | string[] | undefined>;
export const metadata: Metadata = { title: "Tarihte Bugün", description: "Gün ve aya göre kaynak denetiminden geçen tarihî olaylar.", alternates: { canonical: "/tarihte-bugun" } };
function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function integer(value: string | undefined, min: number, max: number) { if (!value || !/^\d{1,2}$/.test(value)) return undefined; const parsed = Number(value); return parsed >= min && parsed <= max ? parsed : undefined; }
function istanbulToday() { const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", month: "numeric", day: "numeric" }).formatToParts(new Date()); return { month: Number(parts.find((part) => part.type === "month")?.value), day: Number(parts.find((part) => part.type === "day")?.value) }; }

export default async function TodayPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams; const today = istanbulToday(); const rawMonth = one(params.ay); const rawDay = one(params.gun); const month = integer(rawMonth, 1, 12) ?? today.month; const day = integer(rawDay, 1, 31) ?? today.day; const invalid = Boolean((rawMonth && !integer(rawMonth, 1, 12)) || (rawDay && !integer(rawDay, 1, 31))); const brief = prepareTodayBrief(getPublishedArchiveRecords(), month, day);
  return <ContentPage eyebrow="KAYNAKLI GÜNLÜK SEÇKİ" title="TARİHTE BUGÜN"><div className={styles.stack}><p className={styles.notice}>Bu bölüm yalnızca gün hassasiyetli, kaynak bağlantılı ve yayın kapısından geçmiş arşiv olaylarını listeler. Otomatik olarak makale yayımlamaz.</p><form action="/tarihte-bugun" method="get" className={styles.filters} aria-label="Tarihte Bugün tarih seçimi"><label>Ay<input name="ay" type="number" min="1" max="12" defaultValue={month} /></label><label>Gün<input name="gun" type="number" min="1" max="31" defaultValue={day} /></label><div className={styles.actions}><button type="submit">Günü göster</button><Link href="/tarihte-bugun">Bugüne dön</Link></div></form>{invalid ? <p className={styles.warning} role="alert">Geçersiz tarih girdisi yok sayıldı; bugünün tarihi gösteriliyor.</p> : null}<div className={styles.resultHeader}><h2>{day}.{month} için kaynaklı olaylar</h2><p aria-live="polite">{brief.candidates.length} sonuç</p></div>{brief.candidates.length ? <ol className={styles.cards}>{brief.candidates.map((event) => <li key={event.archiveId}><Link className={styles.card} href={`/arsiv/${event.slug}`}><span>{event.date} · {event.sourceInstitution}</span><h2>{event.title}</h2><p>{event.summary}</p></Link></li>)}</ol> : <div className="empty-state page-empty"><h2>{brief.message}</h2><p>İncelemedeki kayıtlar veya tarih hassasiyeti yetersiz içerikler sonuçlara eklenmez.</p></div>}</div></ContentPage>;
}
