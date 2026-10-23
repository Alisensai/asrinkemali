"use client";

import { useState } from "react";
import { Icon } from "./Icon";

export function UtilityBar({ onSearch }: { onSearch: () => void }) {
  const [highContrast, setHighContrast] = useState(false);
  const [dateLabel] = useState(() => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: "Europe/Istanbul" }).format(new Date()));

  function toggleContrast() {
    setHighContrast((current) => {
      document.body.classList.toggle("high-contrast", !current);
      return !current;
    });
  }

  return <aside className="utility-bar" aria-label="Site araçları"><div className="container utility-inner"><div className="utility-date"><Icon name="calendar" size={14} /><time suppressHydrationWarning>{dateLabel}</time></div><p className="utility-quote">Bağımsız tarih ve kültür platformu • Kaynak denetimli içerik</p><div className="utility-right"><button className="plain-icon a11y-btn" type="button" aria-label="Erişilebilirlik: yüksek kontrast modunu aç veya kapat" aria-pressed={highContrast} onClick={toggleContrast}><Icon name="contrast" size={14} /><span>Erişilebilirlik</span></button><span className="utility-divider" aria-hidden="true" /><span className="lang-item active" aria-label="TR — etkin dil Türkçe">TR</span><span className="utility-divider" aria-hidden="true" /><button className="plain-icon icon-only-btn" type="button" aria-label="Sitede ara" onClick={onSearch}><Icon name="search" size={14} /></button></div></div></aside>;
}
