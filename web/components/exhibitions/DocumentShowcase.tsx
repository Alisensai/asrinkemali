"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./exhibitions.module.css";
import type { DocumentItem } from "@/lib/exhibitions/types";
import type { InspectedSource } from "./SourceInspector";

export interface DocumentShowcaseProps {
  document: DocumentItem;
  summary?: string;
  contextualNotes?: string[];
  onInspectSource?: (source: InspectedSource) => void;
  className?: string;
}

export function DocumentShowcase({
  document,
  summary,
  contextualNotes,
  onInspectSource,
  className = "",
}: DocumentShowcaseProps) {
  const imageUrl = document.sourceUrl && (document.sourceUrl.endsWith(".webp") || document.sourceUrl.endsWith(".jpg") || document.sourceUrl.endsWith(".png"))
    ? document.sourceUrl
    : "/assets/belge-merkezi.webp";

  const handleInspect = () => {
    if (!onInspectSource) return;
    onInspectSource({
      title: document.title,
      institution: document.institution,
      catalogNumber: document.archiveSlug,
      dateDisplay: document.dateDisplay,
      rightsStatus: document.rightsStatus,
      citation: document.citation,
      description: document.description,
      archiveSlug: document.archiveSlug,
      sourceUrl: document.sourceUrl,
      isVerified: true,
    });
  };

  return (
    <figure className={`${styles.showcaseFigure} ${className}`}>
      <div className={styles.showcaseVitrine}>
        <div className={styles.showcaseImageContainer}>
          <Image
            src={imageUrl}
            alt={document.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 800px"
            className={styles.showcaseImage}
            priority={false}
          />
          <div className={styles.showcaseOverlayTag}>
            <span className={styles.tagIcon}>🏛</span>
            <span>{document.institution}</span>
          </div>
        </div>

        <div className={styles.showcaseCardBody}>
          <div className={styles.showcaseMetaHeader}>
            <span className={styles.catalogBadge}>{document.archiveSlug}</span>
            <span className={styles.dateBadge}>{document.dateDisplay}</span>
          </div>

          <h3 className={styles.showcaseTitle}>{document.title}</h3>

          {summary && <p className={styles.showcaseCaption}>{summary}</p>}

          <div className={styles.showcaseExcerptBox}>
            <span className={styles.excerptLabel}>BELGE VE ARŞİV TANIMI</span>
            <p className={styles.excerptText}>{document.description}</p>
          </div>

          {contextualNotes && contextualNotes.length > 0 && (
            <div className={styles.showcaseContext}>
              {contextualNotes.map((note, idx) => (
                <div key={idx} className={styles.contextBullet}>
                  • {note}
                </div>
              ))}
            </div>
          )}

          <div className={styles.showcaseFooterActions}>
            {onInspectSource && (
              <button
                type="button"
                onClick={handleInspect}
                className={styles.inspectButton}
                aria-label={`"${document.title}" belgesinin kaynak detayını aç`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                <span>Kaynak Detayı</span>
              </button>
            )}

            {document.archiveSlug && (
              <Link
                href={`/arsiv/${document.archiveSlug}`}
                className={styles.archiveDirectLink}
                aria-label={`"${document.title}" belgesinin tam arşiv sayfasına git`}
              >
                <span>Arşiv Kaydı</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    </figure>
  );
}
