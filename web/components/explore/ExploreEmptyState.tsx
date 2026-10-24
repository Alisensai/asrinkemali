import Link from "next/link";
import styles from "../../app/kesfet/kesfet.module.css";

interface ExploreEmptyStateProps {
  query?: string;
  hasFilters?: boolean;
}

export function ExploreEmptyState({
  query,
  hasFilters,
}: ExploreEmptyStateProps) {
  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.emptyIcon} aria-hidden="true">
        📜
      </div>
      <h2 className={styles.emptyTitle}>Eşleşen Kaynak Bulunamadı</h2>
      <p className={styles.emptyDescription}>
        {query ? (
          <>
            &quot;<strong>{query}</strong>&quot; araması ve uygulanan filtreler için
            herhangi bir arşiv kaydı eşleşmedi.
          </>
        ) : (
          "Seçilen filtre kombinasyonuna uygun arşiv kaydı bulunmamaktadır."
        )}
      </p>

      <div className={styles.emptySuggestions}>
        <strong>Arama Önerileri:</strong>
        <ul>
          <li>Yazım kurallarını ve Türkçe karakterleri kontrol edin.</li>
          <li>
            Daha geniş kavramlar deneyin: <em>TBMM</em>, <em>Cumhuriyet</em>,{" "}
            <em>Lozan</em>, <em>Eğitim</em>, <em>Ankara</em>.
          </li>
          <li>Kayıt türü veya tarihsel dönem filtrelerini genişletin.</li>
        </ul>
      </div>

      {hasFilters ? (
        <div className={styles.emptyActions}>
          <Link href="/kesfet" className={styles.emptyResetButton}>
            Filtreleri Sıfırla ve Tüm Kataloğu Gör
          </Link>
        </div>
      ) : null}
    </div>
  );
}
