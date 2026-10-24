import Link from "next/link";
import styles from "../../app/kesfet/kesfet.module.css";

interface ExploreHeroProps {
  query: string;
  publishedRecordCount: number;
  activeSeedTitle?: string;
  activeSeedSlug?: string;
}

export function ExploreHero({
  query,
  publishedRecordCount,
  activeSeedTitle,
  activeSeedSlug,
}: ExploreHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroEyebrow}>
        <span className={styles.heroBadge}>MKA AKILLI KEŞİF &amp; AÇIKLANABİLİR ÖNERİ MOTORU</span>
        <span className={styles.heroStats}>
          {publishedRecordCount} Kaynaklı Arşiv Kaydı
        </span>
      </div>

      <h1 className={styles.heroTitle}>
        Keşfet &amp; Açıklanabilir Kaynaklı Öneriler
      </h1>

      <p className={styles.heroDescription}>
        Mustafa Kemal Atatürk&apos;ün düşünce dünyasını ve Millî Mücadele&apos;yi,
        katalog sinyalleri, ortak şahsiyetler ve tarihsel dönem bağıntılarıyla
        şeffaf biçimde keşfedin.
      </p>

      {/* Arama Formu */}
      <form action="/kesfet" method="GET" className={styles.searchForm} role="search">
        <label htmlFor="explore-search-input" className={styles.visuallyHidden}>
          Arşiv kayıtlarında ara
        </label>
        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            🔍
          </span>
          <input
            id="explore-search-input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Kişi, olay, şehir, kavram veya belge başlığı arayın..."
            className={styles.searchInput}
            autoComplete="off"
            maxLength={100}
          />
          {query ? (
            <Link
              href="/kesfet"
              className={styles.clearSearchButton}
              aria-label="Aramayı temizle"
            >
              ✕
            </Link>
          ) : null}
        </div>
        <button type="submit" className={styles.searchButton}>
          Keşfet
        </button>
      </form>

      {/* Tohum Kayıt Vurgusu (Eğer belirli bir kayıttan öneri alınıyorsa) */}
      {activeSeedTitle && activeSeedSlug ? (
        <div className={styles.seedBanner} role="status">
          <div className={styles.seedBannerContent}>
            <span className={styles.seedIcon} aria-hidden="true">
              🎯
            </span>
            <div>
              <strong className={styles.seedLabel}>Odak Kayıt:</strong>{" "}
              <span className={styles.seedTitle}>{activeSeedTitle}</span>
              <p className={styles.seedHint}>
                Aşağıdaki öneriler bu kaydın tarihsel dönemi, ortak şahsiyetleri ve
                katalog çapraz referansları temel alınarak açıklanabilir biçimde
                sıralanmıştır.
              </p>
            </div>
          </div>
          <Link
            href="/kesfet"
            className={styles.clearSeedLink}
            aria-label="Tohum kayıt odağını kaldırıp genel keşfe dön"
          >
            Genel Keşfe Dön
          </Link>
        </div>
      ) : null}

      {/* Açıklanabilirlik ve Güvenilirlik Taahhüdü */}
      <div className={styles.transparencyNotice} role="note">
        <span className={styles.noticeIcon} aria-hidden="true">
          ℹ️
        </span>
        <div className={styles.noticeText}>
          <strong>Açıklanabilirlik Güvencesi:</strong> Tüm öneriler arşiv
          kayıtlarındaki gerçek tarihsel ilişkiler, ortak temalar ve kurumsal
          kaynaklardan deterministik olarak türetilir; sahte veri veya uydurma
          tarihsel ilişki üretilmez.
        </div>
      </div>
    </header>
  );
}
