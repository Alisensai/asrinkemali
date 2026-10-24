"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./exhibitions.module.css";
import { DocumentShowcase } from "./DocumentShowcase";
import { ExhibitionTimeline } from "./ExhibitionTimeline";
import type { ExhibitionSection } from "@/lib/exhibitions/types";
import type { InspectedSource } from "./SourceInspector";
import { safeHref } from "@/lib/security/safe-url";
import { sourceBadgeText, type SourceTrust } from "@/lib/exhibitions/source-trust";

export interface ExhibitionSectionRendererProps {
  sections: ExhibitionSection[];
  onInspectSource?: (source: InspectedSource) => void;
  /** Veriye dayalı kaynak güven durumu (sergi görünümünde `resolveSourceTrust` ile türetilir). */
  trust: SourceTrust;
}

export function ExhibitionSectionRenderer({
  sections,
  onInspectSource,
  trust,
}: ExhibitionSectionRendererProps) {
  return (
    <div className={styles.sectionRendererContainer}>
      {sections.map((section) => (
        <article
          key={section.id}
          id={section.id}
          className={`${styles.sectionBlock} ${styles[`kind_${section.type}`] || ""}`}
        >
          {renderSection(section, trust, onInspectSource)}
        </article>
      ))}
    </div>
  );
}

function renderSection(
  section: ExhibitionSection,
  trust: SourceTrust,
  onInspectSource?: (source: InspectedSource) => void
) {
  switch (section.type) {
    case "hero":
      return null; // Handled by ExhibitionHero

    case "narrative":
      return (
        <section className={styles.narrativeSection}>
          <div className={styles.sectionHeaderStack}>
            <span className={styles.sectionKicker}>{section.kicker || "TARİHÎ ANLATIM"}</span>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
          </div>

          <div className={styles.narrativeContentGrid}>
            <div className={styles.narrativeProse}>
              {section.content.map((p, i) => (
                <p key={i}>{p}</p>
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
        </section>
      );

    case "archive_showcase":
      return (
        <section className={styles.showcaseSection}>
          <div className={styles.sectionHeaderStack}>
            <span className={styles.sectionKicker}>{section.kicker || "BAŞYAPIT ARŞİV VİTRİNİ"}</span>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
            {section.summary && <p className={styles.sectionIntro}>{section.summary}</p>}
          </div>

          <DocumentShowcase
            document={section.primaryDocument}
            summary={section.summary}
            contextualNotes={section.contextualNotes}
            onInspectSource={onInspectSource}
          />
        </section>
      );

    case "timeline":
      return <ExhibitionTimeline section={section} onInspectSource={onInspectSource} />;

    case "document_gallery":
      return (
        <section className={styles.gallerySection}>
          <div className={styles.sectionHeaderStack}>
            <span className={styles.sectionKicker}>{section.kicker || "BELGELER KOLEKSİYONU"}</span>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
            {section.lead && <p className={styles.sectionIntro}>{section.lead}</p>}
          </div>

          <div className={styles.galleryGridList}>
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
        </section>
      );

    case "comparison":
      return (
        <section className={styles.comparisonSection}>
          <div className={styles.sectionHeaderStack}>
            <span className={styles.sectionKicker}>{section.kicker || "TARİHSEL KARŞILAŞTIRMA VE SENTEZ"}</span>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
            {section.aspectTitle && <p className={styles.sectionIntro}>{section.aspectTitle}</p>}
          </div>

          <div className={styles.comparisonRow}>
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
        </section>
      );

    case "source_panel":
      return (
        <section className={styles.sourcePanelSection}>
          <div className={styles.sectionHeaderStack}>
            <span className={styles.sectionKicker}>{section.kicker || "BİRİNCİL KAYNAKLAR VE ARŞİV BİBLİYOGRAFYASI"}</span>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
            <p className={styles.sectionIntro}>{section.statement}</p>
          </div>

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
        </section>
      );

    case "closing":
      return (
        <section className={styles.closingSection}>
          <div className={styles.sectionHeaderStack}>
            <span className={styles.sectionKicker}>{section.kicker || "KAPANIŞ VE TARİHSEL MİRAS"}</span>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
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
                ← Tüm Sergileri İncele
              </Link>
              <Link href="/arsiv" className={styles.exploreArchiveBtn}>
                Dijital Arşiv Koleksiyonuna Git →
              </Link>
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
