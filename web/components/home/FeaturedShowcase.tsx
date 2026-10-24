import Link from "next/link";
import type { ArchiveRecord, ArchiveRecordType } from "../../../schemas/archive-record.types";
import { Icon, type IconName } from "../Icon";
import styles from "./home-v06.module.css";

const TYPE_CONFIG: Record<ArchiveRecordType, { label: string; icon: IconName }> = {
  document: { label: "Belge", icon: "document" },
  photograph: { label: "Fotoğraf", icon: "image" },
  speech: { label: "Konuşma", icon: "speech" },
  publication: { label: "Yayın", icon: "book" },
  place: { label: "Mekân", icon: "map" },
  event: { label: "Olay", icon: "calendar" },
};

export function FeaturedShowcase({ records }: { records: readonly ArchiveRecord[] }) {
  if (!records || records.length === 0) return null;

  return (
    <section className={`container ${styles.sectionWrapper}`} aria-labelledby="showcase-heading">
      <div className={styles.sectionHeader}>
        <div className={styles.headerTextGroup}>
          <span className={styles.eyebrow}>
            <Icon name="museum" size={14} />
            DİJİTAL SERGİ VİTRİNİ
          </span>
          <h2 id="showcase-heading" className={styles.sectionTitle}>
            ÖNE ÇIKAN ARŞİV KAYITLARI
          </h2>
          <p className={styles.sectionSubtitle}>
            Kurumsal kaynak ve provenans denetiminden geçen kayıtlar. İnsan tarih uzmanının incelemesi ayrıca gereklidir.
          </p>
        </div>
        <Link href="/arsiv" className={styles.headerActionLink}>
          Tüm Kataloğu İncele <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className={styles.showcaseGrid}>
        {records.map((record) => {
          const config = TYPE_CONFIG[record.type] ?? { label: "Kayıt", icon: "document" };
          const identifier = record.source.archiveIdentifier
            ? `#${record.source.archiveIdentifier}`
            : `#${record.id.slice(0, 8)}`;

          return (
            <Link
              key={record.id}
              href={`/arsiv/${record.slug}`}
              className={styles.plaqueCard}
              aria-label={`${record.title} - ${config.label} kaydı detayı`}
            >
              <div className={styles.plaqueHeader}>
                <span className={styles.typeBadge}>
                  <Icon name={config.icon} size={12} />
                  {config.label}
                </span>
                <span className={styles.callNumber} title="Arşiv Çağrı / Envanter No">
                  {identifier}
                </span>
              </div>

              <h3 className={styles.plaqueTitle}>{record.title}</h3>

              <div className={styles.plaqueMeta}>
                <span className={styles.metaItem}>
                  <Icon name="calendar" size={13} />
                  <time>{record.date.display}</time>
                </span>
                <span className={styles.metaItem}>
                  <Icon name="document" size={13} />
                  Kaynak Denetimli
                </span>
              </div>

              {record.quotation?.text ? (
                <blockquote className={styles.quoteBlock}>
                  &ldquo;{record.quotation.text}&rdquo;
                  <span className={styles.quoteSpeaker}>
                    — {record.quotation.speaker}, {record.quotation.work}
                  </span>
                </blockquote>
              ) : (
                <p className={styles.plaqueSummary}>{record.summary}</p>
              )}

              <div className={styles.plaqueFooter}>
                <span className={styles.institutionTag} title={record.source.institution}>
                  {record.source.institution}
                </span>
                <span className={styles.detailLink}>
                  Kayıt Detayı <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
