"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchItems } from "@/lib/site-data";
import { Icon } from "./Icon";

export function normalizeSearchText(value: string): string {
  if (!value) return "";
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = normalizeSearchText(query.trim());
    return normalized
      ? searchItems.filter((item) =>
          normalizeSearchText(`${item.title} ${item.keywords}`).includes(normalized)
        )
      : searchItems;
  }, [query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previousFocusRef.current = (document.activeElement as HTMLElement) ?? null;
      setQuery("");
      dialog.showModal();
      queueMicrotask(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
    previousFocusRef.current?.focus();
  };

  return (
    <dialog
      id="site-search"
      ref={dialogRef}
      className="search-dialog"
      aria-labelledby="search-title"
      onCancel={handleClose}
      onClose={handleClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleClose();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="search-modal-content">
        <div className="search-modal-heading">
          <h2 id="search-title">ARŞİVDE ARA</h2>
          <button type="button" aria-label="Aramayı kapat" onClick={handleClose}>
            ×
          </button>
        </div>

        <form
          action="/arsiv"
          method="get"
          onSubmit={() => {
            dialogRef.current?.close();
            onClose();
          }}
        >
          <label htmlFor="site-search-input">Katalog veya sayfa ara</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              ref={inputRef}
              id="site-search-input"
              name="q"
              type="search"
              aria-label="Sayfa veya bölüm ara"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Örn. Nutuk, Çankaya, Lozan..."
              autoComplete="off"
              maxLength={120}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              aria-label="Katalogda ara"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                padding: "0 16px",
                background: "var(--mka-color-red-card, #6e1116)",
                color: "#ffffff",
                border: "1px solid var(--mka-border-gold, rgba(209,163,109,0.45))",
                borderRadius: "4px",
                fontFamily: "var(--mka-font-sans, inherit)",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              <Icon name="search" size={15} />
            </button>
          </div>
        </form>

        <div className="search-results" aria-live="polite">
          {query.trim() && (
            <Link
              href={`/arsiv?q=${encodeURIComponent(query.trim())}`}
              className="search-result"
              onClick={handleClose}
              style={{ borderColor: "var(--mka-color-gold-bright, #e7bf8c)" }}
            >
              <span>KATALOG</span>
              <strong>Tüm Arşivde Ara: &ldquo;{query.trim()}&rdquo; →</strong>
            </Link>
          )}

          {results.length > 0 ? (
            results.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="search-result"
                onClick={handleClose}
              >
                <span>{item.kind}</span>
                <strong>{item.title}</strong>
              </Link>
            ))
          ) : (
            <p className="search-empty">Sonuç bulunamadı. Başka bir anahtar kelime deneyin.</p>
          )}
        </div>
      </div>
    </dialog>
  );
}
