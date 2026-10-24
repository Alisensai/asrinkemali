import styles from "@/app/donemler/donemler.module.css";

/** Kaydı olmayan dönemler için dürüst boş durum — içerik uydurulmaz. */
export function PeriodEmptyState({ title }: { title: string }) {
  return (
    <div className={styles.emptyState} role="status">
      <h2>{title} için arşivde yayımlanmış kayıt bulunmuyor.</h2>
      <p>
        Bu dönemde yalnızca taslak veya inceleme aşamasındaki kayıtlar varsa ya da hiç kayıt
        girilmediyse burada içerik gösterilmez. Yayıma alınan kayıtlar eklendiğinde bu sayfa
        otomatik olarak güncellenir.
      </p>
    </div>
  );
}
