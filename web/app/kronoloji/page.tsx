import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { Icon } from "@/components/Icon";
import { getPublishedArchiveRecords, reviewLabel } from "@/lib/archive";
import styles from "../content-platform.module.css";

type SearchParams = Record<string, string | string[] | undefined>;
export const metadata: Metadata = {
  title: "Kronoloji",
  description: "Kaynak bağlantılı olay kayıtlarını yıl, ay ve güne göre inceleyin.",
  alternates: { canonical: "/kronoloji" },
};

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function numberParam(input: string | string[] | undefined, min: number, max: number) {
  const raw = value(input);
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const number = Number(raw);
  return number >= min && number <= max ? number : undefined;
}

const HISTORIC_YEARS = [1881, 1919, 1920, 1921, 1922, 1923, 1924, 1928, 1930, 1933, 1938];

export default async function ChronologyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const year = numberParam(params.yil, 1800, 2100);
  const month = numberParam(params.ay, 1, 12);
  const day = numberParam(params.gun, 1, 31);
  const warnings: string[] = [];

  if (value(params.yil) && !year) warnings.push("Yıl 1800–2100 arasında olmalıdır.");
  if (value(params.ay) && !month) warnings.push("Ay 1–12 arasında olmalıdır.");
  if (value(params.gun) && !day) warnings.push("Gün 1–31 arasında olmalıdır.");

  const events = getPublishedArchiveRecords()
    .filter((record) => record.type === "event" && record.date.start)
    .filter((record) => {
      const [recordYear, recordMonth, recordDay] = record.date.start!.split("-").map(Number);
      return (!year || recordYear === year) && (!month || recordMonth === month) && (!day || recordDay === day);
    })
    .sort((a, b) => (a.date.start ?? "").localeCompare(b.date.start ?? ""));

  return (
    <ContentPage eyebrow="KAYNAKLI ZAMAN ÇİZELGESİ" title="KRONOLOJİ">
      <div className={styles.stack}>
        <form action="/kronoloji" method="get" className={styles.searchForm} aria-label="Kronoloji tarih filtreleri">
          <label className={styles.field}>
            Yıl
            <input name="yil" type="number" min="1800" max="2100" defaultValue={year} placeholder="Örn: 1923" />
          </label>
          <label className={styles.field}>
            Ay
            <input name="ay" type="number" min="1" max="12" defaultValue={month} placeholder="1–12" />
          </label>
          <label className={styles.field}>
            Gün
            <input name="gun" type="number" min="1" max="31" defaultValue={day} placeholder="1–31" />
          </label>
          <div className={styles.actions}>
            <button className={styles.primaryAction} type="submit">Tarihi filtrele</button>
            <Link className={styles.secondaryAction} href="/kronoloji">Filtreleri temizle</Link>
          </div>
        </form>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginTop: "-12px" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--gold)", fontWeight: 600 }}>
            Önemli Yıllar:
          </span>
          {HISTORIC_YEARS.map((y) => (
            <Link
              key={y}
              href={`/kronoloji?yil=${y}`}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                padding: "4px 10px",
                borderRadius: "2px",
                border: year === y ? "1px solid var(--gold-bright)" : "1px solid rgba(209, 163, 109, 0.35)",
                background: year === y ? "var(--red-accent)" : "rgba(20, 8, 10, 0.6)",
                color: year === y ? "#ffffff" : "var(--gold-pale)",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              {y}
            </Link>
          ))}
        </div>

        {warnings.length ? (
          <div className={styles.warning} role="status" aria-live="polite">
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        ) : null}

        <div className={styles.resultHeader}>
          <h2>Kaynaklı olaylar</h2>
          <p aria-live="polite">{events.length} sonuç</p>
        </div>

        {events.length ? (
          <ol className={styles.cards}>
            {events.map((record) => (
              <li key={record.id}>
                <Link className={styles.card} href={`/arsiv/${record.slug}`}>
                  <div className={styles.cardContent}>
                    <span className={styles.cardMeta}>
                      <time>{record.date.display}</time>
                      <span className={styles.cardTypeBadge}>
                        <Icon name="calendar" size={13} /> Olay
                      </span>
                      <span className={styles.cardInstitution}>{record.source.institution}</span>
                    </span>
                    <h2>{record.title}</h2>
                    <p>{record.summary}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.reviewBadge}>
                      <Icon name="check" size={12} /> {reviewLabel(record.verification.status)}
                    </span>
                    {record.locations?.[0] ? (
                      <span className={styles.cardCategory}>{record.locations[0].city ?? record.locations[0].name}</span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state page-empty">
            <h2>Seçilen tarih için yayımlanabilir olay bulunmuyor.</h2>
            <p>İnceleme veya taslak durumundaki kayıtlar yayın kapısı nedeniyle gösterilmez.</p>
          </div>
        )}
      </div>
    </ContentPage>
  );
}
