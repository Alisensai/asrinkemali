"use client";

import React, { useState } from "react";
import styles from "./exhibitions.module.css";
import { ExhibitionHero } from "./ExhibitionHero";
import { VirtualGalleryRoom } from "./VirtualGalleryRoom";
import { ExhibitionSectionRenderer } from "./ExhibitionSectionRenderer";
import { SourceInspector, type InspectedSource } from "./SourceInspector";
import type { ExhibitionDTO, HeroSection } from "@/lib/exhibitions/types";

export interface ExhibitionViewProps {
  exhibition: ExhibitionDTO;
}

export function ExhibitionView({ exhibition }: ExhibitionViewProps) {
  const [viewMode, setViewMode] = useState<"room" | "list">("room");
  const [inspectedSource, setInspectedSource] = useState<InspectedSource | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const heroSection = exhibition.sections.find((s) => s.type === "hero") as HeroSection | undefined;

  const handleInspectSource = (source: InspectedSource) => {
    setInspectedSource(source);
    setIsInspectorOpen(true);
  };

  const handleCloseInspector = () => {
    setIsInspectorOpen(false);
  };

  return (
    <div className={styles.exhibitionRoot}>
      {(exhibition.isSyntheticPreview || exhibition.editorialReview.status !== "published" || exhibition.isStagingDraft) && (
        <div className={styles.stagingNoticeBanner} role="alert">
          <span className={styles.stagingBadge}>TASLAK — İNSAN İNCELEMESİ YOK</span>
          <p>
            Bu sergi henüz bağımsız insan tarihçi ve editör onayından geçmemiştir. Yalnızca geliştirme ve editoryal önizleme amacıyla sunulmaktadır.
          </p>
        </div>
      )}

      {/* Immersive Museum Hero */}
      <ExhibitionHero
        title={exhibition.title}
        subtitle={heroSection?.subtitle || ""}
        summary={heroSection?.leadParagraph || exhibition.summary}
        coverImage={exhibition.coverImage.src}
        themeLabel={exhibition.themeLabel}
        chronologicalRange={exhibition.chronologicalScope.displayRange}
        curator={exhibition.curator.name}
        recordCount={exhibition.relatedArchiveRecordSlugs.length}
        viewMode={viewMode}
        onToggleMode={setViewMode}
        reviewStatus={exhibition.editorialReview.status}
        isSynthetic={exhibition.isSyntheticPreview}
      />

      {/* Main Exhibition Content Area */}
      <div className={styles.exhibitionMain}>
        {viewMode === "room" ? (
          <VirtualGalleryRoom
            sections={exhibition.sections}
            onInspectSource={handleInspectSource}
          />
        ) : (
          <ExhibitionSectionRenderer
            sections={exhibition.sections}
            onInspectSource={handleInspectSource}
          />
        )}
      </div>

      {/* Primary Source Inspector Drawer */}
      <SourceInspector
        source={inspectedSource}
        isOpen={isInspectorOpen}
        onClose={handleCloseInspector}
      />
    </div>
  );
}
