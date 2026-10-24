"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { filterRecords, RECORD_TYPE_LABELS } from "@/lib/document-comparison/model";
import type { ComparisonDataset, ComparisonRecord } from "@/lib/document-comparison/model";
import styles from "./comparison.module.css";

interface Props {
  isOpen: boolean;
  targetSlot: "A" | "B";
  disabledSlug: string | null;
  dataset: ComparisonDataset;
  onSelect: (record: ComparisonRecord) => void;
  onClose: () => void;
}

export function DocumentSelectionModal({
  isOpen,
  targetSlot,
  disabledSlug,
  dataset,
  onSelect,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedInst, setSelectedInst] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    return filterRecords(dataset.records, search, selectedType, selectedInst);
  }, [dataset.records, search, selectedType, selectedInst]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-modal-title"
        ref={modalRef}
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <h2 id="comparison-modal-title">
            {targetSlot === "A" ? "1. Belgeyi Seçiniz" : "2. Belgeyi Seçiniz"}
          </h2>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Pencereyi kapat"
          >
            ✕ Kapat
          </button>
        </div>

        <div className={styles.modalFilters}>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Başlık, kişi, konu veya kurum ara…"
            aria-label="Katalogda arama yap"
          />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Belge türü filtresi"
          >
            <option value="all">Tüm Belge Türleri</option>
            {dataset.types.map((type) => (
              <option key={type} value={type}>
                {RECORD_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <select
            value={selectedInst}
            onChange={(e) => setSelectedInst(e.target.value)}
            aria-label="Kaynak kurumu filtresi"
          >
            <option value="">Tüm Kurumlar</option>
            {dataset.institutions.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.modalList} role="listbox" aria-label="Seçilebilir arşiv belgeleri">
          {filtered.length === 0 ? (
            <div className={styles.emptySlot} style={{ minHeight: "160px" }}>
              <p>Arama kriterlerinize uygun yayıma açık katalog kaydı bulunamadı.</p>
            </div>
          ) : (
            filtered.map((record) => {
              const isDisabled = disabledSlug === record.slug;
              return (
                <div
                  key={record.id}
                  className={`${styles.modalItem} ${isDisabled ? styles.modalItemDisabled : ""}`}
                  role="option"
                  aria-selected={false}
                  aria-disabled={isDisabled}
                  tabIndex={isDisabled ? -1 : 0}
                  onClick={() => {
                    if (!isDisabled) {
                      onSelect(record);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onSelect(record);
                    }
                  }}
                >
                  <div className={styles.modalItemText}>
                    <h4>{record.title}</h4>
                    <div className={styles.modalItemMeta}>
                      <span>{record.typeLabel}</span>
                      <span>·</span>
                      <span>{record.date.display}</span>
                      <span>·</span>
                      <span>{record.institution}</span>
                    </div>
                  </div>
                  <div>
                    {isDisabled ? (
                      <span className={styles.badge}>Diğer panelde seçili</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.modalItemBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(record);
                        }}
                      >
                        Seç →
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
