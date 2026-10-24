import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./exhibitions.module.css";
import type { ExhibitionDTO } from "@/lib/exhibitions/types";

export interface ExhibitionCardProps {
  exhibition: ExhibitionDTO;
}

export function ExhibitionCard({ exhibition }: ExhibitionCardProps) {
  return (
    <li className={styles.cardItem}>
      <article className={styles.exhibitionCard}>
        <div className={styles.cardCoverWrap}>
          <Image
            src={exhibition.coverImage.src}
            alt={exhibition.coverImage.alt || exhibition.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            className={styles.cardCoverImage}
          />
          <div className={styles.cardCoverGradient} />
          <span className={styles.cardThemeTag}>{exhibition.themeLabel}</span>
        </div>

        <div className={styles.cardContent}>
          <div className={styles.cardMetaRow}>
            <span className={styles.cardEra}>{exhibition.chronologicalScope.displayRange}</span>
            <span className={styles.cardSources}>
              🏛 {exhibition.relatedArchiveRecordSlugs.length} Birincil Kaynak
            </span>
          </div>

          <h2 className={styles.cardTitle}>
            <Link href={`/sergiler/${exhibition.slug}`} className={styles.cardTitleLink}>
              {exhibition.title}
            </Link>
          </h2>

          <p className={styles.cardLeadExcerpt}>{exhibition.summary}</p>

          <div className={styles.cardFooter}>
            <div className={styles.cardCurator}>
              <span className={styles.curatorSmallLabel}>Küratör:</span>
              <span className={styles.curatorSmallName}>{exhibition.curator.name}</span>
            </div>

            <Link href={`/sergiler/${exhibition.slug}`} className={styles.cardCtaBtn}>
              <span>Sergiyi Gez</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}
