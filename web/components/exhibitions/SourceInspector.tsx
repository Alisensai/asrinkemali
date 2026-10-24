"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./exhibitions.module.css";
import type { SourceTrust } from "@/lib/exhibitions/source-trust";
import { safeHref } from "@/lib/security/safe-url";

export interface InspectedSource {
  title: string;
  institution: string;
  catalogNumber?: string;
  dateDisplay?: string;
  rightsStatus?: string;
  citation?: string;
  description?: string;
  archiveSlug?: string;
  sourceUrl?: string;
  /**
   * Veriye dayalı güven durumu (`resolveSourceTrust`). Bileşenler bunu kendileri
   * belirleyemez; sergi görünümü sergi verisinden türetip ekler. Yoksa "inceleme bekliyor".
   */
  trust?: SourceTrust;
  isRepresentativeVisual?: boolean;
}

export interface SourceInspectorProps {
  source: InspectedSource | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SourceInspector({ source, isOpen, onClose }: SourceInspectorProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        const drawer = drawerRef.current;
        if (!drawer) return;
        const focusable = drawer.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !source) {
    return null;
  }

  return (
    <div
      className={styles.drawerBackdrop}
      onClick={onClose}
      aria-hidden="true"
    >
      <aside
        ref={drawerRef}
        className={styles.drawerPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderMeta}>
            <span className={styles.drawerBadge}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              KATALOG KAYDI
            </span>
            {source.trust?.state === "verified" ? (
              <span className={styles.verifiedPill} title={source.trust.description}>{source.trust.label}</span>
            ) : (
              <span className={styles.unverifiedNotice} title={source.trust?.description}>
                {source.trust?.label ?? "İNCELEME BEKLİYOR"}
              </span>
            )}
            {source.isRepresentativeVisual && (
              <span className={styles.representativePill}>TEMSİLÎ GÖRSEL</span>
            )}
          </div>
          <button
            type="button"
            ref={closeBtnRef}
            onClick={onClose}
            className={styles.drawerCloseBtn}
            aria-label="Kaynak inceleme panelini kapat (Esc)"
          >
            ✕
          </button>
        </div>

        <div className={styles.drawerBody}>
          <h2 id="source-drawer-title" className={styles.drawerTitle}>
            {source.title}
          </h2>

          <dl className={styles.drawerMetaList}>
            <div className={styles.drawerMetaRow}>
              <dt>Muhafaza Edilen Kurum:</dt>
              <dd>{source.institution}</dd>
            </div>
            {source.catalogNumber && (
              <div className={styles.drawerMetaRow}>
                <dt>Katalog / Fon Kodu:</dt>
                <dd className={styles.catalogCode}>{source.catalogNumber}</dd>
              </div>
            )}
            {source.dateDisplay && (
              <div className={styles.drawerMetaRow}>
                <dt>Belge / Olay Tarihi:</dt>
                <dd>{source.dateDisplay}</dd>
              </div>
            )}
            {source.rightsStatus && (
              <div className={styles.drawerMetaRow}>
                <dt>Telif / Lisans:</dt>
                <dd>{source.rightsStatus}</dd>
              </div>
            )}
          </dl>

          {source.description && (
            <div className={styles.drawerTranscriptBox}>
              <span className={styles.transcriptLabel}>BELGE VE BAĞLAM AÇIKLAMASI</span>
              <p className={styles.transcriptQuote}>{source.description}</p>
            </div>
          )}

          {source.citation && (
            <div className={styles.drawerCitationBox}>
              <span className={styles.citationLabel}>AKADEMİK KAYNAKÇA / BİBLİYOGRAFYA</span>
              <p className={styles.citationText}>{source.citation}</p>
            </div>
          )}

          <div className={styles.drawerActions}>
            {source.archiveSlug ? (
              <Link
                href={`/arsiv/${source.archiveSlug}`}
                className={styles.primaryArchiveLink}
                onClick={onClose}
              >
                <span>Dijital Arşivde İncele</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            ) : safeHref(source.sourceUrl) ? (
              <a
                href={safeHref(source.sourceUrl) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryArchiveLink}
              >
                <span>Kurumsal Kaynak Sayfası ↗</span>
              </a>
            ) : (
              <span className={styles.archiveNote}>
                Bu belge bağımsız araştırma fonunda taranmıştır; ayrıntılı katalog kaydı dijital arşiv merkezine aktarılmaktadır.
              </span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
