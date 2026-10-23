"use client";

import React from "react";
import styles from "./exhibitions.module.css";
import type { TimelineSection } from "@/lib/exhibitions/types";
import type { InspectedSource } from "./SourceInspector";

export interface ExhibitionTimelineProps {
  section: TimelineSection;
  onInspectSource?: (source: InspectedSource) => void;
}

export function ExhibitionTimeline({ section, onInspectSource }: ExhibitionTimelineProps) {
  return (
    <section className={styles.timelineSectionWrap} aria-labelledby={`timeline-heading-${section.id}`}>
      <div className={styles.sectionHeaderStack}>
        <span className={styles.sectionKicker}>{section.kicker || "TARİHSEL KRONOLOJİ VE BELGE BAĞLAMI"}</span>
        <h2 id={`timeline-heading-${section.id}`} className={styles.sectionHeading}>
          {section.title}
        </h2>
        {section.introText && (
          <p className={styles.sectionIntro}>{section.introText}</p>
        )}
      </div>

      <ol className={styles.timelineList}>
        {section.events.map((evt) => (
          <li key={evt.id} className={styles.timelineItem}>
            <div className={styles.timelineMarkerCol}>
              <div className={styles.timelineDot} />
              <div className={styles.timelineLine} />
            </div>

            <div className={styles.timelineContentCard}>
              <div className={styles.timelineDateRow}>
                <span className={styles.eventDateBadge}>{evt.eventDate || evt.year.toString()}</span>
                {evt.documentDate && evt.documentDate !== evt.eventDate && (
                  <span className={styles.documentDateBadge} title="Arşiv Belgesinin Düzenlenme / Muhafaza Tarihi">
                    Belge Tarihi: {evt.documentDate}
                  </span>
                )}
              </div>

              <h3 className={styles.timelineEventTitle}>{evt.title}</h3>
              <p className={styles.timelineEventDesc}>{evt.description}</p>

              {evt.archiveSlug && (
                <div className={styles.timelineSourceRibbon}>
                  <div className={styles.timelineSourceInfo}>
                    <span className={styles.sourceLabel}>Bağlantılı Belge:</span>
                    <strong className={styles.sourceName}>{evt.title}</strong>
                    {evt.institution && (
                      <span className={styles.sourceInstitution}>
                        ({evt.institution} — #{evt.archiveSlug})
                      </span>
                    )}
                  </div>

                  {onInspectSource && (
                    <button
                      type="button"
                      onClick={() =>
                        onInspectSource({
                          title: evt.title,
                          institution: evt.institution,
                          catalogNumber: evt.archiveSlug,
                          dateDisplay: evt.documentDate || evt.eventDate,
                          description: evt.description,
                          archiveSlug: evt.archiveSlug,
                          isVerified: true,
                        })
                      }
                      className={styles.timelineInspectBtn}
                      aria-label={`"${evt.title}" kaynak detayını aç`}
                    >
                      Belgeyi İncele
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
