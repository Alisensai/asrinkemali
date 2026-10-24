"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { compareDocuments } from "@/lib/document-comparison/model";
import type { ComparisonDataset, ComparisonRecord } from "@/lib/document-comparison/model";
import { ComparisonHeader } from "./ComparisonHeader";
import { ComparisonTable } from "./ComparisonTable";
import { CommonElements } from "./CommonElements";
import { DocumentSelectionModal } from "./DocumentSelectionModal";
import { ShareComparison } from "./ShareComparison";
import { PrintComparison } from "./PrintComparison";
import styles from "./comparison.module.css";

interface Props {
  dataset: ComparisonDataset;
  initialSlugA: string | null;
  initialSlugB: string | null;
  warnings: string[];
}

export function DocumentComparisonView({
  dataset,
  initialSlugA,
  initialSlugB,
  warnings: initialWarnings,
}: Props) {
  const [docA, setDocA] = useState<ComparisonRecord | null>(() => {
    return initialSlugA ? dataset.bySlug.get(initialSlugA) ?? null : null;
  });
  const [docB, setDocB] = useState<ComparisonRecord | null>(() => {
    return initialSlugB ? dataset.bySlug.get(initialSlugB) ?? null : null;
  });

  const [modalTarget, setModalTarget] = useState<"A" | "B" | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<"both" | "A" | "B">("both");
  const [warnings, setWarnings] = useState<string[]>(initialWarnings);

  // Sync URL when document selection changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (docA) {
      url.searchParams.set("a", docA.slug);
    } else {
      url.searchParams.delete("a");
    }
    if (docB) {
      url.searchParams.set("b", docB.slug);
    } else {
      url.searchParams.delete("b");
    }
    window.history.replaceState({}, "", url.toString());
  }, [docA, docB]);

  const handleSelectRecord = (record: ComparisonRecord) => {
    if (modalTarget === "A") {
      if (docB && docB.slug === record.slug) {
        setWarnings(["Aynı belge iki kez seçilemez. Farklı bir belge seçiniz."]);
        return;
      }
      setDocA(record);
      setWarnings([]);
    } else if (modalTarget === "B") {
      if (docA && docA.slug === record.slug) {
        setWarnings(["Aynı belge iki kez seçilemez. Farklı bir belge seçiniz."]);
        return;
      }
      setDocB(record);
      setWarnings([]);
    }
    setModalTarget(null);
  };

  const handleRemoveDoc = (target: "A" | "B") => {
    if (target === "A") setDocA(null);
    if (target === "B") setDocB(null);
  };

  const handleReset = () => {
    setDocA(null);
    setDocB(null);
    setWarnings([]);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const comparisonResult = useMemo(() => {
    if (docA && docB) {
      return compareDocuments(docA, docB);
    }
    return null;
  }, [docA, docB]);

  return (
    <div className={styles.container} data-testid="document-comparison-view">
      <header className={styles.hero}>
        <div className={styles.eyebrow}>MKA / BELGE KARŞILAŞTIRMA MERKEZİ</div>
        <h1>
          Tarihsel Belgeleri <em>Yan Yana</em> İnceleyin.
        </h1>
        <p className={styles.heroLead}>
          Mustafa Kemal Atatürk odaklı dijital arşivdeki iki farklı belgenin tarih, kaynak, kurum,
          künye, hak ve mekân bilgilerini nesnel parametrelerle karşılaştırın.
        </p>

        <div className={styles.actionRow}>
          <ShareComparison slugA={docA?.slug ?? null} slugB={docB?.slug ?? null} />
          <PrintComparison disabled={!comparisonResult} />
          {docA || docB ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleReset}
              aria-label="Karşılaştırmayı sıfırla"
            >
              Seçimleri Temizle
            </button>
          ) : null}
        </div>
      </header>

      {warnings.length > 0 ? (
        <div className={styles.noticeBar} role="status">
          {warnings.map((w, idx) => (
            <p key={idx} style={{ margin: 0 }}>
              {w}
            </p>
          ))}
        </div>
      ) : null}

      <div className={styles.contentWrapper}>
        {/* Document Selection Slots */}
        <section aria-label="Seçili Belgeler">
          <ComparisonHeader
            docA={docA}
            docB={docB}
            onOpenModal={(target) => setModalTarget(target)}
            onRemoveDoc={handleRemoveDoc}
          />
        </section>

        {/* Comparison Details when both documents are selected */}
        {comparisonResult ? (
          <section className={styles.comparisonSection} aria-labelledby="comparison-details-title">
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="comparison-details-title">Karşılaştırma Bulguları</h2>
                <p>
                  Aşağıdaki veriler arşiv katalog kayıtlarının doğrulanmış alanlarından türetilmiştir.
                </p>
              </div>

              {/* Mobile Tab Selector */}
              <div className={styles.mobileTabs} role="tablist" aria-label="Görünüm sekmeleri">
                <button
                  type="button"
                  role="tab"
                  className={styles.mobileTabBtn}
                  aria-selected={activeMobileTab === "both"}
                  onClick={() => setActiveMobileTab("both")}
                >
                  Kıyas Tablosu
                </button>
                <button
                  type="button"
                  role="tab"
                  className={styles.mobileTabBtn}
                  aria-selected={activeMobileTab === "A"}
                  onClick={() => setActiveMobileTab("A")}
                >
                  1. Belge
                </button>
                <button
                  type="button"
                  role="tab"
                  className={styles.mobileTabBtn}
                  aria-selected={activeMobileTab === "B"}
                  onClick={() => setActiveMobileTab("B")}
                >
                  2. Belge
                </button>
              </div>
            </div>

            {/* Common Elements */}
            <CommonElements result={comparisonResult} />

            {/* Detailed Table */}
            <ComparisonTable result={comparisonResult} />
          </section>
        ) : (
          <div className={styles.emptySlot} style={{ margin: "24px 0" }}>
            <h3>Karşılaştırma Başlatılmadı</h3>
            <p>
              İki belge arasındaki tarih, kurum ve künye farklılıklarını incelemek için lütfen her iki
              belge yuvasına da katalogdan birer kayıt seçiniz.
            </p>
            <div className={styles.actionRow}>
              {!docA ? (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  onClick={() => setModalTarget("A")}
                >
                  1. Belgeyi Seç
                </button>
              ) : null}
              {!docB ? (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  onClick={() => setModalTarget("B")}
                >
                  2. Belgeyi Seç
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <footer
          style={{
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            fontSize: "12px",
            padding: "24px 0",
            borderTop: "1px solid var(--comp-border)",
            color: "var(--comp-muted)",
          }}
        >
          <Link href="/arsiv" style={{ color: "var(--comp-gold)" }}>
            Dijital Arşiv →
          </Link>
          <Link href="/kronoloji" style={{ color: "var(--comp-gold)" }}>
            Kronoloji →
          </Link>
          <Link href="/atlas" style={{ color: "var(--comp-gold)" }}>
            Tarih Atlası →
          </Link>
          <span style={{ width: "100%", fontSize: "11px" }}>
            Bu platform bağımsız bir tarih ve kültür projesidir.
          </span>
        </footer>
      </div>

      {/* Selection Modal */}
      <DocumentSelectionModal
        isOpen={modalTarget !== null}
        targetSlot={modalTarget ?? "A"}
        disabledSlug={modalTarget === "A" ? (docB?.slug ?? null) : (docA?.slug ?? null)}
        dataset={dataset}
        onSelect={handleSelectRecord}
        onClose={() => setModalTarget(null)}
      />
    </div>
  );
}
