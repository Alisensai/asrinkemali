"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchItems } from "@/lib/site-data";

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = normalize(query.trim());
    return normalized ? searchItems.filter((item) => normalize(`${item.title} ${item.keywords}`).includes(normalized)) : searchItems;
  }, [query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      dialog.showModal();
      queueMicrotask(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return <dialog id="site-search" ref={dialogRef} className="search-dialog" aria-labelledby="search-title" onCancel={onClose} onClose={onClose} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); dialogRef.current?.close(); onClose(); } }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="search-modal-content"><div className="search-modal-heading"><h2 id="search-title">ARŞİVDE ARA</h2><button type="button" aria-label="Aramayı kapat" onClick={onClose}>×</button></div><label htmlFor="site-search-input">Sayfa veya bölüm ara</label><input ref={inputRef} id="site-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Örn. arşiv, kronoloji..." autoComplete="off" /><div className="search-results" aria-live="polite">{results.length > 0 ? results.map((item) => <Link key={item.href} href={item.href} className="search-result" onClick={onClose}><span>{item.kind}</span><strong>{item.title}</strong></Link>) : <p className="search-empty">Sonuç bulunamadı. Başka bir anahtar kelime deneyin.</p>}</div></div></dialog>;
}
