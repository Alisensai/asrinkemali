import React from "react";
import Link from "next/link";
import styles from "@/app/publishing.module.css";

export interface PublicationEmptyStateProps {
  title?: string;
  description?: string;
  ctaPrimaryHref?: string;
  ctaPrimaryLabel?: string;
  ctaSecondaryHref?: string;
  ctaSecondaryLabel?: string;
}

export function PublicationEmptyState({
  title = "Henüz doğrulanmış yayın bulunmuyor.",
  description = "Bu filtrelerde kaynakça ve insan editör incelemesi tamamlanmış yayın yok; taslaklar gösterilmez.",
  ctaPrimaryHref = "/arsiv",
  ctaPrimaryLabel = "Dijital Arşivi İncele",
  ctaSecondaryHref = "/donemler",
  ctaSecondaryLabel = "Tarihsel Dönemleri Keşfet",
}: PublicationEmptyStateProps) {
  return (
    <div className={`empty-state page-empty ${styles.emptyState}`} data-testid="publications-empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.emptyActions}>
        <Link href={ctaPrimaryHref} className={styles.emptyPrimaryBtn}>
          {ctaPrimaryLabel}
        </Link>
        {ctaSecondaryHref && (
          <Link href={ctaSecondaryHref} className={styles.emptySecondaryBtn}>
            {ctaSecondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
