"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./exhibitions.module.css";

export interface ExhibitionHeroProps {
  title: string;
  subtitle: string;
  summary: string;
  coverImage: string;
  themeLabel: string;
  chronologicalRange: string;
  curator: string;
  recordCount: number;
  viewMode: "room" | "list";
  onToggleMode: (mode: "room" | "list") => void;
  reviewStatus?: string;
  isSynthetic?: boolean;
}

export function ExhibitionHero({
  title,
  subtitle,
  summary,
  coverImage,
  themeLabel,
  chronologicalRange,
  curator,
  recordCount,
  viewMode,
  onToggleMode,
  reviewStatus,
  isSynthetic,
}: ExhibitionHeroProps) {
  return (
    <header className={styles.exhibitionHeroContainer}>
      <div className={styles.heroBackdropWrap}>
        <Image
          src={coverImage}
          alt={title}
          fill
          priority
          sizes="100vw"
          className={styles.heroBackdropImage}
        />
        <div className={styles.heroOverlayGradient} />
      </div>

      <div className={styles.heroContent}>
        <nav aria-label="Sergi Yolu" className={styles.breadcrumbNav}>
          <ol className={styles.breadcrumbList}>
            <li>
              <Link href="/">Ana Sayfa</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/sergiler">Sergiler</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>

        <div className={styles.heroMetaBadges}>
          <span className={styles.themeBadge}>{themeLabel}</span>
          <span className={styles.eraBadge}>{chronologicalRange}</span>
          <span className={styles.sourceCountBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {recordCount} Birincil Kaynak Bağlantısı
          </span>
          {reviewStatus && (
            <span className={styles.durationBadge}>İnceleme: {reviewStatus.toUpperCase()}</span>
          )}
        </div>

        <h1 className={styles.heroMainTitle}>{title}</h1>
        {subtitle && <p className={styles.heroSubtitle}>{subtitle}</p>}
        <p className={styles.heroLead}>{summary}</p>

        {isSynthetic && (
          <div className={styles.syntheticNotice} role="note">
            <span className={styles.noticeIcon}>⚠</span>
            <span>
              <strong>Geliştirme / Temsili Önizleme:</strong> Bu sergi kurgusu küratöryel hazırlık aşamasındadır.
              Tarihî belgeler ve arşiv katalog kayıtları gerçek veritabanından çekilmiştir.
            </span>
          </div>
        )}

        <div className={styles.heroControlsRow}>
          <div className={styles.curatorCredits}>
            <span className={styles.curatorLabel}>Küratör (kayıt beyanı, onay değildir):</span>
            <span className={styles.curatorName}>{curator}</span>
          </div>

          <div className={styles.modeSwitcher} role="group" aria-label="Sergi Görünüm Modu">
            <button
              type="button"
              className={`${styles.modeButton} ${viewMode === "room" ? styles.modeButtonActive : ""}`}
              onClick={() => onToggleMode("room")}
              aria-pressed={viewMode === "room"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Sanal Galeri Odası</span>
            </button>

            <button
              type="button"
              className={`${styles.modeButton} ${viewMode === "list" ? styles.modeButtonActive : ""}`}
              onClick={() => onToggleMode("list")}
              aria-pressed={viewMode === "list"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span>Belge / Liste Modu</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
