"use client";

import React, { useState } from "react";
import styles from "./exhibitions.module.css";
import { ExhibitionHero } from "./ExhibitionHero";
import { VirtualGalleryRoom } from "./VirtualGalleryRoom";
import { ExhibitionSectionRenderer } from "./ExhibitionSectionRenderer";
import { SourceInspector, type InspectedSource } from "./SourceInspector";
import type { ExhibitionDTO, HeroSection } from "@/lib/exhibitions/types";
import { resolveSourceTrust } from "@/lib/exhibitions/source-trust";

export interface ExhibitionViewProps {
  exhibition: ExhibitionDTO;
}

export function ExhibitionView({ exhibition }: ExhibitionViewProps) {
  const [viewMode, setViewMode] = useState<"room" | "list">("room");
  const [inspectedSource, setInspectedSource] = useState<InspectedSource | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const heroSection = exhibition.sections.find((s) => s.type === "hero") as HeroSection | undefined;

  // Güven durumu kayıt içi beyandan (editorialReview.status, verificationBadge) değil,
  // sentetik/staging işaretleri ve editoryal güven yapılandırmasından türetilir.
  // Karar deposu olmadığı için doğrulanmış onay bugün hiçbir sergi için verilmez.
  const trust = resolveSourceTrust({
    isSyntheticPreview: exhibition.isSyntheticPreview,
    isStagingDraft: exhibition.isStagingDraft === true,
  });

  const handleInspectSource = (source: InspectedSource) => {
    setInspectedSource({ ...source, trust });
    setIsInspectorOpen(true);
  };

  const handleCloseInspector = () => {
    setIsInspectorOpen(false);
  };

  return (
    <div className={styles.exhibitionRoot}>
      {trust.state !== "verified" && (
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
        reviewStatus={trust.label}
        isSynthetic={exhibition.isSyntheticPreview}
      />

      {/* Main Exhibition Content Area */}
      <div className={styles.exhibitionMain}>
        {viewMode === "room" ? (
          <VirtualGalleryRoom
            sections={exhibition.sections}
            onInspectSource={handleInspectSource}
            trust={trust}
          />
        ) : (
          <ExhibitionSectionRenderer
            sections={exhibition.sections}
            onInspectSource={handleInspectSource}
            trust={trust}
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
