import Link from "next/link";
import type { ExperienceRecord } from "@/lib/ataturk-experience";
import styles from "./ataturk-experience.module.css";

type Props = { record: ExperienceRecord; onSelectRelated?: (slug: string) => void };

/** Bir arşiv kaydının künye paneli: tarih, kaynak, hak ve inceleme durumu. Kanca kullanmaz. */
export function RecordDetails({ record, onSelectRelated }: Props) {
  return <div className={styles.details}>
    <p className={styles.detailsLead}>{record.description}</p>
    <dl className={styles.detailsList}>
      <dt>Tarih</dt><dd>{record.dateStart ? <time dateTime={record.dateStart}>{record.dateDisplay}</time> : record.dateDisplay}{record.dateNote ? <span className={styles.honestNote}>{record.dateNote}</span> : null}</dd>
      <dt>Kaynak kurum</dt><dd>{record.institutionUrl ? <a className={styles.inlineLink} href={record.institutionUrl} target="_blank" rel="noopener noreferrer external">{record.institution}<span className={styles.srOnly}> (yeni sekmede açılır)</span></a> : record.institution}</dd>
      <dt>Kaynak belge</dt><dd>{record.sourceUrl ? <a className={styles.inlineLink} href={record.sourceUrl} target="_blank" rel="noopener noreferrer external">{record.sourceTitle}<span aria-hidden="true"> ↗</span><span className={styles.srOnly}> (yeni sekmede açılır)</span></a> : <span className={styles.warningNote} role="note">Kaynak bağlantısı eksik veya geçersiz; kayıt doğrulanana kadar dış bağlantı verilmez.</span>}</dd>
      {record.citation && record.citation !== record.sourceTitle ? <><dt>Künye</dt><dd>{record.citation}</dd></> : null}
      {record.archiveIdentifier ? <><dt>Arşiv kimliği</dt><dd className={styles.mono}>{record.archiveIdentifier}</dd></> : null}
      {record.locations.length ? <><dt>Yer</dt><dd>{record.locations.join(" · ")}</dd></> : null}
      {record.people.length ? <><dt>Kişiler</dt><dd>{record.people.join(" · ")}</dd></> : null}
      <dt>Kullanım hakkı</dt><dd>{record.rightsLabel}<span className={styles.honestNote}>{record.rightsNote}</span>{record.credit ? <span className={styles.honestNote}>Kredi: {record.credit}</span> : null}</dd>
      {record.imageNote ? <><dt>Görsel</dt><dd>{record.imageNote}</dd></> : null}
      <dt>İnceleme</dt><dd>{record.reviewLabel}<span className={styles.honestNote}>{record.reviewNote}</span></dd>
    </dl>
    <div className={styles.detailsActions}>
      <Link className={styles.actionPrimary} href={`/arsiv/${record.slug}`}>Arşiv kaydını aç<span aria-hidden="true"> →</span></Link>
      {record.sourceUrl ? <a className={styles.actionGhost} href={record.sourceUrl} target="_blank" rel="noopener noreferrer external">Kurumsal kaynağa git<span aria-hidden="true"> ↗</span><span className={styles.srOnly}> (yeni sekmede açılır)</span></a> : null}
    </div>
    {record.related.length ? <div className={styles.related}><p className={styles.relatedTitle}>İlgili kayıtlar</p><ul>{record.related.map((item) => <li key={item.slug}>{onSelectRelated ? <button type="button" className={styles.relatedButton} onClick={() => onSelectRelated(item.slug)}>{item.title}<span aria-hidden="true"> →</span></button> : <Link className={styles.relatedButton} href={`/arsiv/${item.slug}`}>{item.title}</Link>}</li>)}</ul></div> : null}
  </div>;
}
