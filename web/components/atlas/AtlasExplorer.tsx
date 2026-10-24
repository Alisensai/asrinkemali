"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ArchiveRecordType } from "../../../schemas/archive-record.types";
import { AtlasMap } from "./AtlasMap";
import { AtlasTimeline } from "./AtlasTimeline";
import { DEFAULT_FILTERS, FEATURED_CITIES, INTERNATIONAL_CITIES, cityComparison, foldTurkish, queryAtlas, recordsByCity } from "@/lib/atlas/model";
import type { AtlasDataset, AtlasFilters, AtlasRecord, AtlasDateKind } from "@/lib/atlas/model";
import styles from "./atlas.module.css";

const TYPE_LABELS: Record<ArchiveRecordType,string> = { photograph:"Fotoğraf",document:"Belge",speech:"Konuşma",event:"Olay",publication:"Yayın",place:"Mekân" };
const DATE_LABELS: Record<AtlasDateKind,string> = {"historical-event":"Olay tarihi","place-history":"Mekân veya kurum tarihi","publication-date":"Yayın tarihi","document-date":"Belge/kayıt tarihi","catalog-date":"Katalog tarihi"};
const TYPES = Object.keys(TYPE_LABELS) as ArchiveRecordType[];
const dateKinds = Object.keys(DATE_LABELS) as AtlasDateKind[];

