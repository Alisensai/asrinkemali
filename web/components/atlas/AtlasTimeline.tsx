"use client";
import { useMemo, useState } from "react";
import type { AtlasRecord } from "@/lib/atlas/model";
import { yearSpan } from "@/lib/atlas/model";
import styles from "./atlas.module.css";

/** Starts only. A place's founding/construction year is NEVER re-labelled as a life event. */
export function AtlasTimeline({records,onChooseYear}: {records:readonly AtlasRecord[];onChooseYear:(year:number)=>void}) {
  const grouped=useMemo(()=>{
    const counts=new Map<number,number>();
    for(const record of records){const year=yearSpan(record).from;if(year!==null)counts.set(year,(counts.get(year)??0)+1);}
    return [...counts].sort((a,b)=>a[0]-b[0]);
  },[records]);
  const [offset,setOffset]=useState(0);
  const visible=grouped.slice(offset,offset+18);
  const max=Math.max(1,...visible.map(([,count])=>count));
  return <div className={styles.timelinePanel} aria-label="Kayıt tarihlerinin yıla göre dağılımı">
    <div className={styles.timelineHead}><strong>Yıllara göre arşiv kapsamı</strong><span>{grouped.length} farklı başlangıç yılı</span></div>
    {visible.length?<div className={styles.timelineRail} role="group" aria-label="Arşiv yıllarını filtrele">
      {visible.map(([year,count])=><button key={year} type="button" onClick={()=>onChooseYear(year)} aria-label={`${year}: ${count} katalog kaydı; yılı filtrele`}><span className={styles.timelineCount}>{count}</span><span className={styles.timelineBar} style={{height:`${Math.max(8,Math.round(count/max*70))}px`}} aria-hidden="true"/><span>{year}</span></button>)}
    </div>:<p>Seçili filtrelerde tarihlenmiş kayıt bulunamadı.</p>}
    {grouped.length>18?<div className={styles.timelineNavigation}><button type="button" disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-18))}>← Önceki yıllar</button><button type="button" disabled={offset+18>=grouped.length} onClick={()=>setOffset(v=>Math.min(Math.max(0,grouped.length-18),v+18))}>Sonraki yıllar →</button></div>:null}
    <p className={styles.microText}>Gösterilen yıllar katalogdaki tarih alanının başlangıcıdır: olay, belge, yayın ve mekân geçmişi ayrı bağlamlardır. Yüksek kayıt sayısı tarihî önem göstermez.</p>
  </div>;
}
