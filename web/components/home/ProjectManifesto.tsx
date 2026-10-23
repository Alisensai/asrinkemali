import Link from "next/link";
import { Icon } from "../Icon";
import styles from "./home-v06.module.css";

export function ProjectManifesto() {
  return (
    <section className={styles.manifestoSection} aria-labelledby="manifesto-heading">
      <div className={`container ${styles.manifestoInner}`}>
        <div className={styles.manifestoMonogram} aria-hidden="true">
          MKA
        </div>

        <div className={styles.manifestoMotto}>
          BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI
        </div>

        <h2 id="manifesto-heading" className={styles.manifestoHeading}>
          Tarihî Hakikat, Güvenilir Kaynaklarla Yaşar
        </h2>

        <p className={styles.manifestoText}>
          Asrın Kemali, Gazi Mustafa Kemal Atatürk&apos;ün yaşamını, eserlerini ve cumhuriyet mirasını;
          kaynak, lisans ve provenans titizliğiyle dijital çağa taşıyan bağımsız bir kültür projesidir.
          Kamu kurumu, resmî enstitü veya hukuken var olan bir dernek izlenimi oluşturmadan,
          tamamen şeffaf ve bilimsel bir hafıza yaklaşımını savunur.
        </p>

        <div className={styles.manifestoPillars}>
          <div className={styles.pillarCard}>
            <div className={styles.pillarTitle}>
              <Icon name="check" size={14} />
              Bağımsız Kültür İnisiyatifi
            </div>
            <p className={styles.pillarDesc}>
              Hiçbir resmî kamu veya tüzel kişilik unvanı taşımadan, tarihî mirasa sivil ve ilkeli bir saygıyla yaklaşır.
            </p>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarTitle}>
              <Icon name="document" size={14} />
              Birincil Kaynak Titizliği
            </div>
            <p className={styles.pillarDesc}>
              Kayıtlar; TBMM, TTK, AYK ve Devlet Arşivleri gibi resmî arşiv künyeleri ve çağrı numaralarıyla belgelenir.
            </p>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarTitle}>
              <Icon name="contrast" size={14} />
              Şeffaf Temsil İlkesi
            </div>
            <p className={styles.pillarDesc}>
              Görseli olmayan arşiv kayıtlarına sahte görsel eklenmez; yapay zekâ çizimleri açıkça etiketlenir.
            </p>
          </div>
        </div>

        <div className={styles.manifestoActions}>
          <Link href="/hakkimizda" className={styles.manifestoPrimaryBtn}>
            Proje İlkelerimiz ve Manifestomuz <span aria-hidden="true">→</span>
          </Link>
          <Link href="/arsiv" className={styles.manifestoSecondaryBtn}>
            Dijital Kataloğu Keşfedin
          </Link>
        </div>
      </div>
    </section>
  );
}
