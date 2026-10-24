import type { ComparisonResult } from "@/lib/document-comparison/model";
import styles from "./comparison.module.css";

interface Props {
  result: ComparisonResult;
}

export function CommonElements({ result }: Props) {
  const { commonPeople, commonLocations, commonCategories, dateOverlap } = result;

  const overlapConfig = {
    overlap: {
      label: "Tarihler Çakışıyor",
      className: styles.overlapPositive,
      desc: "İki belgenin katalogdaki tarih aralıkları aynı zaman diliminde kesişmektedir.",
    },
    no_overlap: {
      label: "Tarihler Farklı Dönemlerde",
      className: styles.overlapNegative,
      desc: "İki belgenin tarih sınırları birbiriyle çakışmamaktadır.",
    },
    uncertain: {
      label: "Tarih Kesişimi Belirsiz",
      className: styles.overlapUncertain,
      desc: "Kayıtlardan en az birinin kesin takvim tarihi bilinmediğinden çakışma kesinleştirilemedi.",
    },
  }[dateOverlap];

  return (
    <section className={styles.commonGrid} aria-label="Ortak Tarihsel Unsurlar">
      {/* Date Overlap Card */}
      <div className={styles.commonCard}>
        <h4>Tarihsel Zaman Çakışması</h4>
        <div>
          <span className={`${styles.overlapBadge} ${overlapConfig.className}`}>
            {overlapConfig.label}
          </span>
        </div>
        <p style={{ fontSize: "11px", color: "var(--comp-muted)", margin: 0 }}>
          {overlapConfig.desc}
        </p>
      </div>

      {/* Common People */}
      <div className={styles.commonCard}>
        <h4>Ortak Kişiler ({commonPeople.length})</h4>
        {commonPeople.length > 0 ? (
          <div className={styles.commonTags}>
            {commonPeople.map((person) => (
              <span key={person} className={styles.commonTag}>
                {person}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "11px", color: "var(--comp-muted)", margin: 0 }}>
            Her iki kayıtta ortak geçen kişi kaydı bulunmuyor.
          </p>
        )}
      </div>

      {/* Common Locations */}
      <div className={styles.commonCard}>
        <h4>Ortak Şehirler / Mekânlar ({commonLocations.length})</h4>
        {commonLocations.length > 0 ? (
          <div className={styles.commonTags}>
            {commonLocations.map((loc) => (
              <span key={loc} className={styles.commonTag}>
                {loc}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "11px", color: "var(--comp-muted)", margin: 0 }}>
            Her iki kayıtta ortak geçen şehir kaydı bulunmuyor.
          </p>
        )}
      </div>

      {/* Common Categories */}
      <div className={styles.commonCard}>
        <h4>Ortak Kategoriler ({commonCategories.length})</h4>
        {commonCategories.length > 0 ? (
          <div className={styles.commonTags}>
            {commonCategories.map((cat) => (
              <span key={cat} className={styles.commonTag}>
                {cat}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "11px", color: "var(--comp-muted)", margin: 0 }}>
            Ortak katalog kategorisi eşleşmedi.
          </p>
        )}
      </div>
    </section>
  );
}
