import Link from "next/link";
import { formatYearRanges, type AtaturkExperience } from "@/lib/ataturk-experience";
import styles from "./ataturk-experience.module.css";

export function FeaturedQuote({ quote }: { quote: AtaturkExperience["quote"] }) {
  if (!quote) return null;
  return <section className={`${styles.quoteSection} ${styles.reveal}`} aria-labelledby="alinti-baslik">
    <div className="container">
      <h2 id="alinti-baslik" className={styles.srOnly}>Kaynaklı alıntı</h2>
      <figure className={styles.quoteFigure}>
        <blockquote className={styles.quoteText}><p>“{quote.text}”</p></blockquote>
        <figcaption className={styles.quoteCaption}>
          <span className={styles.quoteWork}>Mustafa Kemal Atatürk · {quote.work} · {quote.dateDisplay}</span>
          <span>{quote.context}</span>
          <span>Kaynak: <a className={styles.inlineLink} href={quote.sourceUrl} target="_blank" rel="noopener noreferrer external">{quote.sourceTitle}<span aria-hidden="true"> ↗</span><span className={styles.srOnly}> (yeni sekmede açılır)</span></a> · Metin doğrulaması: {quote.verifiedBy} · <Link className={styles.inlineLink} href={`/arsiv/${quote.recordSlug}`}>Arşiv kaydı</Link></span>
        </figcaption>
      </figure>
    </div>
  </section>;
}

export function ChapterNav() {
  const chapters = [{ href: "#yolculuk", label: "Yaşam yolculuğu" }, { href: "#temalar", label: "Temalar" }, { href: "#sergi", label: "Dijital sergi" }, { href: "#kapsam", label: "Kaynaklar ve sınırlar" }];
  return <nav className={styles.chapterNav} aria-label="Atatürk deneyimi bölümleri"><ol className="container">{chapters.map((chapter, index) => <li key={chapter.href}><a href={chapter.href}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{chapter.label}</a></li>)}</ol></nav>;
}

export function ScopeNotes({ experience }: { experience: AtaturkExperience }) {
  const institutions = [...new Map(experience.records.map((record) => [record.institution, record.institutionUrl])).entries()];
  const emptyYears = experience.periods.flatMap((period) => period.emptyYears);
  const emptyThemes = experience.themes.filter((theme) => theme.coverage === "none");
  const partialThemes = experience.themes.filter((theme) => theme.coverage === "partial");
  return <section id="kapsam" className={`${styles.section} ${styles.scope}`} aria-labelledby="kapsam-baslik">
    <div className={styles.sectionHead}>
      <p className={styles.kicker}>Kaynaklar ve sınırlar</p>
      <h2 id="kapsam-baslik" className={styles.sectionTitle}>Bu deneyim neyi gösterir, neyi göstermez?</h2>
    </div>
    <div className={styles.scopeGrid}>
      <div className={styles.scopeCard}>
        <h3>Kapsam</h3>
        <ul>
          <li>Yalnız yayıma açık durumdaki {experience.stats.records} arşiv kaydı kullanılır; taslak ve incelemedeki kayıtlar gösterilmez.</li>
          <li>Bu sayfa Atatürk&apos;ün yaşam öyküsünün tamamını kapsamaz. {experience.stats.earlyRecords ? `Erken yaşamına (1881–1918) tarihlenen yalnız ${experience.stats.earlyRecords} kayıt vardır; bu dönem eksik kapsanır.` : "Erken yaşamına (1881–1918) ait yayımlanmış kayıt henüz yoktur."}</li>
          {emptyYears.length ? <li>1919–1938 arasında kayıt bulunmayan yıllar: {formatYearRanges(emptyYears)}. Boşluklar, olay olmadığı anlamına gelmez.</li> : null}
          <li>Mekân kayıtlarındaki tarihler mekânın veya kurumun kendi geçmişine aittir (ör. inşa, kuruluş); Atatürk&apos;ün o tarihte orada bulunduğunu göstermez. 1881 öncesine tarihlenen kayıtlar yaşam çizelgesinin dışında ayrı gösterilir.</li>
          {emptyThemes.length ? <li>Kaydı olmayan temalar: {emptyThemes.map((theme) => theme.title).join(", ")}.</li> : null}
          {partialThemes.length ? <li>Kısmi kapsamlı temalar: {partialThemes.map((theme) => theme.title).join(", ")}.</li> : null}
        </ul>
      </div>
      <div className={styles.scopeCard}>
        <h3>Doğrulama</h3>
        <ul>
          <li>Kayıtlar kaynak erişimi, tarih ve kullanım hakkı açısından denetlenmiştir; denetim yapay zekâ desteklidir.</li>
          <li>Yapay zekâ incelemesi insan tarihçi onayı değildir. Uzman editör onayı tamamlanana kadar her kayıt “uzman onayı bekliyor” olarak işaretlenir.</li>
          <li>Tarihi yalnız yıl veya ay düzeyinde bilinen kayıtlar ayrıca belirtilir.</li>
        </ul>
      </div>
      <div className={styles.scopeCard}>
        <h3>Görseller ve haklar</h3>
        <ul>
          <li>Tarihî fotoğraf ve belge görüntüleri kopyalanmaz; yeniden kullanım hakkı doğrulanmadığı için kaynak kurumun sayfasına bağlantı verilir.</li>
          <li>Kapak görseli yapay zekâ ile hazırlanmış temsilî bir canlandırmadır, tarihî fotoğraf değildir.</li>
          <li>ASRIN KEMALİ bağımsız bir tarih ve kültür platformudur; resmî bir kamu kurumu değildir.</li>
        </ul>
      </div>
      <div className={styles.scopeCard}>
        <h3>Kaynak kurumlar</h3>
        <ul>{institutions.map(([name, url]) => <li key={name}>{url ? <a className={styles.inlineLink} href={url} target="_blank" rel="noopener noreferrer external">{name}<span aria-hidden="true"> ↗</span><span className={styles.srOnly}> (yeni sekmede açılır)</span></a> : name}</li>)}</ul>
      </div>
    </div>
  </section>;
}
