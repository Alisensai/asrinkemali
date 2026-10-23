import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ContentPage";
import { Icon } from "@/components/Icon";
import { getPublishedArchiveRecord, getPublishedArchiveRecords, reviewLabel, typeLabel } from "@/lib/archive";
import styles from "../../content-platform.module.css";

export function generateStaticParams() {
  return getPublishedArchiveRecords().map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const record = getPublishedArchiveRecord(slug);
  if (!record) return { title: "Kayıt bulunamadı", robots: { index: false, follow: false } };
  return {
    title: record.title,
    description: record.summary,
    alternates: { canonical: `/arsiv/${record.slug}` },
    robots: { index: false, follow: true },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      title: record.title,
      description: record.summary,
      url: `/arsiv/${record.slug}`,
    },
  };
}

export default async function ArchiveDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = getPublishedArchiveRecord(slug);
  if (!record) notFound();

  return (
    <ContentPage eyebrow={typeLabel(record.type).toLocaleUpperCase("tr-TR")} title={record.title}>
      <article className={styles.detail}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <Link href="/arsiv" className={styles.detailBack}>
            <Icon name="arrow-left" size={14} /> Dijital Arşive Dön
          </Link>
          <span className={styles.reviewBadge}>
            <Icon name="check" size={12} /> {reviewLabel(record.verification.status)}
          </span>
        </div>

        <div className={styles.detailLayout}>
          <div className={styles.detailMain}>
            {record.image?.url && record.image.displayPolicy === "embedded_allowed" ? (
              <figure className={styles.detailMediaFrame}>
                <div className={styles.detailMediaContainer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={record.image.url}
                    alt={record.image.alt || record.title}
                    className={styles.detailMediaImage}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className={styles.detailMediaCaption}>
                  <span>{record.image.credit}</span>
                  <span className={styles.detailMediaBadge}>
                    {record.image.kind === "ai_representative" ? "Temsili Görsel" : "Orijinal Arşiv Belgesi"}
                  </span>
                </figcaption>
              </figure>
            ) : null}

            {record.quotation ? (
              <aside className={styles.detailQuoteCallout} aria-label="Mustafa Kemal Atatürk Alıntısı">
                <div className={styles.detailQuoteIcon}>
                  <Icon name="quote" size={44} />
                </div>
                <blockquote className={styles.detailQuoteText}>
                  “{record.quotation.text}”
                </blockquote>
                <div className={styles.detailQuoteMeta}>
                  <span className={styles.detailQuoteSpeaker}>{record.quotation.speaker}</span>
                  <span className={styles.detailQuoteContext}>
                    {record.quotation.work ? `${record.quotation.work} — ` : ""}{record.quotation.context} ({record.quotation.date})
                  </span>
                </div>
              </aside>
            ) : null}

            <div className={styles.detailDescription}>
              <p>{record.description ?? record.summary}</p>
            </div>

            {record.tags?.length ? (
              <ul className={styles.tagList} aria-label="Kayıt etiketleri">
                {record.tags.map((tag) => (
                  <li key={tag} className={styles.tagPill}>#{tag}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <aside className={styles.detailSidebar} aria-label="Arşiv künyesi ve kaynak detayları">
            <div className={styles.dossierCard}>
              <div className={styles.dossierHeader}>
                <h3>Katalog Künyesi</h3>
                <span className={styles.cardTypeBadge}>{typeLabel(record.type)}</span>
              </div>

              <dl className={styles.details}>
                <dt>Kayıt numarası</dt>
                <dd>{record.id}</dd>
                <dt>Tarih</dt>
                <dd>{record.date.display}{record.date.certainty === "estimated" ? " (tahmini)" : ""}</dd>
                <dt>Tür</dt>
                <dd>{typeLabel(record.type)}</dd>
                {record.locations.length ? (
                  <>
                    <dt>Yer</dt>
                    <dd>{record.locations.map((loc) => loc.city ?? loc.name).join(", ")}</dd>
                  </>
                ) : null}
                <dt>Kaynak kurum</dt>
                <dd>{record.source.institution}</dd>
                <dt>Kaynak künyesi</dt>
                <dd>{record.source.citation ?? record.source.title}</dd>
                <dt>Orijinal kaynak</dt>
                <dd>
                  <a className={styles.externalLink} href={record.source.url} target="_blank" rel="noopener noreferrer external">
                    Kurumsal kaynak sayfasını aç
                  </a>
                </dd>
                <dt>Kullanım hakkı</dt>
                <dd>
                  {record.rights.status.replaceAll("_", " ")} — {record.rights.note}
                  {record.rights.licenseUrl ? (
                    <> · <a className={styles.externalLink} href={record.rights.licenseUrl} target="_blank" rel="noopener noreferrer external">Lisans koşulları</a></>
                  ) : null}
                </dd>
                <dt>İnceleme durumu</dt>
                <dd>
                  {reviewLabel(record.verification.status)}
                  {record.verification.reviewedBy ? ` — ${record.verification.reviewedBy}` : ""}
                </dd>
                <dt>Kategoriler</dt>
                <dd>{record.categories.join(", ")}</dd>
              </dl>

              <a
                className={styles.institutionButton}
                href={record.source.url}
                target="_blank"
                rel="noopener noreferrer external"
              >
                <Icon name="museum" size={16} /> Kurumsal Arşiv Kaynağını Ziyaret Et
              </a>

              <p className={styles.notice}>
                Bu katalog kaydı dosya indirme hizmeti sunmaz. Kaynağa yalnız yukarıdaki kurumsal dış bağlantı üzerinden erişilir.
              </p>
            </div>
          </aside>
        </div>
      </article>
    </ContentPage>
  );
}
