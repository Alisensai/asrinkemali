import Link from "next/link";
import type { ArchiveRecordType } from "../../../schemas/archive-record.types";
import { HISTORICAL_PERIODS } from "../../lib/explore-ui/recommendations";
import styles from "../../app/kesfet/kesfet.module.css";

interface ExploreFilterBarProps {
  activeFilters: {
    q?: string;
    tur?: ArchiveRecordType;
    kategori?: string;
    donem?: string;
    kayit?: string;
    siralama?: string;
  };
  availableTypes: { type: ArchiveRecordType; label: string; count: number }[];
  availableCategories: { name: string; count: number }[];
  totalResults: number;
}

function buildQueryUrl(
  base: {
    q?: string;
    tur?: string;
    kategori?: string;
    donem?: string;
    kayit?: string;
    siralama?: string;
  },
  updates: Record<string, string | undefined>
): string {
  const merged = { ...base, ...updates };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(merged)) {
    if (value && value.trim().length > 0) {
      params.set(key, value.trim());
    }
  }

  const query = params.toString();
  return query ? `/kesfet?${query}` : "/kesfet";
}

export function ExploreFilterBar({
  activeFilters,
  availableTypes,
  availableCategories,
  totalResults,
}: ExploreFilterBarProps) {
  const hasActiveFilters = Boolean(
    activeFilters.tur ||
      activeFilters.kategori ||
      activeFilters.donem ||
      activeFilters.q
  );

  const topCategories = availableCategories.slice(0, 8);

  return (
    <nav className={styles.filterBar} aria-label="Keşif filtreleri">
      {/* 1. Tür Sekmeleri */}
      <div className={styles.filterSection}>
        <span className={styles.filterSectionLabel}>Kayıt Türü:</span>
        <div className={styles.pillList} role="tablist" aria-label="Kayıt türleri">
          <Link
            href={buildQueryUrl(activeFilters, { tur: undefined })}
            className={
              !activeFilters.tur ? styles.pillActive : styles.pill
            }
            role="tab"
            aria-selected={!activeFilters.tur}
          >
            Tümü
          </Link>
          {availableTypes.map((t) => {
            const isSelected = activeFilters.tur === t.type;
            return (
              <Link
                key={t.type}
                href={buildQueryUrl(activeFilters, {
                  tur: isSelected ? undefined : t.type,
                })}
                className={isSelected ? styles.pillActive : styles.pill}
                role="tab"
                aria-selected={isSelected}
              >
                {t.label}
                <span className={styles.pillCount}>({t.count})</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2. Dönem Çipleri */}
      <div className={styles.filterSection}>
        <span className={styles.filterSectionLabel}>Tarihsel Dönem:</span>
        <div className={styles.chipList}>
          <Link
            href={buildQueryUrl(activeFilters, { donem: undefined })}
            className={
              !activeFilters.donem ? styles.chipActive : styles.chip
            }
          >
            Tüm Dönemler
          </Link>
          {HISTORICAL_PERIODS.map((period) => {
            const isSelected = activeFilters.donem === period.id;
            return (
              <Link
                key={period.id}
                href={buildQueryUrl(activeFilters, {
                  donem: isSelected ? undefined : period.id,
                })}
                className={isSelected ? styles.chipActive : styles.chip}
                title={period.description}
              >
                {period.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. Popüler Tematik Kategoriler */}
      {topCategories.length > 0 ? (
        <div className={styles.filterSection}>
          <span className={styles.filterSectionLabel}>Öne Çıkan Temalar:</span>
          <div className={styles.categoryList}>
            {topCategories.map((cat) => {
              const isSelected = activeFilters.kategori === cat.name;
              return (
                <Link
                  key={cat.name}
                  href={buildQueryUrl(activeFilters, {
                    kategori: isSelected ? undefined : cat.name,
                  })}
                  className={
                    isSelected
                      ? styles.categoryBadgeActive
                      : styles.categoryBadge
                  }
                >
                  {cat.name}
                  <span className={styles.categoryCount}>({cat.count})</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 4. Sonuç Bilgisi ve Sıralama */}
      <div className={styles.filterSummaryBar}>
        <div className={styles.resultCount} role="status" aria-live="polite">
          Toplam <strong>{totalResults}</strong> kayıt bulundu
          {activeFilters.q ? (
            <span> &quot;{activeFilters.q}&quot; için</span>
          ) : null}
        </div>

        <div className={styles.sortWrapper}>
          <span className={styles.sortLabel}>Sırala:</span>
          <Link
            href={buildQueryUrl(activeFilters, { siralama: "alaka" })}
            className={
              activeFilters.siralama === "alaka" || !activeFilters.siralama
                ? styles.sortOptionActive
                : styles.sortOption
            }
          >
            En İlgili
          </Link>
          <Link
            href={buildQueryUrl(activeFilters, { siralama: "yeni" })}
            className={
              activeFilters.siralama === "yeni"
                ? styles.sortOptionActive
                : styles.sortOption
            }
          >
            Yeniden Eskiye
          </Link>
          <Link
            href={buildQueryUrl(activeFilters, { siralama: "eski" })}
            className={
              activeFilters.siralama === "eski"
                ? styles.sortOptionActive
                : styles.sortOption
            }
          >
            Eskiden Yeniye
          </Link>
        </div>

        {hasActiveFilters ? (
          <Link
            href="/kesfet"
            className={styles.resetFiltersButton}
            aria-label="Tüm filtreleri sıfırla"
          >
            Filtreleri Temizle ✕
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
