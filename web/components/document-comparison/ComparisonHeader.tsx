"use client";

import Link from "next/link";
import type { ComparisonRecord } from "@/lib/document-comparison/model";
import styles from "./comparison.module.css";

interface Props {
  docA: ComparisonRecord | null;
  docB: ComparisonRecord | null;
  onOpenModal: (target: "A" | "B") => void;
  onRemoveDoc: (target: "A" | "B") => void;
}

export function ComparisonHeader({ docA, docB, onOpenModal, onRemoveDoc }: Props) {
  return (
    <div className={styles.slotsGrid}>
      {/* Slot A */}
      {docA ? (
        <article className={styles.slotCard} aria-label="1. Karşılaştırma Belgesi">
          <div className={styles.slotHeader}>
            <span className={styles.slotTag}>1. Belge</span>
            <div className={styles.slotActions}>
              <button
                type="button"
                className={styles.slotBtn}
                onClick={() => onOpenModal("A")}
                aria-label="1. belgeyi değiştir"
              >
                Değiştir
              </button>
              <button
                type="button"
                className={styles.slotBtn}
                onClick={() => onRemoveDoc("A")}
                aria-label="1. belgeyi kaldır"
              >
                Kaldır
              </button>
            </div>
          </div>
          <h3 className={styles.docTitle}>{docA.title}</h3>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>{docA.typeLabel}</span>
            <span className={styles.badge}>{docA.date.display}</span>
            <span className={styles.badge}>{docA.institution}</span>
          </div>
          <p className={styles.docSummary}>{docA.summary}</p>
          <div className={styles.docDetailsLink}>
            <Link href={`/arsiv/${encodeURIComponent(docA.slug)}`}>
              Arşiv kaydını incele →
            </Link>
            {docA.sourceUrl ? (
              <a
                href={docA.sourceUrl}
                target="_blank"
                rel="noopener noreferrer external"
              >
                Özgün kaynak ↗
              </a>
            ) : null}
          </div>
        </article>
      ) : (
        <div className={styles.emptySlot} aria-label="1. Belge Henüz Seçilmedi">
          <span className={styles.slotTag}>1. Belge Yuvası</span>
          <h3>İlk belgeyi seçiniz</h3>
          <p>Karşılaştırmak istediğiniz birinci arşiv kaydını katalogdan ekleyin.</p>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => onOpenModal("A")}
          >
            + 1. Belgeyi Seç
          </button>
        </div>
      )}

      {/* Slot B */}
      {docB ? (
        <article className={styles.slotCard} aria-label="2. Karşılaştırma Belgesi">
          <div className={styles.slotHeader}>
            <span className={styles.slotTag}>2. Belge</span>
            <div className={styles.slotActions}>
              <button
                type="button"
                className={styles.slotBtn}
                onClick={() => onOpenModal("B")}
                aria-label="2. belgeyi değiştir"
              >
                Değiştir
              </button>
              <button
                type="button"
                className={styles.slotBtn}
                onClick={() => onRemoveDoc("B")}
                aria-label="2. belgeyi kaldır"
              >
                Kaldır
              </button>
            </div>
          </div>
          <h3 className={styles.docTitle}>{docB.title}</h3>
          <div className={styles.badgeRow}>
            <span className={styles.badge}>{docB.typeLabel}</span>
            <span className={styles.badge}>{docB.date.display}</span>
            <span className={styles.badge}>{docB.institution}</span>
          </div>
          <p className={styles.docSummary}>{docB.summary}</p>
          <div className={styles.docDetailsLink}>
            <Link href={`/arsiv/${encodeURIComponent(docB.slug)}`}>
              Arşiv kaydını incele →
            </Link>
            {docB.sourceUrl ? (
              <a
                href={docB.sourceUrl}
                target="_blank"
                rel="noopener noreferrer external"
              >
                Özgün kaynak ↗
              </a>
            ) : null}
          </div>
        </article>
      ) : (
        <div className={styles.emptySlot} aria-label="2. Belge Henüz Seçilmedi">
          <span className={styles.slotTag}>2. Belge Yuvası</span>
          <h3>İkinci belgeyi seçiniz</h3>
          <p>Farklı bir arşiv kaydı seçerek tarih, kurum ve künye kıyasını başlatın.</p>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => onOpenModal("B")}
          >
            + 2. Belgeyi Seç
          </button>
        </div>
      )}
    </div>
  );
}
