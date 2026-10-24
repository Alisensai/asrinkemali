import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { getPublishedArchiveRecords } from "@/lib/archive";
import { prepareTodayBrief, isValidMonthDay } from "@/lib/publishing/today";
import {
  TodayDateSelector,
  TodayEventCard,
  PublicationEmptyState,
} from "@/components/publication-experience";
import styles from "../publishing.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function integer(value: string | undefined, min: number, max: number) {
  if (!value || !/^\d{1,2}$/.test(value)) return undefined;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : undefined;
}

function istanbulToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  return {
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasFilter = Boolean(params.ay || params.gun);

  return {
    title: "Tarihte Bugün | Arşiv Olayları",
    description: "Gün ve aya göre kaynak denetiminden geçen tarihî olaylar.",
    alternates: { canonical: "/tarihte-bugun" },
    robots: hasFilter ? { index: false, follow: true } : undefined,
  };
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const today = istanbulToday();
  const rawMonth = one(params.ay);
  const rawDay = one(params.gun);

  const parsedMonth = integer(rawMonth, 1, 12);
  const parsedDay = integer(rawDay, 1, 31);

  const isSupplied = Boolean(rawMonth || rawDay);
  const isValid =
    parsedMonth !== undefined &&
    parsedDay !== undefined &&
    isValidMonthDay(parsedMonth, parsedDay);

  const month = isValid ? parsedMonth : today.month;
  const day = isValid ? parsedDay : today.day;
  const invalid = isSupplied && !isValid;

  const brief = prepareTodayBrief(getPublishedArchiveRecords(), month, day);

  return (
    <ContentPage eyebrow="KAYNAKLI GÜNLÜK SEÇKİ" title="TARİHTE BUGÜN">
      <div className={styles.stack}>
        <TodayDateSelector month={month} day={day} isInvalidDate={invalid} />

        <div className={styles.resultHeader}>
          <h2>
            {day}.{month} için kaynaklı olaylar
          </h2>
          <p aria-live="polite">{brief.candidates.length} sonuç</p>
        </div>

        {brief.candidates.length > 0 ? (
          <ol className={styles.cards}>
            {brief.candidates.map((event) => (
              <TodayEventCard key={event.archiveId} event={event} />
            ))}
          </ol>
        ) : (
          <PublicationEmptyState
            title={brief.message ?? "Bu gün için yayın kapısından geçmiş kaynaklı olay bulunmuyor."}
            description="İncelemedeki kayıtlar veya tarih hassasiyeti yetersiz içerikler sonuçlara eklenmez."
            ctaPrimaryHref="/arsiv"
            ctaPrimaryLabel="Arşive Göz At"
            ctaSecondaryHref="/kronoloji"
            ctaSecondaryLabel="Kronolojiyi İncele"
          />
        )}
      </div>
    </ContentPage>
  );
}
