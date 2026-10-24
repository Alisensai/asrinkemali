import { Icon } from "../Icon";
import styles from "./home-v06.module.css";

interface ArchivePortal {
  id: string;
  name: string;
  category: string;
  domain: string;
  url: string;
  description: string;
  scope: string;
}

const INSTITUTIONAL_PORTALS: ArchivePortal[] = [
  {
    id: "tbmm",
    name: "TBMM Açık Erişim ve Tutanak Arşivi",
    category: "Resmî Zabıtlar",
    domain: "tbmm.gov.tr",
    url: "https://www.tbmm.gov.tr/tutanaklar",
    description: "1920'den günümüze Meclis zabıt cerideleri, kanun metinleri ve Millî Mücadele dönemi tutanakları.",
    scope: "1920 — Günümüz",
  },
  {
    id: "ttk",
    name: "Türk Tarih Kurumu Kütüphane ve Arşivi",
    category: "Belge & Araştırma",
    domain: "ttk.gov.tr",
    url: "https://kutuphane.ttk.gov.tr/",
    description: "Atatürk'ün kurduğu TTK'nın nadir eser koleksiyonu, haritalar ve birincil araştırma külliyatı.",
    scope: "1931 — Günümüz",
  },
  {
    id: "devlet-arsivleri",
    name: "Devlet Arşivleri Başkanlığı (Cumhuriyet Arşivi)",
    category: "Devlet Arşivleri",
    domain: "devletarsivleri.gov.tr",
    url: "https://www.devletarsivleri.gov.tr/",
    description: "Cumhuriyet dönemi Bakanlar Kurulu kararları, başvekalet yazışmaları ve resmî devlet evrakı.",
    scope: "1923 — Günümüz",
  },
  {
    id: "atam",
    name: "Atatürk Ansiklopedisi (AYK / ATAM)",
    category: "Akademik Ansiklopedi",
    domain: "ataturkansiklopedisi.gov.tr",
    url: "https://ataturkansiklopedisi.gov.tr/",
    description: "Atatürk Araştırma Merkezi'nin kaynaklı maddeleri, nutuklar, tam metin konuşma ve tanıklıklar.",
    scope: "Kapsamlı İnceleme",
  },
  {
    id: "milli-kutuphane",
    name: "Millî Kütüphane Dijital Koleksiyonları",
    category: "Süreli Yayın & Kitap",
    domain: "mkutup.gov.tr",
    url: "https://dijital-kutuphane.mkutup.gov.tr/",
    description: "Cumhuriyet'in ilk dönem gazeteleri, dergiler, risaleler ve açık erişimli nadir matbu eserler.",
    scope: "Tarihî Basın",
  },
];

export function ResearchHub() {
  return (
    <section className={`container ${styles.sectionWrapper}`} aria-labelledby="research-heading">
      <div className={styles.sectionHeader}>
        <div className={styles.headerTextGroup}>
          <span className={styles.eyebrow}>
            <Icon name="book" size={14} />
            BİRİNCİL KAYNAK ARAŞTIRMALARI
          </span>
          <h2 id="research-heading" className={styles.sectionTitle}>
            KURUMSAL ARŞİV VE AÇIK ERİŞİM REHBERİ
          </h2>
          <p className={styles.sectionSubtitle}>
            Tarih araştırmacılarının ve yurttaşların doğrulanmış resmî belgelere doğrudan erişebileceği kamu ve akademi portalları.
          </p>
        </div>
      </div>

      <div className={styles.researchGrid}>
        {INSTITUTIONAL_PORTALS.map((portal) => (
          <a
            key={portal.id}
            href={portal.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.researchCard}
            aria-label={`${portal.name} resmî sayfasına git (yeni sekmede açılır)`}
          >
            <div className={styles.researchCardHeader}>
              <span className={styles.researchCategory}>{portal.category}</span>
              <span className={styles.researchExternalIcon} aria-hidden="true">
                <Icon name="external" size={14} />
              </span>
            </div>

            <h3 className={styles.researchTitle}>{portal.name}</h3>
            <p className={styles.researchDesc}>{portal.description}</p>

            <div className={styles.researchMeta}>
              <span className={styles.researchDomain}>{portal.domain}</span>
              <span>{portal.scope}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
