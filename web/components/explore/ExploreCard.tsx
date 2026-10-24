import Link from "next/link";
import type {
  ExploreRecommendation,
  ExploreRecordDTO,
} from "../../lib/explore-ui/types";
import styles from "../../app/kesfet/kesfet.module.css";

interface ExploreCardProps {
  record: ExploreRecordDTO;
  recommendation?: ExploreRecommendation;
  matchedFields?: string[];
}

export function ExploreCard({
  record,
  recommendation,
  matchedFields,
}: ExploreCardProps) {
  const isRecommended = Boolean(recommendation);

  return (
    <article
      className={`${styles.card} ${isRecommended ? styles.cardRecommended : ""}`}
      aria-labelledby={`card-title-${record.id}`}
    >
      {/* Kart Üst Bilgisi: Tür ve Tarih */}
      <div className={styles.cardHeader}>
        <span className={styles.typeBadge}>{record.typeLabel}</span>
        <time className={styles.dateBadge} dateTime={record.date.start || undefined}>
          {record.date.display || "Tarih Belirtilmemiş"}
        </time>
      </div>

      {/* Kart Başlığı */}
      <h3 id={`card-title-${record.id}`} className={styles.cardTitle}>
        <Link href={`/arsiv/${record.slug}`} className={styles.titleLink}>
          {record.title}
        </Link>
      </h3>

      {/* Kurum ve Provenans Bilgisi */}
      <div className={styles.cardSource}>
        <span className={styles.sourceInstitution}>
          🏛️ {record.source.institution}
        </span>
        {record.source.citation ? (
          <span className={styles.sourceCitation}>{record.source.citation}</span>
        ) : null}
      </div>

      {/* Özet Metin */}
      <p className={styles.cardSummary}>{record.summary}</p>

      {/* Etiket ve Kategori Çipleri */}
      {record.categories && record.categories.length > 0 ? (
        <div className={styles.cardTags} aria-label="Tematik kategoriler">
          {record.categories.slice(0, 3).map((cat) => (
            <Link
              key={cat}
              href={`/kesfet?kategori=${encodeURIComponent(cat)}`}
              className={styles.cardTag}
            >
              #{cat}
            </Link>
          ))}
        </div>
      ) : null}

      {/* AÇIKLANABİLİRLİK PANELİ (Neden Önerildi?) */}
      {recommendation ? (
        <section
          className={styles.explainabilityPanel}
          aria-label="Öneri gerekçesi ve tarihsel bağlantı"
        >
          <div className={styles.explainabilityHeader}>
            <span className={styles.explainBadge}>
              🎯 {recommendation.primaryReason}
            </span>
            <span className={styles.scoreBadge} title="Katalog bağıntı katsayısı">
              %{recommendation.score} Tarihsel Alaka
            </span>
          </div>

          <div className={styles.reasonChips}>
            {recommendation.reasons.map((r, idx) => (
              <span key={idx} className={styles.reasonChip} title={r.detail}>
                {r.label}
              </span>
            ))}
          </div>

          <p className={styles.explainText}>{recommendation.explanation}</p>
        </section>
      ) : matchedFields && matchedFields.length > 0 ? (
        <div className={styles.matchFieldsNotice}>
          <span className={styles.matchFieldsLabel}>Arama eşleşmesi:</span>{" "}
          {matchedFields.join(", ")}
        </div>
      ) : null}

      {/* Kart Alt Bilgisi ve Eylemler */}
      <div className={styles.cardFooter}>
        <div className={styles.verificationBadge} role="status">
          <span className={styles.verificationIcon} aria-hidden="true">
            🛡️
          </span>
          <span>{record.verification.label}</span>
        </div>

        <div className={styles.cardActions}>
          <Link
            href={`/kesfet?kayit=${record.slug}`}
            className={styles.exploreRelatedButton}
            title={`${record.title} ile ilişkili belgeleri keşfet`}
            aria-label={`${record.title} ile ilişkili belgeleri keşfet`}
          >
            İlişkili Kayıtlar
          </Link>
          <Link
            href={`/arsiv/${record.slug}`}
            className={styles.detailButton}
            aria-label={`${record.title} arşiv detayını incele`}
          >
            İncele →
          </Link>
        </div>
      </div>
    </article>
  );
}
