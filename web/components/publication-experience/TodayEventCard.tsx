import React from "react";
import Link from "next/link";
import styles from "@/app/publishing.module.css";
import type { TodayCandidate } from "@/lib/publishing/today";

export interface TodayEventCardProps {
  event: TodayCandidate;
}

export function TodayEventCard({ event }: TodayEventCardProps) {
  return (
    <li>
      <Link className={styles.card} href={`/arsiv/${event.slug}`}>
        <span>
          {event.date} · {event.sourceInstitution}
        </span>
        <h2>{event.title}</h2>
        <p>{event.summary}</p>
      </Link>
    </li>
  );
}
