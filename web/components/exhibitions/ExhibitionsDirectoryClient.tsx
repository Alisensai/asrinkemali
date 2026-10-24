"use client";

import React, { useState, useMemo } from "react";
import styles from "./exhibitions.module.css";
import { ExhibitionCard } from "./ExhibitionCard";
import { ExhibitionFilterBar } from "./ExhibitionFilterBar";
import type { ExhibitionDTO, ExhibitionTheme } from "@/lib/exhibitions/types";

export interface ExhibitionsDirectoryClientProps {
  initialExhibitions: ExhibitionDTO[];
  themes: Array<{ theme: ExhibitionTheme; label: string; count: number }>;
}

export function ExhibitionsDirectoryClient({
  initialExhibitions,
  themes,
}: ExhibitionsDirectoryClientProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredExhibitions = useMemo(() => {
    return initialExhibitions.filter((item) => {
      if (selectedTheme !== "all" && item.theme !== selectedTheme) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSummary = item.summary.toLowerCase().includes(q);
        const matchesTheme = item.themeLabel.toLowerCase().includes(q);
        const matchesCurator = item.curator.name.toLowerCase().includes(q);
        return matchesTitle || matchesSummary || matchesTheme || matchesCurator;
      }
      return true;
    });
  }, [initialExhibitions, selectedTheme, searchQuery]);

  return (
    <div className={styles.directoryStack}>
      <ExhibitionFilterBar
        themes={themes}
        selectedTheme={selectedTheme}
        searchQuery={searchQuery}
        onThemeChange={setSelectedTheme}
        onSearchChange={setSearchQuery}
        totalCount={filteredExhibitions.length}
      />

      {filteredExhibitions.length > 0 ? (
        <ul className={styles.exhibitionGrid}>
          {filteredExhibitions.map((exhibition) => (
            <ExhibitionCard key={exhibition.slug} exhibition={exhibition} />
          ))}
        </ul>
      ) : (
        <div className={styles.noResultsBox}>
          <h3>Arama kriterine uygun sergi bulunamadı</h3>
          <p>Lütfen arama terimini değiştirin veya tema filtresini temizleyin.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedTheme("all");
              setSearchQuery("");
            }}
            className={styles.resetFilterBtn}
          >
            Filtreleri Sıfırla
          </button>
        </div>
      )}
    </div>
  );
}
