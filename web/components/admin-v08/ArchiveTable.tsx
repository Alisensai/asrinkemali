import Link from "next/link";
import type { ArchiveRecord } from "../../../schemas/archive-record.types";
import { getArchiveQualityFlags } from "@/lib/admin-v08/archive";
import styles from "@/app/yonetim/admin.module.css";

export function ArchiveTable({ records }: { records: readonly ArchiveRecord[] }) {
  if (!records.length) {
    return <div className={styles.emptyState}><h2>Kayıt bulunamadı</h2><p>Arama ve filtre koşullarını değiştirin.</p></div>;
  }
  return (
    <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <caption className={styles.srOnly}>Arşiv kayıtları, durumları ve kalite uyarıları</caption>
        <thead><tr><th scope="col">Kayıt</th><th scope="col">Tarih</th><th scope="col">Tür</th><th scope="col">Kaynak</th><th scope="col">Teknik durum</th><th scope="col">Kontrol bulguları</th></tr></thead>
        <tbody>{records.map((record) => {
          const flags = getArchiveQualityFlags(record);
          const issues = [
            flags.missingSource ? "Kaynak eksik" : "",
            flags.rightsUnclear ? "Hak belirsiz" : "",
            flags.dateUncertain ? "Tarih belirsiz" : "",
            flags.aiRepresentative ? "AI temsili" : "",
          ].filter(Boolean);
          return (
            <tr key={record.id}>
              <td><Link className={styles.tableLink} href={`/yonetim/arsiv/${encodeURIComponent(record.slug)}`}>{record.title}</Link><small>{record.id}</small></td>
              <td>{record.date.display}</td>
              <td>{record.type}</td>
              <td>{record.source.institution || "Belirtilmemiş"}</td>
              <td><span className={styles.status}>{record.verification.status}</span><small>İnsan onayı ayrı doğrulanır</small></td>
              <td>{issues.length ? <span className={styles.warningText}>{issues.join(" · ")}</span> : <span className={styles.okText}>Otomatik alan kontrolünde uyarı yok</span>}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
