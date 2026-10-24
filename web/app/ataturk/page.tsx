import type { Metadata } from "next";
import { ExhibitionExplorer } from "@/components/ataturk-experience/ExhibitionExplorer";
import { ExperienceHero } from "@/components/ataturk-experience/ExperienceHero";
import { ChapterNav, FeaturedQuote, ScopeNotes } from "@/components/ataturk-experience/ExperienceNotes";
import { LifeJourney } from "@/components/ataturk-experience/LifeJourney";
import styles from "@/components/ataturk-experience/ataturk-experience.module.css";
import { getPublishedArchiveRecords } from "@/lib/archive";
import { buildAtaturkExperience, packExperienceRecords } from "@/lib/ataturk-experience";

export const metadata: Metadata = { title: "Atatürk — Dijital Yaşam Deneyimi", description: "Mustafa Kemal Atatürk'ün yaşamını kaynak kurumların arşiv kayıtları üzerinden keşfeden etkileşimli zaman çizelgesi, tematik keşif ve dijital sergi.", alternates: { canonical: "/ataturk" } };

export default function AtaturkPage() {
  const experience = buildAtaturkExperience(getPublishedArchiveRecords());
  // Aynı nesne iki istemci bileşenine verilir; RSC yükünde bir kez serileştirilir.
  const packed = packExperienceRecords(experience.records);
  return <main id="icerik" className={styles.page}>
    <ExperienceHero experience={experience} />
    <ChapterNav />
    <FeaturedQuote quote={experience.quote} />
    <section id="yolculuk" className={`container ${styles.section}`} aria-labelledby="yolculuk-baslik">
      <div className={styles.sectionHead}>
        <p className={styles.kicker}>Etkileşimli yaşam yolculuğu</p>
        <h2 id="yolculuk-baslik" className={styles.sectionTitle}>Dönem dönem, yıl yıl</h2>
        <p className={styles.sectionLead}>Yıl rayından bir yıl seçin veya kaydırarak ilerleyin. Her olay kartı, kaynak kurumu, belge bağlantısını ve tarih bilgisini içeren bir bilgi paneli açar.</p>
      </div>
      <LifeJourney periods={experience.periods} packed={packed} rail={experience.rail} />
    </section>
    <div className="container"><ExhibitionExplorer packed={packed} themes={experience.themes} typeCounts={experience.typeCounts} /><ScopeNotes experience={experience} /></div>
  </main>;
}
