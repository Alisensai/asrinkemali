import { Archive } from "@/components/Archive";
import { Chronology } from "@/components/Chronology";
import { FeaturedShowcase } from "@/components/home/FeaturedShowcase";
import { ProjectManifesto } from "@/components/home/ProjectManifesto";
import { ResearchHub } from "@/components/home/ResearchHub";
import { Hero } from "@/components/Hero";
import { Publications } from "@/components/Publications";
import { ShortcutGrid } from "@/components/ShortcutGrid";
import { archiveStats, getPublishedArchiveRecords } from "@/lib/archive";
import { archiveCollections, chronology, heroSlides, publications, shortcuts } from "@/lib/site-data";

export default function HomePage() {
  const publishedRecords = getPublishedArchiveRecords();
  const stats = archiveStats();
  const liveHeroSlides = heroSlides.map((slide) => slide.id === "arsiv" ? { ...slide, summary: `${stats.total} kaynaklı kayıt bağlı; katalogda görüntülenen ${stats.published} kayıt insan tarih uzmanı incelemesi bekliyor.` } : slide);
  const collectionTypes = ["photograph", "document", "publication"] as const;
  const liveCollections = archiveCollections.map((collection, index) => ({ ...collection, status: `${stats.byType[collectionTypes[index]]} kayıt görüntülenebilir` }));

  // En prestijli ve farklı türleri temsil eden küratör kayıtları
  const curatedSlugs = [
    "1924-anayasasi",
    "onuncu-yil-nutku-1933",
    "meclis-onunde-dua-1920",
    "nutuk-1928",
  ];

  const featured = curatedSlugs
    .map((slug) => publishedRecords.find((r) => r.slug === slug))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const showcaseRecords = featured.length >= 4 ? featured : publishedRecords.slice(0, 4);

  return (
    <main id="icerik">
      <Hero slides={liveHeroSlides} />
      <ShortcutGrid items={shortcuts} />
      <FeaturedShowcase records={showcaseRecords} />
      <div className="container content-grid">
        <Publications items={publications} />
        <Chronology entries={chronology} />
      </div>
      <Archive collections={liveCollections} />
      <ResearchHub />
      <ProjectManifesto />
      <section className="lower-sections container" aria-label="Gelecek çalışmalar ve duyurular">
        <article>
          <span className="eyebrow">GELECEK ÇALIŞMALAR</span>
          <h2>ARAŞTIRMA VE SÖYLEŞİLER</h2>
          <p>Uzman katkıları ve tarih söyleşileri için planlanan alan henüz faal değildir.</p>
        </article>
        <article>
          <span className="eyebrow">DUYURULAR</span>
          <h2>ETKİNLİK TAKVİMİ</h2>
          <p>Doğrulanmış düzenleyici, tarih ve katılım bilgisi bulunan etkinlikler yayımlandığında burada yer alacaktır.</p>
        </article>
      </section>
    </main>
  );
}
