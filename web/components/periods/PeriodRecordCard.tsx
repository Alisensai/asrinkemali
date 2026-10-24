import Link from "next/link";
import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import { reviewLabel, typeLabel } from "@/lib/archive";
import styles from "@/app/donemler/donemler.module.css";

export function PeriodRecordCard({ record }: { record: ArchiveRecord }) {
  return (
    <li>
      <Link className={styles.recordCard} href={`/arsiv/${record.slug}`}>
        <span className={styles.recordMeta}>
          <time dateTime={record.date.start ?? undefined}>{record.date.display}</time>
          <span>{typeLabel(record.type)}</span>
          {record.date.certainty !== "exact" ? (
            <span className={styles.certaintyBadge}>
              Tarih kesinliği: {record.date.certainty === "estimated" ? "tahmini" : "bilinmiyor"}
            </span>
          ) : null}
        </span>
        <h3>{record.title}</h3>
        <p>{record.summary}</p>
        <span className={styles.sourceLine}>Kaynak: {record.source.institution}</span>
        <span className={styles.reviewBadge}>{reviewLabel(record.verification.status)}</span>
      </Link>
    </li>
  );
}
