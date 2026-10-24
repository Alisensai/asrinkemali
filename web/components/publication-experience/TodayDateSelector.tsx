import React from "react";
import Link from "next/link";
import styles from "@/app/publishing.module.css";

export interface TodayDateSelectorProps {
  month: number;
  day: number;
  isInvalidDate?: boolean;
}

export function TodayDateSelector({ month, day, isInvalidDate }: TodayDateSelectorProps) {
  return (
    <div className={styles.todaySelectorContainer}>
      <p className={styles.notice}>
        Bu bölüm yalnızca gün hassasiyetli, kaynak bağlantılı ve yayın kapısından geçmiş
        arşiv olaylarını listeler. Otomatik olarak makale yayımlamaz.
      </p>

      <form
        action="/tarihte-bugun"
        method="get"
        className={styles.filters}
        aria-label="Tarihte Bugün tarih seçimi"
      >
        <label>
          Ay
          <input
            name="ay"
            type="number"
            min={1}
            max={12}
            defaultValue={month}
            aria-label="Ay seçimi (1-12)"
          />
        </label>

        <label>
          Gün
          <input
            name="gun"
            type="number"
            min={1}
            max={31}
            defaultValue={day}
            aria-label="Gün seçimi (1-31)"
          />
        </label>

        <div className={styles.actions}>
          <button type="submit">Günü göster</button>
          <Link href="/tarihte-bugun">Bugüne dön</Link>
        </div>
      </form>

      {isInvalidDate && (
        <p className={styles.warning} role="alert">
          Geçersiz tarih girdisi yok sayıldı; bugünün tarihi gösteriliyor.
        </p>
      )}
    </div>
  );
}
