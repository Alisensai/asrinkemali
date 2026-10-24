import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

export function ExportSection() {
  return (
    <section className={styles.section} aria-label="Dışa aktarım merkezi">
      <h2>J · Dışa Aktarım Merkezi</h2>
      <p className={styles.lede}>
        Dışa aktarılan dosyalar gerçek arşive otomatik aktarılmaz; dry-run varsayılandır. İçe aktarım
        sırasında onay bayrakları sıfırlanır.
      </p>
      <ul className={styles.exportList}>
        <li>
          <a href="/api/arastirma-laboratuvari/export?format=claims-v2" data-testid="link-export-claims">
            İddia kayıtları (claims-v2.json)
          </a>
        </li>
        <li>
          <a href="/api/arastirma-laboratuvari/export?format=evidence" data-testid="link-export-evidence">
            Kanıt kayıtları (evidence.json)
          </a>
        </li>
        <li>
          <a href="/api/arastirma-laboratuvari/export?format=audits" data-testid="link-export-audits">
            Aday denetimleri (JSON)
          </a>
        </li>
        <li>
          <a href="/api/arastirma-laboratuvari/export?format=evidence-csv" data-testid="link-export-evidence-csv">
            Kanıt kayıtları (CSV — formül enjeksiyonu korumalı)
          </a>
        </li>
      </ul>
    </section>
  );
}
