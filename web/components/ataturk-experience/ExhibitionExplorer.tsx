"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExperienceRecord, ExperienceTheme } from "@/lib/ataturk-experience";
import type { ArchiveRecordType } from "../../../schemas/archive-record.types";
import { RecordDetails } from "./RecordDetails";
import { TypeBadge } from "./TypeBadge";
import styles from "./ataturk-experience.module.css";

type Props = { records: ExperienceRecord[]; themes: ExperienceTheme[]; typeCounts: { type: ArchiveRecordType; label: string; count: number }[] };
type TypeFilter = "all" | ArchiveRecordType;

const PAGE_SIZE = 12;
const COVERAGE_LABELS = { available: "Kaynaklı kayıt var", partial: "Kısmi kapsam", none: "Kayıt bekleniyor" } as const;

export function ExhibitionExplorer({ records, themes, typeCounts }: Props) {
  const [type, setType] = useState<TypeFilter>("all");
  const [theme, setTheme] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);

  const bySlug = useMemo(() => new Map(records.map((record) => [record.slug, record])), [records]);
  const filtered = useMemo(() => records.filter((record) => (type === "all" || record.type === type) && (theme === "all" || record.themeIds.includes(theme))), [records, type, theme]);
  const visible = filtered.slice(0, limit);
  const activeTheme = themes.find((item) => item.id === theme);
  const selectedRecord = selected ? bySlug.get(selected) : undefined;

  useEffect(() => {
    const dialog = dialogRef.current; if (!dialog) return;
    if (selectedRecord && !dialog.open) dialog.showModal();
    if (selectedRecord) dialogTitleRef.current?.focus();
    if (!selectedRecord && dialog.open) dialog.close();
  }, [selectedRecord]);

  const chooseTheme = (id: string) => {
    setTheme(id); setType("all"); setLimit(PAGE_SIZE);
    const heading = resultsRef.current; if (!heading) return;
    heading.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    heading.focus({ preventScroll: true });
  };
  const openRecord = (slug: string, trigger: HTMLElement) => { triggerRef.current = trigger; setSelected(slug); };
  const closeDialog = () => { setSelected(null); requestAnimationFrame(() => triggerRef.current?.focus()); };
  const reset = () => { setType("all"); setTheme("all"); setLimit(PAGE_SIZE); };

  return <>
    <section id="temalar" className={styles.section} aria-labelledby="temalar-baslik">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Tematik keşif</p>
        <h2 id="temalar-baslik" className={styles.sectionTitle}>Bir yaşamın sekiz kapısı</h2>
        <p className={styles.sectionLead}>Her tema, arşiv kayıtlarının kendi kategori ve tür bilgilerinden oluşturulur. Kaynaklı kaydı olmayan temalar kapalı tutulur; kapsamı kısmi olanlar açıkça işaretlenir.</p>
      </div>
      <ul className={styles.themeGrid}>
        {themes.map((item, index) => <li key={item.id} className={styles.reveal}>
          <button type="button" className={styles.themeCard} data-coverage={item.coverage} aria-pressed={theme === item.id} disabled={item.count === 0} onClick={() => chooseTheme(item.id)} aria-describedby={`tema-not-${item.id}`}>
            <span className={styles.themeNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.themeTitle}>{item.title}</span>
            <span className={styles.themeDescription}>{item.description}</span>
            <span className={styles.themeFooter}><span className={styles.coverage} data-coverage={item.coverage}>{COVERAGE_LABELS[item.coverage]}</span><span className={styles.themeCount}>{item.count} kayıt</span></span>
          </button>
          <p id={`tema-not-${item.id}`} className={styles.themeNote}>{item.note ?? "Sergide bu temaya ait kayıtları gösterir."}</p>
        </li>)}
      </ul>
    </section>

    <section id="sergi" className={styles.section} aria-labelledby="sergi-baslik">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Dijital sergi</p>
        <h2 id="sergi-baslik" className={styles.sectionTitle}>Arşiv kayıtları salonu</h2>
        <p className={styles.sectionLead}>Fotoğraf ve belge kayıtları ayrı türler olarak işaretlenir. Görsellerin yeniden kullanım hakkı doğrulanmadığından tarihî görüntüler kopyalanmaz; her kart kaynak kurumun sayfasına yönlendirir.</p>
      </div>

      <div className={styles.filters}>
        <div className={styles.typeFilter} role="group" aria-label="Kayıt türüne göre süz">
          <button type="button" className={styles.chip} aria-pressed={type === "all"} onClick={() => { setType("all"); setLimit(PAGE_SIZE); }}>Tümü <span className={styles.chipCount}>{records.length}</span></button>
          {typeCounts.map((item) => <button key={item.type} type="button" className={styles.chip} aria-pressed={type === item.type} onClick={() => { setType(item.type); setLimit(PAGE_SIZE); }}>{item.label} <span className={styles.chipCount}>{item.count}</span></button>)}
        </div>
        <div className={styles.themeSelect}>
          <label htmlFor="sergi-tema">Tema</label>
          <select id="sergi-tema" value={theme} onChange={(event) => { setTheme(event.target.value); setLimit(PAGE_SIZE); }}>
            <option value="all">Tüm temalar</option>
            {themes.filter((item) => item.count > 0).map((item) => <option key={item.id} value={item.id}>{item.title} ({item.count})</option>)}
          </select>
        </div>
      </div>

      <h3 ref={resultsRef} tabIndex={-1} className={styles.resultsHeading}>{activeTheme ? activeTheme.title : "Tüm kayıtlar"}{type !== "all" ? ` · ${typeCounts.find((item) => item.type === type)?.label}` : ""}</h3>
      <p className={styles.resultsCount} aria-live="polite" role="status">{filtered.length} kayıt bulundu{filtered.length > visible.length ? `, ${visible.length} tanesi gösteriliyor` : ""}.</p>
      {activeTheme?.note ? <p className={styles.honestNote}>{activeTheme.note}</p> : null}

      {filtered.length === 0 ? <div className={styles.gapCard} role="note"><p>Bu süzgeç birleşimi için yayımlanmış kayıt yok.</p><button type="button" className={styles.actionGhost} onClick={reset}>Süzgeçleri temizle</button></div> : <ul className={styles.exhibitGrid}>
        {visible.map((record) => <li key={record.slug} className={styles.reveal}>
          <article className={styles.exhibitCard} data-type={record.type} aria-labelledby={`sergi-${record.slug}`}>
            <div className={styles.plate} data-type={record.type} aria-hidden="true">
              <span className={styles.plateYear}>{record.year ?? "—"}</span>
              <span className={styles.plateKind}>{record.type === "photograph" ? "Fotoğraf kaydı" : record.type === "document" ? "Belge kaydı" : record.typeLabel}</span>
              {record.type === "photograph" ? <span className={styles.plateNote}>Görüntü kaynak kurumda</span> : null}
            </div>
            <div className={styles.exhibitBody}>
              <div className={styles.eventMeta}><TypeBadge type={record.type} label={record.typeLabel} />{record.dateStart ? <time dateTime={record.dateStart}>{record.dateDisplay}</time> : <span>{record.dateDisplay}</span>}</div>
              <h4 id={`sergi-${record.slug}`} className={styles.exhibitTitle}>{record.title}</h4>
              <p className={styles.exhibitSummary}>{record.summary}</p>
              <p className={styles.eventSource}>{record.institution}</p>
              <div className={styles.cardActions}>
                <button type="button" className={styles.actionPrimary} onClick={(event) => openRecord(record.slug, event.currentTarget)} aria-haspopup="dialog">Künye ve kaynak<span className={styles.srOnly}>: {record.title}</span></button>
                {record.sourceUrl ? <a className={styles.actionGhost} href={record.sourceUrl} target="_blank" rel="noopener noreferrer external">Kaynak<span aria-hidden="true"> ↗</span><span className={styles.srOnly}>: {record.title} (yeni sekmede açılır)</span></a> : <span className={styles.warningNote}>Kaynak bağlantısı yok</span>}
              </div>
            </div>
          </article>
        </li>)}
      </ul>}
      {filtered.length > visible.length ? <div className={styles.moreRow}><button type="button" className={styles.actionGhost} onClick={() => setLimit((current) => current + PAGE_SIZE)}>Daha fazla kayıt göster <span className={styles.chipCount}>{filtered.length - visible.length} kaldı</span></button></div> : null}
    </section>

    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="kunye-baslik" onClose={() => { if (selected) closeDialog(); }} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      {selectedRecord ? <div className={styles.dialogInner}>
        <header className={styles.dialogHeader}>
          <div className={styles.eventMeta}><TypeBadge type={selectedRecord.type} label={selectedRecord.typeLabel} /><span>{selectedRecord.dateDisplay}</span></div>
          <h2 id="kunye-baslik" ref={dialogTitleRef} tabIndex={-1} className={styles.dialogTitle}>{selectedRecord.title}</h2>
          <button type="button" className={styles.dialogClose} onClick={closeDialog} aria-label="Künye panelini kapat"><span aria-hidden="true">×</span></button>
        </header>
        <RecordDetails record={selectedRecord} onSelectRelated={(slug) => setSelected(slug)} />
        <p className={styles.dialogFoot}>Tüm kayıtlar için <Link className={styles.inlineLink} href="/arsiv">arşiv sayfasını</Link> kullanabilirsiniz.</p>
      </div> : null}
    </dialog>
  </>;
}
