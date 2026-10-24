"use client";

import { useState } from "react";
import styles from "./comparison.module.css";

interface Props {
  slugA: string | null;
  slugB: string | null;
}

export function ShareComparison({ slugA, slugB }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!slugA && !slugB) return;
    const url = new URL(window.location.origin + window.location.pathname);
    if (slugA) url.searchParams.set("a", slugA);
    if (slugB) url.searchParams.set("b", slugB);

    const shareUrl = url.toString();

    try {
      if (navigator.share && window.isSecureContext) {
        await navigator.share({
          title: "MKA Arşivi — Belge Karşılaştırması",
          text: "Mustafa Kemal Atatürk dijital arşivinde belge karşılaştırması:",
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Clipboard / share cancelled or denied in headless browser
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isDisabled = !slugA && !slugB;

  return (
    <>
      <button
        type="button"
        className={styles.actionBtn}
        onClick={handleShare}
        disabled={isDisabled}
        aria-label="Karşılaştırma bağlantısını paylaş"
      >
        <span>🔗</span>
        <span>{copied ? "Bağlantı Kopyalandı!" : "Paylaş"}</span>
      </button>
      {copied ? (
        <div className={styles.toast} role="status">
          Karşılaştırma bağlantısı panoya kopyalandı.
        </div>
      ) : null}
    </>
  );
}
