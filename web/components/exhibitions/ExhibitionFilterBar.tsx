"use client";

import React from "react";
import styles from "./exhibitions.module.css";
import type { ExhibitionTheme } from "@/lib/exhibitions/types";

export interface ExhibitionFilterBarProps {
  themes: Array<{ theme: ExhibitionTheme; label: string; count: number }>;
  selectedTheme: string;
  searchQuery: string;
  onThemeChange: (theme: string) => void;
  onSearchChange: (query: string) => void;
  totalCount: number;
}

export function ExhibitionFilterBar({
  themes,
  selectedTheme,
  searchQuery,
  onThemeChange,
  onSearchChange,
  totalCount,
}: ExhibitionFilterBarProps) {
  return (
    <div className={styles.filterBar} role="search" aria-label="Sergi Filtreleme">
      <div className={styles.filterInputs}>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Sergi başlığı veya konu ara..."
          className={styles.searchInput}
          aria-label="Sergi arama"
        />

        <select
          value={selectedTheme}
          onChange={(e) => onThemeChange(e.target.value)}
          className={styles.themeSelect}
          aria-label="Tema filtresi"
        >
          <option value="all">Tüm Temalar ({totalCount})</option>
          {themes.map((th) => (
            <option key={th.theme} value={th.theme}>
              {th.label} ({th.count})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterCountInfo}>
        <span>Toplam <strong>{totalCount}</strong> küratöryel sergi listelendi</span>
      </div>
    </div>
  );
}
