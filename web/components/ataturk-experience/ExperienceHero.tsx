import Image from "next/image";
import type { AtaturkExperience } from "@/lib/ataturk-experience";
import styles from "./ataturk-experience.module.css";

export function ExperienceHero({ experience }: { experience: AtaturkExperience }) {
  const { stats, periods } = experience;
  return <section className={styles.hero} aria-labelledby="ataturk-baslik">
    <div className={styles.heroArt}><Image src="/assets/ataturk-hero-temsili.webp" alt="Mustafa Kemal Atatürk'ü betimleyen temsilî yapay zekâ canlandırması" fill priority sizes="(max-width: 760px) 100vw, 62vw" className={styles.heroImage} /></div>
    <div className={styles.heroShade} aria-hidden="true" />
    <div className={styles.heroOrnament} aria-hidden="true"><span /><span /><span /></div>
    <div className={`container ${styles.heroInner}`}>
      <p className={styles.heroEyebrow}>Bağımsız dijital tarih deneyimi</p>
      <h1 id="ataturk-baslik" className={styles.heroHeading}><span className={styles.heroPretitle}>Gazi Mustafa Kemal</span><span className={styles.heroTitle}>ATATÜRK</span></h1>
      <span className={styles.heroRule} aria-hidden="true" />
      <p className={styles.heroLead}>Bir yaşamı, kaynak kurumların arşiv kayıtları üzerinden yıl yıl keşfedin. Her olay, belge ve fotoğraf kaydı kaynağına bağlanır; kaydı olmayan dönemler boş bırakılır, tahminle doldurulmaz.</p>
      <div className={styles.heroActions}>
        <a href="#yolculuk" className="button button-red"><span>YAŞAM YOLCULUĞUNA BAŞLA</span><span className="btn-arrow" aria-hidden="true">↓</span></a>
        <a href="#sergi" className="button button-outline"><span>DİJİTAL SERGİYİ GEZ</span><span className="btn-arrow" aria-hidden="true">→</span></a>
      </div>
      <dl className={styles.heroStats}>
        <div><dt>Kaynaklı kayıt</dt><dd>{stats.records}</dd></div>
        <div><dt>Kaynak kurum</dt><dd>{stats.institutions}</dd></div>
        <div><dt>Kayıtlı yıllar</dt><dd>{stats.firstYear && stats.lastLifetimeYear ? `${stats.firstYear}–${stats.lastLifetimeYear}` : "—"}</dd></div>
        <div><dt>Fotoğraf · belge</dt><dd>{stats.photographs} · {stats.documents}</dd></div>
      </dl>
    </div>
    <nav className={styles.periodStrip} aria-label="Dönemlere geç">
      <ol className="container">
        {periods.map((period) => <li key={period.id}><a href={`#donem-${period.id}`} data-empty={period.recordSlugs.length === 0 ? "true" : undefined}><span className={styles.stripRange}>{period.range}</span><span className={styles.stripTitle}>{period.title}</span><span className={styles.stripCount}>{period.recordSlugs.length ? `${period.recordSlugs.length} kayıt` : "Kayıt yok"}</span></a></li>)}
      </ol>
    </nav>
    <p className={styles.heroDisclosure}>Kapak görseli: yapay zekâ ile hazırlanmış temsilî canlandırma; tarihî fotoğraf değildir.</p>
  </section>;
}
