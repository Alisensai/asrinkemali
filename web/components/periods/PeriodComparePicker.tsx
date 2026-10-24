"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/donemler/donemler.module.css";

export function PeriodComparePicker({ periods, initial }: { periods: { id: string; title: string }[]; initial: string[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<string[]>(initial.slice(0, 2));

  function toggle(id: string) {
    setSelection((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current, id].slice(-2);
    });
  }

  function apply() {
    if (selection.length === 2) router.push(`/donemler?karsilastir=${selection.join(",")}`);
  }

  return (
    <div className={styles.comparePicker}>
      <fieldset>
        <legend>İki dönem seçin (karşılaştırma nesnel kayıt özelliklerini gösterir)</legend>
        {periods.map((period) => (
          <label key={period.id} className={styles.compareOption}>
            <input
              type="checkbox"
              checked={selection.includes(period.id)}
              onChange={() => toggle(period.id)}
            />
            {period.title}
          </label>
        ))}
      </fieldset>
      <button type="button" className={styles.primaryAction} disabled={selection.length !== 2} onClick={apply}>
        Dönemleri karşılaştır
      </button>
      {selection.length !== 2 ? <p className={styles.hint} role="status">Karşılaştırma için 2 dönem seçilmelidir.</p> : null}
    </div>
  );
}
