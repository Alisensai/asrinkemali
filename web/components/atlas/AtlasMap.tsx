"use client";

import type { AtlasRecord } from "@/lib/atlas/model";
import { FEATURED_CITIES, foldTurkish, recordsByCity } from "@/lib/atlas/model";
import styles from "./atlas.module.css";

/** Schematic, not geodetic. City markers DO NOT indicate historic events or verified place coordinates. */
const CITY_POSITIONS: Record<string, [number, number]> = {
  "Çanakkale":[14,42],"İstanbul":[25,27],"İzmir":[14,62],"Ankara":[47,49],"Samsun":[57,29],"Sivas":[69,48],"Erzurum":[84,43]
};

type Props = { records: readonly AtlasRecord[]; active: string; onSelect: (city: string) => void };
export function AtlasMap({records,active,onSelect}: Props) {
  const counts=recordsByCity(records);
  return <div className={styles.mapFrame}>
    <div className={styles.mapCanvas} role="group" aria-label="Türkiye şehir keşfi — şematik harita">
      <svg className={styles.turkeyShape} viewBox="0 0 960 430" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Türkiye'nin stilize edilmiş, coğrafi ölçekte olmayan şematik silueti">
        <defs><linearGradient id="mkaAtlasGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6a1b22"/><stop offset="1" stopColor="#1b090b"/></linearGradient></defs>
        <path d="M71 220 L88 170 142 138 186 153 216 118 264 117 294 148 335 141 370 119 405 132 433 108 477 115 513 101 549 117 591 107 626 127 671 118 699 143 742 145 763 168 813 162 845 191 901 211 884 245 855 273 822 263 799 289 756 277 716 301 680 279 638 299 603 288 571 312 537 294 499 303 471 278 432 295 398 281 369 292 335 280 307 307 274 295 250 318 221 299 191 298 172 262 146 271 124 246 95 252 Z" fill="url(#mkaAtlasGradient)" stroke="#c6a477" strokeWidth="3" strokeLinejoin="round" />
        <path d="M71 220 L88 170 142 138 186 153 216 118" fill="none" stroke="#e6c28c" strokeOpacity=".4" strokeWidth="1" />
        <path d="M210 349 Q420 328 657 339" fill="none" stroke="#c6a477" strokeOpacity=".25" strokeDasharray="3 9" />
      </svg>
      {FEATURED_CITIES.map(city=><button
        type="button" key={city} className={`${styles.mapPin} ${foldTurkish(active)===foldTurkish(city)?styles.mapPinActive:""}`}
        style={{left:`${CITY_POSITIONS[city][0]}%`,top:`${CITY_POSITIONS[city][1]}%`}}
        onClick={()=>onSelect(city)} aria-pressed={foldTurkish(active)===foldTurkish(city)}
        aria-label={`${city}, ${counts.get(city)??0} kaynaklı arşiv kaydı. Bu işaret şehir düzeyindedir.`}
      ><span className={styles.pinDot} aria-hidden="true"/><span className={styles.pinLabel}>{city}<small>{counts.get(city)??0}</small></span></button>)}
    </div>
    <p className={styles.mapDisclaimer}>Harita şehir seçimi için <strong>şematiktir</strong>. İşaretler kesin tarihî olay veya yapı koordinatı değildir. Katalogda doğrulanmış enlem-boylam alanı bulunmuyor.</p>
  </div>;
}