function Options({values}: {values: readonly string[]}) {return <>{values.map(value=><option key={value} value={value}>{value}</option>)}</>}
function CountRow({label,a,b,max}:{label:string,a:number,b:number,max:number}) {return <tr><th scope="row">{label}</th><td><span className={styles.bar} style={{width:`${Math.round(100*a/Math.max(1,max))}%`}} aria-hidden="true"/>{a}</td><td><span className={styles.bar} style={{width:`${Math.round(100*b/Math.max(1,max))}%`}} aria-hidden="true"/>{b}</td></tr>}
function RecordCard({record,byId}:{record:AtlasRecord,byId:Map<string,AtlasRecord>}) {
  const relations = record.relatedIds.map(id=>byId.get(id)).filter((r):r is AtlasRecord=>Boolean(r)).slice(0,4);
  return <article className={styles.recordCard}>
    <div className={styles.cardTop}><span className={styles.typeBadge}>{TYPE_LABELS[record.type]}</span><span className={styles.dateBadge}>{record.date.display || "Tarih bilinmiyor"}</span></div>
    <h3><Link href={`/arsiv/${encodeURIComponent(record.slug)}`}>{record.title}</Link></h3>
    <p className={styles.cardSummary}>{record.summary}</p>
    <dl className={styles.recordMetadata}>
      <div><dt>Tarih türü</dt><dd>{DATE_LABELS[record.date.kind]}{record.date.certainty!=="exact"?` · ${record.date.certainty==="estimated"?"tahmini":"kesin değil"}`:""}</dd></div>
      <div><dt>Konum</dt><dd>{record.locations.length?record.locations.map(l=>l.label).join(", "):"Arşivde şehir tanımlı değil"}</dd></div>
      <div><dt>Kaynak</dt><dd>{record.institution}</dd></div>
      <div><dt>Kullanım hakkı</dt><dd>{record.rights.replaceAll("_"," ")}</dd></div>
      <div><dt>İnceleme</dt><dd>Yayıma açık katalog kaydı; insan uzman onayı anlamına gelmez</dd></div>
    </dl>
    <details className={styles.sourceDetails}><summary>Kaynak ve künye bilgileri</summary><p>Kaynak başlığı: {record.sourceTitle}</p><p>Özgün kaynak bağlantısı: {record.sourceUrl ? <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer external">Kurumsal sayfayı aç</a>:"Yayımlanabilir güvenli bağlantı yok"}</p><p>Kaynağın yayın tarihi: {record.sourceDate ?? "Belirtilmemiş"}</p><p>Kaynak künyesi: {record.citation ?? "Belirtilmemiş"}</p><p>Tarih kesinliği: {record.date.certainty} / {record.date.precision}</p>{record.provenance.length?<ul>{record.provenance.slice(0,5).map((p,i)=><li key={`${p.institution}-${i}`}>{p.institution}{p.identifier?` — ${p.identifier}`:""}{p.url?<> · <a href={p.url} target="_blank" rel="noopener noreferrer external">Provenans kaynağı</a></>:null}</li>)}</ul>:null}</details>
    {record.people.length>0?<p className={styles.microText}>Kayıtta yer alan kişiler: {record.people.slice(0,5).join(", ")}{record.people.length>5?"…":""}</p>:null}
    {relations.length>0?<div className={styles.related}><strong>Kaynakta katalog ilişkisi bulunanlar</strong><ul>{relations.map(item=><li key={item.id}><Link href={`/arsiv/${encodeURIComponent(item.slug)}`}>{item.title}</Link></li>)}</ul></div>:null}
    <div className={styles.cardActions}><Link href={`/arsiv/${encodeURIComponent(record.slug)}`}>Kayıt ayrıntıları →</Link>{record.sourceUrl?<a href={record.sourceUrl} target="_blank" rel="noopener noreferrer external">Özgün kaynak ↗</a>:<span>Kaynak URL&apos;si geçersiz</span>}</div>
  </article>;
}
export function AtlasExplorer({dataset, initialFilters, warnings}:{dataset:AtlasDataset;initialFilters:AtlasFilters; warnings:string[]}) {
  const [filters,setFilters]=useState<AtlasFilters>(initialFilters);
  const [mode,setMode]=useState<"map"|"list">("map");
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [compareFirst,setCompareFirst]=useState("Ankara");
  const [compareSecond,setCompareSecond]=useState("İstanbul");
  const [compareMode,setCompareMode]=useState(false);
  const [graphRecord,setGraphRecord]=useState("");
  const change=<K extends keyof AtlasFilters>(key:K,value:AtlasFilters[K])=>setFilters(prev=>({...prev,[key]:value,page:1}));
  const result=useMemo(()=>queryAtlas(dataset,filters),[dataset,filters]);
  const counts=useMemo(()=>recordsByCity(dataset.records),[dataset.records]);
  const byId=useMemo(()=>new Map(dataset.records.map(r=>[r.id,r])),[dataset.records]);
  const cities=useMemo(()=>[...counts.keys()].sort((a,b)=>a.localeCompare(b,"tr")),[counts]);
  const institutions=useMemo(()=>[...new Set(dataset.records.map(r=>r.institution))].sort((a,b)=>a.localeCompare(b,"tr")),[dataset.records]);
  const categories=useMemo(()=>[...new Set(dataset.records.flatMap(r=>r.categories))].sort((a,b)=>a.localeCompare(b,"tr")),[dataset.records]);
  const people=useMemo(()=>[...new Set(dataset.records.flatMap(r=>r.people))].sort((a,b)=>a.localeCompare(b,"tr")),[dataset.records]);
  const comparison=useMemo(()=>cityComparison(dataset.records,compareFirst,compareSecond),[dataset.records,compareFirst,compareSecond]);
  const graphSource=byId.get(graphRecord) ?? result.all.find(r=>r.relatedIds.length>0) ?? null;
  const graphTargets=graphSource?.relatedIds.map(id=>byId.get(id)).filter((r):r is AtlasRecord=>Boolean(r)).slice(0,12)??[];
  const maxComparison=Math.max(1,comparison.first.total,comparison.second.total);
  const year=(v:string)=>/^\d{4}$/.test(v) && +v>=1000 && +v<=2100?+v:null;
  return <div className={styles.explorer} data-testid="atlas-explorer">
    <header className={styles.hero}>
      <div className={styles.heroEyebrow}>MKA / ETKİLEŞİMLİ TARİH ATLASI / 02</div>
      <h1>Coğrafyanın <em>hafızası.</em><br/>Zamanın izleri.</h1>
      <p>Tarihî arşivi şehir, dönem, kişi ve kurumsal kaynak ilişkileriyle keşfedin. Buradaki bağlantılar yalnızca katalog alanları ile belgelenmiş ilişkilerden üretilir.</p>
      <div className={styles.heroStats}><span><strong>{dataset.records.length}</strong> yayıma açık kayıt</span><span><strong>{counts.size}</strong> kayıtlı şehir</span><span><strong>{institutions.length}</strong> kaynak kurumu</span></div>
      <p className={styles.heroNote}>Bu sayılar mevcut arşiv katalog kapsamını ifade eder; tarihî önem veya uzman doğrulaması ölçütü değildir.</p>
    </header>
    {warnings.length>0?<div role="status" className={styles.notice}>{warnings.map((w,i)=><p key={i}>{w}</p>)}</div>:null}
    <div className={styles.contentGrid}>
      <aside className={styles.filtersSidebar} aria-label="Atlas süzgeçleri">
        <button type="button" className={styles.mobileFiltersToggle} aria-expanded={filtersOpen} aria-controls="atlas-filter-controls" onClick={()=>setFiltersOpen(!filtersOpen)}>Filtreler {filtersOpen?"▲":"▼"}</button>
        <div id="atlas-filter-controls" className={`${styles.filterInner} ${filtersOpen?styles.filterOpen:""}`}>
          <div className={styles.filterHeading}><h2>Keşif filtreleri</h2><button type="button" onClick={()=>setFilters(DEFAULT_FILTERS)}>Temizle</button></div>
          <label>Arama<input aria-label="Atlas araması" type="search" value={filters.search} onChange={e=>change("search",e.target.value)} placeholder="Başlık, kişi, kurum…" maxLength={120}/></label>
          <label>Şehir<select aria-label="Şehir filtresi" value={filters.city} onChange={e=>change("city",e.target.value)}><option value="">Tüm şehirler</option><Options values={cities}/></select></label>
          <label>Bölge<select value={filters.region} onChange={e=>change("region",e.target.value as AtlasFilters["region"])}><option value="all">Tüm bölgeler</option><option value="turkiye">Türkiye</option><option value="international">Türkiye dışı</option></select></label>
          <label>Arşiv türü<select aria-label="Kayıt türü" value={filters.type} onChange={e=>change("type",e.target.value as AtlasFilters["type"])}><option value="all">Tüm türler</option>{TYPES.map(t=><option value={t} key={t}>{TYPE_LABELS[t]}</option>)}</select></label>
          <label>Kaynak kurumu<select value={filters.institution} onChange={e=>change("institution",e.target.value)}><option value="">Tüm kaynaklar</option><Options values={institutions}/></select></label>
          <label>İlgili kişi<select value={filters.person} onChange={e=>change("person",e.target.value)}><option value="">Tüm kişiler</option><Options values={people}/></select></label>
          <label>Kategori<select value={filters.category} onChange={e=>change("category",e.target.value)}><option value="">Tüm kategoriler</option><Options values={categories}/></select></label>
          <fieldset className={styles.yearFields}><legend>Arşivde kayıtlı tarih aralığı</legend><label>Başlangıç<input type="number" min="1000" max="2100" placeholder="1919" value={filters.from??""} onChange={e=>change("from",year(e.target.value))}/></label><label>Bitiş<input type="number" min="1000" max="2100" placeholder="1938" value={filters.to??""} onChange={e=>change("to",year(e.target.value))}/></label></fieldset>
          <label>Tarih bağlamı<select aria-label="Tarih bağlamı" value={filters.dateKind} onChange={e=>change("dateKind",e.target.value as AtlasFilters["dateKind"])}><option value="all">Tüm tarih türleri</option>{dateKinds.map(k=><option key={k} value={k}>{DATE_LABELS[k]}</option>)}</select></label>
          <label>Tarih kesinliği<select value={filters.certainty} onChange={e=>change("certainty",e.target.value as AtlasFilters["certainty"])}><option value="all">Tüm kesinlik düzeyleri</option><option value="exact">Kesin</option><option value="estimated">Tahmini</option><option value="unknown">Belirsiz</option></select></label>
          <label>Konum alanı<select value={filters.location} onChange={e=>change("location",e.target.value as AtlasFilters["location"])}><option value="all">Tüm kayıtlar</option><option value="city">Şehir bilgisi bulunan</option><option value="unknown">Şehir bilgisi bulunmayan</option></select></label>
          <p className={styles.microText}>Kesin enlem/boylam bulunmadığından harita noktası filtresi kullanılmaz. Yalnızca katalogda açık şehir alanı gösterilir.</p>
          <p className={styles.microText}>Görünürlük: yalnızca <strong>published</strong> kayıtları. Bu teknik katalog durumudur.</p>
        </div>
      </aside>
      <div className={styles.mainColumn}>
        <section className={styles.panel} aria-labelledby="map-title">
          <div className={styles.sectionHeader}><div><p className={styles.kicker}>MEKÂNSAL GÖRÜNÜM</p><h2 id="map-title">Türkiye atlası</h2></div><div className={styles.segment} role="group" aria-label="Atlas görünümü"><button type="button" aria-pressed={mode==="map"} onClick={()=>setMode("map")}>Harita</button><button type="button" aria-pressed={mode==="list"} onClick={()=>setMode("list")}>Liste</button></div></div>
          {mode==="map"?<AtlasMap records={dataset.records} active={filters.city} onSelect={city=>change("city",filters.city===city?"":city)}/>:<p className={styles.notice}>Tüm kayıtlı şehirler aşağıdaki erişilebilir listeden seçilebilir.</p>}
          <h3 className={styles.subTitle}>Şehir listesi — haritanın erişilebilir alternatifi</h3>
          <div className={styles.cityGrid}>{FEATURED_CITIES.map(city=><button key={city} type="button" aria-pressed={foldTurkish(city)===foldTurkish(filters.city)} onClick={()=>change("city",filters.city===city?"":city)}><span>{city}</span><strong>{counts.get(city)??0}</strong></button>)}</div>
          <div className={styles.secondaryCities}><label>Diğer kayıtlı şehirler<select value={FEATURED_CITIES.includes(filters.city as typeof FEATURED_CITIES[number])?"":filters.city} onChange={e=>change("city",e.target.value)}><option value="">Şehir seçin</option>{cities.filter(c=>!FEATURED_CITIES.some(f=>foldTurkish(f)===foldTurkish(c))).map(c=><option value={c} key={c}>{c} ({counts.get(c)})</option>)}</select></label></div>
        </section>
        <section className={styles.panel} aria-labelledby="international-title"><div className={styles.sectionHeader}><div><p className={styles.kicker}>SINIRLAR ÖTESİ</p><h2 id="international-title">Uluslararası mekân keşfi</h2></div></div><p className={styles.microText}>Bu şehirler hazır keşif girişleridir; kayıt ilişkilendirmesi yalnızca arşivin açık konum alanından yapılır.</p><div className={styles.cityGrid}>{INTERNATIONAL_CITIES.map(city=><button key={city} type="button" aria-pressed={filters.city===city} onClick={()=>setFilters(prev=>({...prev,city:prev.city===city?"":city,region:prev.city===city?"all":"international",page:1}))}><span>{city}</span><strong>{counts.get(city)??0}</strong></button>)}</div></section>
        <section className={styles.panel} aria-labelledby="results-title">
          <div className={styles.sectionHeader}><div><p className={styles.kicker}>KAYNAĞA DAYALI KEŞİF</p><h2 id="results-title">Katalog kayıtları</h2></div><span className={styles.resultCount} role="status" aria-live="polite">{result.total} kayıt bulundu</span></div>
          <AtlasTimeline records={result.all} onChooseYear={year=>setFilters(p=>({...p,from:year,to:year,page:1}))}/>
          {filters.from!==null&&filters.to!==null&&filters.from>filters.to?<div role="status" className={styles.notice}>Başlangıç yılı bitiş yılından büyük. Lütfen tarih aralığını düzeltin.</div>:null}
          {result.items.length?<div className={styles.recordGrid}>{result.items.map(record=><RecordCard key={record.id} record={record} byId={byId}/>)}</div>:<div className={styles.empty} role="status"><h3>Bu seçim için yayıma açık katalog kaydı bulunmadı</h3><p>Kaynakları uydurmuyoruz. Başka bir şehir veya tarih aralığı seçebilirsiniz.</p><button type="button" onClick={()=>setFilters(DEFAULT_FILTERS)}>Tüm filtreleri temizle</button></div>}
          {result.pageCount>1?<nav className={styles.pagination} aria-label="Atlas sonuç sayfaları"><button type="button" disabled={result.page<=1} onClick={()=>setFilters(p=>({...p,page:p.page-1}))}>← Önceki</button><span>Sayfa {result.page} / {result.pageCount}</span><button type="button" disabled={result.page>=result.pageCount} onClick={()=>setFilters(p=>({...p,page:p.page+1}))}>Sonraki →</button></nav>:null}
        </section>
        <section className={styles.panel} aria-labelledby="graph-title"><div className={styles.sectionHeader}><div><p className={styles.kicker}>KAYIT AĞI</p><h2 id="graph-title">Belgelenmiş ilişkiler</h2></div></div>
          <p className={styles.microText}>Kişi, kurum ve şehir etiketleri kayıt alanlarından; kayıtlar arası oklar yalnız açık <code>relatedIds</code> bağlantılarından gelir. Şehir veya tarih benzerliği ilişki kanıtı sayılmaz.</p>
          <label className={styles.graphSelect}>Başlangıç kaydı<select value={graphSource?.id??""} onChange={e=>setGraphRecord(e.target.value)}><option value="">İlişkili ilk kayıt</option>{dataset.records.filter(r=>r.relatedIds.length>0).slice(0,250).map(r=><option value={r.id} key={r.id}>{r.title}</option>)}</select></label>
          {graphSource?<div className={styles.relationView}><div className={styles.relationHub}><Link href={`/arsiv/${graphSource.slug}`}>{graphSource.title}</Link><dl className={styles.relationMetadata}><dt>Kayıtlı şehir</dt><dd>{graphSource.locations.map(l=>l.city).join(", ")||"Belirtilmemiş"}</dd><dt>Kayıttaki kişiler</dt><dd>{graphSource.people.slice(0,5).join(", ")||"Belirtilmemiş"}</dd><dt>Kaynak kurumu</dt><dd>{graphSource.institution}</dd></dl></div>{graphTargets.length?<ul className={styles.relationTargets}>{graphTargets.map(r=><li key={r.id}><span>Katalogda belirtilen ilişki ↗</span><Link href={`/arsiv/${r.slug}`}>{r.title}</Link></li>)}</ul>:<p>Bu kaydın bağlantısı mevcut yayıma açık arşivde bulunmuyor.</p>}</div>:<p>Henüz yayımlanabilir açık ilişkili kayıt bulunmuyor.</p>}
        </section>
        <section className={styles.panel} aria-labelledby="compare-title"><div className={styles.sectionHeader}><div><p className={styles.kicker}>KAPSAM ANALİZİ</p><h2 id="compare-title">Şehirleri karşılaştır</h2></div><button type="button" aria-expanded={compareMode} onClick={()=>setCompareMode(v=>!v)}>{compareMode?"Karşılaştırmayı kapat":"Karşılaştır"}</button></div>
          {compareMode?<><div className={styles.compareControls}><label>Birinci şehir<select aria-label="Birinci karşılaştırma şehri" value={compareFirst} onChange={e=>setCompareFirst(e.target.value)}><Options values={[...new Set([...FEATURED_CITIES,...cities])]}/></select></label><label>İkinci şehir<select aria-label="İkinci karşılaştırma şehri" value={compareSecond} onChange={e=>setCompareSecond(e.target.value)}><Options values={[...new Set([...FEATURED_CITIES,...cities])]}/></select></label></div>
          <div className={styles.tableScroll}><table className={styles.compareTable}><caption>Kaynaklı arşiv kapsamı karşılaştırması; tarihî önem sıralaması değildir.</caption><thead><tr><th scope="col">Ölçüt</th><th scope="col">{compareFirst}</th><th scope="col">{compareSecond}</th></tr></thead><tbody><CountRow label="Toplam kayıt" a={comparison.first.total} b={comparison.second.total} max={maxComparison}/>{TYPES.map(t=><CountRow key={t} label={TYPE_LABELS[t]} a={comparison.first.types[t]??0} b={comparison.second.types[t]??0} max={maxComparison}/>)}{[...new Set([...Object.keys(comparison.first.sources),...Object.keys(comparison.second.sources)])].slice(0,20).map(s=><CountRow key={s} label={s} a={comparison.first.sources[s]??0} b={comparison.second.sources[s]??0} max={maxComparison}/>)}</tbody></table></div><p className={styles.microText}>Tarihi dağılımları: {compareFirst}: {Object.entries(comparison.first.years).sort().slice(0,15).map(([y,n])=>`${y}: ${n}`).join("; ")||"kayıt yok"}. {compareSecond}: {Object.entries(comparison.second.years).sort().slice(0,15).map(([y,n])=>`${y}: ${n}`).join("; ")||"kayıt yok"}.</p></>:<p className={styles.microText}>İki şehirdeki arşiv kayıtlarını, belge türlerini ve kaynak kurumu dağılımını yan yana inceleyin.</p>}</section>
        <footer className={styles.atlasFooter}><Link href="/arsiv">Dijital arşiv →</Link><Link href="/kronoloji">Kronoloji →</Link><Link href="/ataturk">Atatürk yaşam deneyimi →</Link><span>Bu üç bağlantı mevcut V0.6 rotalarına yönelir.</span></footer>
      </div>
    </div>
  </div>;
}
