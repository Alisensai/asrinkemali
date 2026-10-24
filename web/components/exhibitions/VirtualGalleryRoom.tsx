"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./exhibitions.module.css";
import { DocumentShowcase } from "./DocumentShowcase";
import { ExhibitionTimeline } from "./ExhibitionTimeline";
import type { ExhibitionSection } from "@/lib/exhibitions/types";
import type { InspectedSource } from "./SourceInspector";
import { safeHref } from "@/lib/security/safe-url";
import { sourceBadgeText, type SourceTrust } from "@/lib/exhibitions/source-trust";

export interface VirtualGalleryRoomProps {
  sections: ExhibitionSection[];
  onInspectSource?: (source: InspectedSource) => void;
  /** Veriye dayalı kaynak güven durumu (sergi görünümünde `resolveSourceTrust` ile türetilir). */
  trust: SourceTrust;
}

export function VirtualGalleryRoom({ sections, onInspectSource, trust }: VirtualGalleryRoomProps) {
  // Filter out the initial hero section from the room slides
  const roomSections = sections.filter((s) => s.type !== "hero");
  const totalSlides = roomSections.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < totalSlides) {
      setActiveIndex(index);
    }
  }, [totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goToSlide(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goToSlide(totalSlides - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, goToSlide, totalSlides]);

  if (totalSlides === 0) {
    return (
      <div className={styles.emptyRoomState}>
        <p>Bu sergi için henüz sanal salon bölümleri hazırlanmaktadır.</p>
      </div>
    );
  }

  const currentSection = roomSections[activeIndex];
  const progressPercent = Math.round(((activeIndex + 1) / totalSlides) * 100);

  return (
    <div className={styles.virtualRoomWrapper} ref={containerRef}>
      {/* HUD Bar */}
      <div className={styles.roomHudBar}>
        <div className={styles.roomProgressInfo}>
          <span className={styles.hudBadge}>SANAL GALERİ ODASI</span>
          <span className={styles.hudStepText}>
            Salon Bölümü <strong>{activeIndex + 1}</strong> / {totalSlides}
          </span>
        </div>

        <div className={styles.hudProgressBarTrack} aria-hidden="true">
          <div className={styles.hudProgressBarFill} style={{ width: `${progressPercent}%` }} />
        </div>

        <div className={styles.hudNavButtonGroup}>
          <button
            type="button"
            onClick={goToPrev}
            disabled={activeIndex === 0}
            className={styles.hudNavBtn}
            aria-label="Önceki vitrin bölümüne geç (Sol Ok)"
          >
            ← Önceki
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={activeIndex === totalSlides - 1}
            className={styles.hudNavBtn}
            aria-label="Sonraki vitrin bölümüne geç (Sağ Ok)"
          >
            Sonraki →
          </button>
        </div>
      </div>

      {/* 3D Perspective Stage */}
      <div className={styles.room3DStage} role="region" aria-label="Sanal Vitrin Sahnesi" tabIndex={0}>
        <div className={styles.roomStageAmbientGlow} />

        {/* Active Section Slide Card */}
        <div className={styles.roomActiveCard} key={currentSection.id}>
          {renderRoomSlide(currentSection, trust, onInspectSource)}
        </div>
      </div>

      {/* Slide dots and quick switcher */}
      <nav aria-label="Salon Bölüm Seçimi" className={styles.roomDotNav}>
        <ol className={styles.roomDotList}>
          {roomSections.map((sec, idx) => (
            <li key={sec.id}>
              <button
                type="button"
                className={`${styles.roomDotBtn} ${idx === activeIndex ? styles.roomDotBtnActive : ""}`}
                onClick={() => goToSlide(idx)}
                aria-label={`Bölüm ${idx + 1}: ${sec.title}`}
                aria-current={idx === activeIndex ? "true" : undefined}
              >
                <span className={styles.dotNumber}>{idx + 1}</span>
                <span className={styles.dotTitlePreview}>{sec.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className={styles.roomKeyboardTip} aria-hidden="true">
        <span>💡 İpucu: Galeri içinde gezinmek için klavyenizin <strong>Sol / Sağ Ok</strong> tuşlarını kullanabilirsiniz.</span>
      </div>
    </div>
  );
}

function renderRoomSlide(
  section: ExhibitionSection,
  trust: SourceTrust,
  onInspectSource?: (source: InspectedSource) => void
) {
  switch (section.type) {
    case "archive_showcase":
      return (
        <div className={styles.roomSlideShowcase}>
          <div className={styles.slideHeader}>
            <span className={styles.slideKicker}>{section.kicker || "BAŞYAPIT VİTRİNİ"}</span>
            <h2 className={styles.slideTitle}>{section.title}</h2>
          </div>
          {section.summary && <p className={styles.slideLead}>{section.summary}</p>}
          <div className={styles.vitrineSpotlight}>
            <DocumentShowcase
              document={section.primaryDocument}
              summary={section.summary}
              contextualNotes={section.contextualNotes}
              onInspectSource={onInspectSource}
            />
          </div>
        </div>
      );

    case "narrative":
      return (
        <div className={styles.roomSlideNarrative}>
          <div className={styles.slideHeader}>
            <span className={styles.slideKicker}>{section.kicker || "TARİHÎ ANLATI VE BELGELİK"}</span>
            <h2 className={styles.slideTitle}>{section.title}</h2>
          </div>
          <div className={styles.narrativeBodyGrid}>
            <div className={styles.narrativeTextCol}>
              {section.content.map((p, i) => (
                <p key={i} className={styles.narrativeParagraph}>{p}</p>
              ))}
              {section.highlightQuote && (
                <blockquote className={styles.narrativeQuote}>
                  <p>&ldquo;{section.highlightQuote.text}&rdquo;</p>
                  <footer>
                    <strong>{section.highlightQuote.speaker}</strong>
                    {section.highlightQuote.context && <span> — {section.highlightQuote.context}</span>}
                    {section.highlightQuote.verifiedSourceNote && (
                      <cite className={styles.quoteCitation}>Kaynak: {section.highlightQuote.verifiedSourceNote}</cite>
                    )}
                  </footer>
                </blockquote>
              )}
            </div>

            {section.historicalContext && (
              <aside className={styles.supportingSidebar} aria-label="Tarihsel Bağlam">
                <h3 className={styles.sidebarTitle}>Dönem ve Bağlam</h3>
                <p className={styles.historicalContextBox}>{section.historicalContext}</p>
              </aside>
            )}
          </div>
        </div>
      );

    case "timeline":
      return <ExhibitionTimeline section={section} onInspectSource={onInspectSource} />;

    case "document_gallery":
      return (
        <div className={styles.roomSlideGallery}>
          <div className={styles.slideHeader}>
            <span className={styles.slideKicker}>{section.kicker || "BELGE KOLEKSİYONU"}</span>
            <h2 className={styles.slideTitle}>{section.title}</h2>
          </div>
          {section.lead && <p className={styles.slideLead}>{section.lead}</p>}
          <div className={styles.documentGalleryGrid}>
            {section.items.map((item, idx) => (
              <div key={idx} className={styles.galleryCard}>
                <div className={styles.galleryCardThumb}>
                  <Image
                    src={item.sourceUrl && (item.sourceUrl.endsWith(".webp") || item.sourceUrl.endsWith(".jpg") || item.sourceUrl.endsWith(".png")) ? item.sourceUrl : "/assets/belge-merkezi.webp"}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className={styles.galleryImage}
                  />
                  <span className={styles.galleryInstBadge}>{item.institution}</span>
                </div>
                <div className={styles.galleryCardContent}>
                  <span className={styles.galleryDate}>{item.dateDisplay}</span>
                  <h3 className={styles.galleryItemTitle}>{item.title}</h3>
                  <p className={styles.galleryCatalog}>#{item.archiveSlug}</p>
                  <p className={styles.galleryDesc}>{item.description}</p>
                  <div className={styles.galleryCardActions}>
                    {onInspectSource && (
                      <button
                        type="button"
                        onClick={() =>
                          onInspectSource({
                            title: item.title,
                            institution: item.institution,
                            catalogNumber: item.archiveSlug,
                            dateDisplay: item.dateDisplay,
                            rightsStatus: item.rightsStatus,
                            citation: item.citation,
                            description: item.description,
                            archiveSlug: item.archiveSlug,
                            sourceUrl: item.sourceUrl,
                          })
                        }
                        className={styles.miniInspectBtn}
                      >
                        Kaynak İncele
                      </button>
                    )}
                    {item.archiveSlug && (
                      <Link href={`/arsiv/${item.archiveSlug}`} className={styles.galleryLink}>
                        Arşiv Kaydı →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "comparison":
      return (
        <div className={styles.roomSlideComparison}>
          <div className={styles.slideHeader}>
            <span className={styles.slideKicker}>{section.kicker || "BELGE VE DÖNEM KARŞILAŞTIRMASI"}</span>
            <h2 className={styles.slideTitle}>{section.title}</h2>
          </div>
          {section.aspectTitle && <p className={styles.slideLead}>{section.aspectTitle}</p>}
          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonSide}>
              <span className={styles.comparisonPeriodBadge}>{section.leftColumn.period}</span>
              <h3 className={styles.sideTitle}>{section.leftColumn.title}</h3>
              <p className={styles.sideContent}>{section.leftColumn.description}</p>
              {section.leftColumn.points && section.leftColumn.points.length > 0 && (
                <ul className={styles.comparisonPointsList}>
                  {section.leftColumn.points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.comparisonDivider} aria-hidden="true">
              <span>VS</span>
            </div>

            <div className={styles.comparisonSide}>
              <span className={styles.comparisonPeriodBadge}>{section.rightColumn.period}</span>
              <h3 className={styles.sideTitle}>{section.rightColumn.title}</h3>
              <p className={styles.sideContent}>{section.rightColumn.description}</p>
              {section.rightColumn.points && section.rightColumn.points.length > 0 && (
                <ul className={styles.comparisonPointsList}>
                  {section.rightColumn.points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      );

    case "source_panel":
      return (
        <div className={styles.roomSlideSourcePanel}>
          <div className={styles.slideHeader}>
            <span className={styles.slideKicker}>{section.kicker || "KAYNAKÇA VE ARŞİV BİBLİYOGRAFYASI"}</span>
            <h2 className={styles.slideTitle}>{section.title}</h2>
          </div>
          <p className={styles.slideLead}>{section.statement}</p>
          <div className={styles.sourcePanelGrid}>
            {section.sources.map((src) => (
              <div key={src.id} className={styles.sourcePanelCard}>
                <div className={styles.sourcePanelTop}>
                  <span className={styles.catalogBadge}>{src.catalogId || src.id}</span>
                  <span className={trust.state === "verified" ? styles.verifiedPill : styles.unverifiedNotice} title={trust.description}>{sourceBadgeText(src.verificationBadge, trust)}</span>
                </div>
                <h3 className={styles.sourcePanelTitle}>{src.title}</h3>
                <p className={styles.sourcePanelInst}>{src.institution}</p>
                <p className={styles.sourcePanelCitation}>{src.rightsNote}</p>
                <div className={styles.sourcePanelFoot}>
                  {onInspectSource && (
                    <button
                      type="button"
                      onClick={() =>
                        onInspectSource({
                          title: src.title,
                          institution: src.institution,
                          catalogNumber: src.catalogId,
                          rightsStatus: src.rightsNote,
                          sourceUrl: src.sourceUrl,
                        })
                      }
                      className={styles.inspectButton}
                    >
                      Detaylı İncele
                    </button>
                  )}
                  {safeHref(src.sourceUrl) && (
                    <a
                      href={safeHref(src.sourceUrl) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.archiveDirectLink}
                    >
                      Kurumsal Kaynak ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "closing":
      return (
        <div className={styles.roomSlideClosing}>
          <div className={styles.slideHeader}>
            <span className={styles.slideKicker}>{section.kicker || "SERGİ SONU"}</span>
            <h2 className={styles.slideTitle}>{section.title}</h2>
          </div>
          <div className={styles.closingCard}>
            <p className={styles.closingSummary}>{section.epilogue}</p>
            <div className={styles.closingSignificance}>
              <h3>Küratöryel Kapanış ve Tarihsel Miras</h3>
              <p>{section.curatorSignoff}</p>
              <p className={styles.sourcesSummaryNote}>{section.sourcesSummary}</p>
            </div>
            <div className={styles.closingActions}>
              <Link href="/sergiler" className={styles.returnDirectoryBtn}>
                ← Diğer Sergilere Dön
              </Link>
              <Link href="/arsiv" className={styles.exploreArchiveBtn}>
                Dijital Arşivi Keşfet →
              </Link>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
