import React from "react";
import { Badge } from "./Badge";
import { TextLink } from "./TextLink";
import styles from "./design-system.module.css";

export interface MuseumPlaqueProps {
  id: string;
  title: string;
  category?: string;
  institution?: string;
  date?: string;
  rights?: string;
  sourceUrl?: string;
  className?: string;
}

/**
 * MuseumPlaque: Accessible typographic accession plaque for archival records
 * without local media. Presents institutional provenance and catalogue numbers
 * without generating fake placeholder images.
 */
export const MuseumPlaque: React.FC<MuseumPlaqueProps> = ({
  id,
  title,
  category,
  institution = "Resmî Arşiv Koleksiyonu",
  date,
  rights = "Arşiv Hakları Korunmaktadır",
  sourceUrl,
  className = "",
}) => {
  return (
    <article className={`${styles.plaque} ${className}`.trim()} aria-label={`${title} müze plaketi`}>
      <header className={styles.plaqueHeader}>
        <span className={styles.plaqueId}>KAYIT NO: {id}</span>
        {category && <Badge variant="type">{category}</Badge>}
      </header>

      <h3 className={styles.plaqueTitle}>{title}</h3>

      <div className={styles.plaqueMetaGrid}>
        <div className={styles.plaqueMetaItem}>
          <span className={styles.plaqueMetaLabel}>Kaynak Kurum</span>
          <span className={styles.plaqueMetaValue}>{institution}</span>
        </div>

        {date && (
          <div className={styles.plaqueMetaItem}>
            <span className={styles.plaqueMetaLabel}>Belge Tarihi</span>
            <span className={styles.plaqueMetaValue}>{date}</span>
          </div>
        )}

        <div className={styles.plaqueMetaItem}>
          <span className={styles.plaqueMetaLabel}>Yayın Hakları</span>
          <span className={styles.plaqueMetaValue}>{rights}</span>
        </div>
      </div>

      <footer className={styles.plaqueFooter}>
        <span>Mustafa Kemal Atatürk Dijital Miras Envanteri</span>
        {sourceUrl && (
          <TextLink href={sourceUrl} quiet>
            Orijinal Arşiv Kaynağı
          </TextLink>
        )}
      </footer>
    </article>
  );
};
