"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { formatYearRanges, unpackExperienceRecords, type ExperiencePeriod, type ExperienceRecord, type PackedExperienceRecords, type RailItem } from "@/lib/ataturk-experience";
import { RecordDetails } from "./RecordDetails";
import { TypeBadge } from "./TypeBadge";
import styles from "./ataturk-experience.module.css";

type Props = { periods: ExperiencePeriod[]; packed: PackedExperienceRecords; rail: RailItem[] };
type Navigable = Exclude<RailItem, { kind: "gap" }>;

function prefersReducedMotion() { return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function railKey(item: Navigable) { return item.kind === "year" ? `y-${item.year}` : `p-${item.periodId}`; }
function targetId(key: string) { return key.startsWith("y-") ? `yil-${key.slice(2)}` : `donem-baslik-${key.slice(2)}`; }

export function LifeJourney({ periods, packed, rail }: Props) {
  const records = useMemo(() => unpackExperienceRecords(packed), [packed]);
  const bySlug = useMemo(() => new Map(records.map((record) => [record.slug, record])), [records]);
  const navigable = useMemo(() => rail.filter((item): item is Navigable => item.kind !== "gap"), [rail]);
  const lifetimePeriods = useMemo(() => new Set(periods.filter((period) => period.inLifetime).map((period) => period.id)), [periods]);
  const [activeKey, setActiveKey] = useState<string | null>(() => { const first = navigable.find((item) => item.kind === "year") ?? navigable[0]; return first ? railKey(first) : null; });
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);

  // Hidrasyon tamamlandı işareti: testler ve otomasyon etkileşimden önce bunu bekler.
  useEffect(() => { rootRef.current?.setAttribute("data-ready", "true"); }, []);

  // Kaydırma konumuna göre etkin ray öğesini izler; yalnız görsel vurgu ve aria-current için.
  useEffect(() => {
    const root = rootRef.current; if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => { const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; const key = (visible?.target as HTMLElement | undefined)?.dataset.railKey; if (key) setActiveKey(key); }, { rootMargin: "-30% 0px -60% 0px" });
    root.querySelectorAll<HTMLElement>("[data-rail-key]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  // Etkin öğe rayda görünür kalsın (yatay mobil ray).
  useEffect(() => {
    const list = railRef.current; const button = list?.querySelector<HTMLElement>(`[data-rail-target="${activeKey}"]`); if (!list || !button) return;
    const left = button.offsetLeft - list.clientWidth / 2 + button.clientWidth / 2;
    if (list.scrollWidth > list.clientWidth) list.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [activeKey]);

  const goTo = useCallback((key: string) => {
    const target = document.getElementById(targetId(key)); if (!target) return;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true }); setActiveKey(key);
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
    railRef.current?.querySelector<HTMLButtonElement>(`[data-rail-target="${railKey(navigable[next])}"]`)?.focus();
  };

  const anchored = new Set<number>();
  const activeIndex = Math.max(0, navigable.findIndex((item) => railKey(item) === activeKey));
  const progress = navigable.length > 1 ? activeIndex / (navigable.length - 1) : 1;

  return <div className={styles.journey} ref={rootRef}>
    <nav className={styles.rail} aria-label="Yıllar arasında gezin" style={{ "--progress": progress } as CSSProperties}>
      <p className={styles.railHint} id="yil-rayi-ipucu">Yıl seçin · ok tuşlarıyla gezinin</p>
      <span className={styles.railTrack} aria-hidden="true"><span className={styles.railFill} /></span>
      <ol ref={railRef} aria-describedby="yil-rayi-ipucu">
        {rail.map((item) => {
          if (item.kind === "gap") {
            const label = item.from === item.to ? String(item.from) : `${item.from}–${item.to}`;
            return <li key={`g-${item.from}`} className={styles.railGap}><span><span aria-hidden="true">{label}</span><span className={styles.srOnly}>{label}: yayımlanmış kayıt yok</span></span></li>;
          }
          const key = railKey(item); const index = navigable.findIndex((candidate) => railKey(candidate) === key); const isActive = key === activeKey;
          return <li key={key} className={item.kind === "period" ? styles.railPeriodItem : undefined}>
            <button type="button" data-rail-target={key} className={`${styles.railYear}${item.kind === "period" ? ` ${styles.railPeriod}` : ""}`} aria-current={isActive ? "true" : undefined} tabIndex={key === (activeKey ?? railKey(navigable[0])) ? 0 : -1} onKeyDown={(event) => onRailKey(event, index)} onClick={() => goTo(key)}>
              <span className={styles.railYearNumber}>{item.kind === "year" ? item.year : item.label}</span>{" "}<span className={styles.railCount}>{item.count}<span className={styles.srOnly}> kayıt</span></span>
            </button>
          </li>;
        })}
      </ol>
    </nav>

    <div className={styles.periods}>
      {periods.map((period, periodIndex) => {
        const periodRecords = period.recordSlugs.map((slug) => bySlug.get(slug)).filter((record): record is ExperienceRecord => Boolean(record));
        const groups = new Map<string, ExperienceRecord[]>();
        for (const record of periodRecords) { const key = record.year === null ? "tarihsiz" : String(record.year); groups.set(key, [...(groups.get(key) ?? []), record]); }
        const isLifetime = lifetimePeriods.has(period.id);
        return <section key={period.id} id={`donem-${period.id}`} className={styles.period} aria-labelledby={`donem-baslik-${period.id}`} data-empty={periodRecords.length === 0 ? "true" : undefined} data-rail-key={isLifetime ? undefined : `p-${period.id}`}>
          <header className={`${styles.periodHeader} ${styles.reveal}`}>
            <span className={styles.periodIndex} aria-hidden="true">{String(periodIndex + 1).padStart(2, "0")}</span>
            <p className={styles.periodRange}>{period.range}</p>
            <h3 id={`donem-baslik-${period.id}`} tabIndex={-1} className={styles.periodTitle}>{period.title}</h3>
            <p className={styles.periodIntro}>{period.intro}</p>
            <p className={styles.periodMeta}>{periodRecords.length ? `${periodRecords.length} kaynaklı kayıt` : "Yayımlanmış kayıt yok"}{period.inLifetime ? "" : " · yaşam çizelgesinin dışında"}</p>
            {period.emptyYears.length ? <p className={styles.honestNote}>Bu dönemde yayımlanmış kaydı bulunmayan yıllar: {formatYearRanges(period.emptyYears)}. Bu, o yıllarda olay yaşanmadığı anlamına gelmez.</p> : null}
          </header>
          {periodRecords.length === 0 ? <div className={styles.gapCard} role="note"><p><strong>Arşiv boşluğu.</strong> Bu dönem için kaynak denetiminden geçmiş kayıt henüz yok; sayfa bu dönemi tahmin veya uydurma metinle doldurmaz.</p><Link className={styles.inlineLink} href="/arsiv">Mevcut arşivi incele</Link></div> : null}
          {[...groups.entries()].map(([key, items]) => {
            const year = Number(key); const isAnchor = isLifetime && key !== "tarihsiz" && !anchored.has(year); if (isAnchor) anchored.add(year);
            return <div key={key} className={styles.yearGroup} data-rail-key={isAnchor ? `y-${key}` : undefined}>
              <h4 id={isAnchor ? `yil-${key}` : undefined} tabIndex={isAnchor ? -1 : undefined} className={styles.yearHeading}><span>{key === "tarihsiz" ? "Tarihsiz" : key}</span></h4>
              <ol className={styles.events}>
                {items.map((record) => {
                  const isOpen = open.has(record.slug);
                  return <li key={record.slug} id={`olay-${record.slug}`} className={`${styles.event} ${styles.reveal}`} data-open={isOpen ? "true" : undefined}>
                    <span className={styles.eventDot} aria-hidden="true" />
                    <div className={styles.eventMeta}>{record.dateStart ? <time dateTime={record.dateStart}>{record.dateDisplay}</time> : <span>{record.dateDisplay}</span>}<TypeBadge type={record.type} label={record.typeLabel} />{record.dateNote ? <span className={styles.precisionFlag}>{record.type === "place" ? "Mekân tarihi" : "Tarih notu"}</span> : null}</div>
                    <h5 className={styles.eventTitle}>{record.title}</h5>
                    <p className={styles.eventSummary}>{record.summary}</p>
                    <p className={styles.eventSource}><span className={styles.srOnly}>Kaynak kurum: </span>{record.institution}</p>
                    <button type="button" className={styles.disclosure} aria-expanded={isOpen} aria-controls={`panel-${record.slug}`} onClick={() => toggle(record.slug)}><span>Kaynak ve ayrıntılar</span><span className={styles.srOnly}>: {record.title}</span><span className={styles.chevron} aria-hidden="true" /></button>
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
