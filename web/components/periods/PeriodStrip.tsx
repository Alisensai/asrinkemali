import Link from "next/link";
import type { PeriodSummary } from "@/lib/historical-periods";
import styles from "@/app/donemler/donemler.module.css";

export function PeriodStrip({ summaries, activeId }: { summaries: PeriodSummary[]; activeId: string | null }) {
  return (
    <nav className={styles.periodStrip} aria-label="Tarihî dönemler" role="tablist">
      {summaries.map(({ period, count }) => {
        const selected = period.id === activeId;
        return (
          <Link
            key={period.id}
            role="tab"
            aria-selected={selected}
            className={`${styles.periodTab} ${selected ? styles.periodTabActive : ""} ${count === 0 ? styles.periodTabEmpty : ""}`}
            href={`/donemler?donem=${period.id}`}
          >
            <span className={styles.periodTabTitle}>{period.title}</span>
            <span className={styles.periodTabRange}>
              {period.start.slice(0, 4)} – {period.end ? period.end.slice(0, 4) : "günümüz"}
            </span>
            <span className={styles.periodTabCount} aria-label={`${count} kayıt`}>
              {count > 0 ? `${count} kayıt` : "kayıt yok"}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
