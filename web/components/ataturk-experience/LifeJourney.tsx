"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { ExperiencePeriod, ExperienceRecord, YearMark } from "@/lib/ataturk-experience";
import { RecordDetails } from "./RecordDetails";
import { TypeBadge } from "./TypeBadge";
import styles from "./ataturk-experience.module.css";

type Props = { periods: ExperiencePeriod[]; records: ExperienceRecord[]; yearMarks: YearMark[] };

function prefersReducedMotion() { return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

export function LifeJourney({ periods, records, yearMarks }: Props) {
  const bySlug = useMemo(() => new Map(records.map((record) => [record.slug, record])), [records]);
  const navigable = useMemo(() => yearMarks.filter((mark) => mark.count > 0), [yearMarks]);
  const [activeYear, setActiveYear] = useState<number | null>(navigable[0]?.year ?? null);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);

  // Kaydırma konumuna göre etkin yılı izler; yalnız görsel vurgu ve aria-current için.
  useEffect(() => {
    const root = rootRef.current; if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => { const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (visible) setActiveYear(Number((visible.target as HTMLElement).dataset.year)); }, { rootMargin: "-30% 0px -60% 0px" });
    root.querySelectorAll<HTMLElement>("[data-year]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  // Etkin yıl rayda görünür kalsın (yatay mobil ray).
  useEffect(() => {
    const rail = railRef.current; const button = rail?.querySelector<HTMLElement>(`[data-rail-year="${activeYear}"]`); if (!rail || !button) return;
    const left = button.offsetLeft - rail.clientWidth / 2 + button.clientWidth / 2;
    if (rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [activeYear]);

  const goToYear = useCallback((year: number) => {
    const target = document.getElementById(`yil-${year}`); if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true }); setActiveYear(year);
  }, []);

  const toggle = (slug: string) => setOpen((current) => { const next = new Set(current); if (next.has(slug)) next.delete(slug); else next.add(slug); return next; });

  const openRelated = (slug: string) => {
    setOpen((current) => new Set(current).add(slug));
    requestAnimationFrame(() => { const target = document.getElementById(`olay-${slug}`); target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" }); target?.querySelector<HTMLElement>("button[aria-expanded]")?.focus({ preventScroll: true }); });
  };

  const onRailKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: navigable.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = Math.max(0, Math.min(navigable.length - 1, keys[event.key]));
    railRef.current?.querySelector<HTMLButtonElement>(`[data-rail-year="${navigable[next].year}"]`)?.focus();
  };

  const focusYear = activeYear ?? navigable[0]?.year;
  const anchored = new Set<number>();
  const activeIndex = Math.max(0, navigable.findIndex((mark) => mark.year === activeYear));
  const progress = navigable.length > 1 ? activeIndex / (navigable.length - 1) : 1;

  return <div className={styles.journey} ref={rootRef}>
    <nav className={styles.rail} aria-label="Yıllar arasında gezin" style={{ "--progress": progress } as CSSProperties}>
      <p className={styles.railHint} id="yil-rayi-ipucu">Yıl seçin · ok tuşlarıyla gezinin</p>
      <span className={styles.railTrack} aria-hidden="true"><span className={styles.railFill} /></span>
      <ol ref={railRef} aria-describedby="yil-rayi-ipucu">
        {yearMarks.map((mark) => {
          const index = navigable.findIndex((item) => item.year === mark.year);
          if (mark.count === 0) return <li key={mark.year} className={styles.railGap}><span><span aria-hidden="true">{mark.year}</span><span className={styles.srOnly}>{mark.year}: yayımlanmış kayıt yok</span></span></li>;
          const isActive = mark.year === activeYear;
          return <li key={mark.year}><button type="button" data-rail-year={mark.year} className={styles.railYear} aria-current={isActive ? "true" : undefined} tabIndex={mark.year === focusYear ? 0 : -1} onKeyDown={(event) => onRailKey(event, index)} onClick={() => goToYear(mark.year)}><span className={styles.railYearNumber}>{mark.year}</span>{" "}<span className={styles.railCount}>{mark.count}<span className={styles.srOnly}> kayıt</span></span></button></li>;
        })}
      </ol>
    </nav>

    <div className={styles.periods}>
      {periods.map((period, periodIndex) => {
        const periodRecords = period.recordSlugs.map((slug) => bySlug.get(slug)).filter((record): record is ExperienceRecord => Boolean(record));
        const groups = new Map<string, ExperienceRecord[]>();
        for (const record of periodRecords) { const key = record.year === null ? "tarihsiz" : String(record.year); groups.set(key, [...(groups.get(key) ?? []), record]); }
        return <section key={period.id} id={`donem-${period.id}`} className={styles.period} aria-labelledby={`donem-baslik-${period.id}`} data-empty={periodRecords.length === 0 ? "true" : undefined}>
          <header className={`${styles.periodHeader} ${styles.reveal}`}>
            <span className={styles.periodIndex} aria-hidden="true">{String(periodIndex + 1).padStart(2, "0")}</span>
            <p className={styles.periodRange}>{period.range}</p>
            <h3 id={`donem-baslik-${period.id}`} className={styles.periodTitle}>{period.title}</h3>
            <p className={styles.periodIntro}>{period.intro}</p>
            <p className={styles.periodMeta}>{periodRecords.length ? `${periodRecords.length} kaynaklı kayıt` : "Yayımlanmış kayıt yok"}{period.inLifetime ? "" : " · yaşam çizelgesinin dışında"}</p>
            {period.emptyYears.length ? <p className={styles.honestNote}>Bu dönemde yayımlanmış kaydı bulunmayan yıllar: {period.emptyYears.join(", ")}. Bu, o yıllarda olay yaşanmadığı anlamına gelmez.</p> : null}
          </header>
          {periodRecords.length === 0 ? <div className={styles.gapCard} role="note"><p><strong>Arşiv boşluğu.</strong> Bu dönem için kaynak denetiminden geçmiş kayıt henüz yok; sayfa bu dönemi tahmin veya uydurma metinle doldurmaz.</p><Link className={styles.inlineLink} href="/arsiv">Mevcut arşivi incele</Link></div> : null}
          {[...groups.entries()].map(([key, items]) => {
            const year = Number(key); const isAnchor = key !== "tarihsiz" && !anchored.has(year); if (isAnchor) anchored.add(year);
            return <div key={key} className={styles.yearGroup} data-year={key === "tarihsiz" ? undefined : key}>
              <h4 id={isAnchor ? `yil-${key}` : undefined} tabIndex={isAnchor ? -1 : undefined} className={styles.yearHeading}><span>{key === "tarihsiz" ? "Tarihsiz" : key}</span></h4>
              <ol className={styles.events}>
                {items.map((record) => {
                  const isOpen = open.has(record.slug);
                  return <li key={record.slug} id={`olay-${record.slug}`} className={`${styles.event} ${styles.reveal}`} data-open={isOpen ? "true" : undefined}>
                    <span className={styles.eventDot} aria-hidden="true" />
                    <div className={styles.eventMeta}>{record.dateStart ? <time dateTime={record.dateStart}>{record.dateDisplay}</time> : <span>{record.dateDisplay}</span>}<TypeBadge type={record.type} label={record.typeLabel} />{record.dateNote ? <span className={styles.precisionFlag} title={record.dateNote}>Tarih notu</span> : null}</div>
                    <h5 className={styles.eventTitle}>{record.title}</h5>
                    <p className={styles.eventSummary}>{record.summary}</p>
                    <p className={styles.eventSource}><span className={styles.srOnly}>Kaynak kurum: </span>{record.institution}</p>
                    <button type="button" className={styles.disclosure} aria-expanded={isOpen} aria-controls={`panel-${record.slug}`} onClick={() => toggle(record.slug)}><span>{isOpen ? "Bilgi panelini kapat" : "Kaynak ve ayrıntılar"}</span><span className={styles.chevron} aria-hidden="true" /></button>
                    <div id={`panel-${record.slug}`} className={styles.panel} hidden={!isOpen}>{isOpen ? <RecordDetails record={record} onSelectRelated={openRelated} /> : null}</div>
                  </li>;
                })}
              </ol>
            </div>;
          })}
        </section>;
      })}
    </div>
  </div>;
}
