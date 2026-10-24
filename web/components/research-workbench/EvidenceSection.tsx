import {
  type WorkbenchEvidence,
  VERIFICATION_LEVEL_LABELS,
} from "@/lib/research-evidence/workbench";
import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

interface EvidenceSectionProps {
  evidence: WorkbenchEvidence[];
}

export function EvidenceSection({ evidence }: EvidenceSectionProps) {
  return (
    <section className={styles.section} aria-label="Kanıt detayları">
      <h2>D · Kanıt Detayları</h2>
      <p className={styles.lede}>
        Her kanıt, özgün kaynağın konumunu (bölüm/pasaj) ve kısa alıntısını taşır. Başlık/künye incelemesi
        (title_only/metadata_only) destek kararı SAYILMAZ.
      </p>
      <ul className={styles.evidenceList}>
        {evidence.map((e) => (
          <li key={e.id} className={styles.evidenceCard}>
            <div className={styles.claimHead}>
              <strong>{e.id}</strong>
              <span>
                {e.claimId} v{e.claimVersion} · {e.relation === "supports" ? "destekliyor" : e.relation === "contradicts" ? "çelişiyor" : "kısmi"}
              </span>
              <span>{VERIFICATION_LEVEL_LABELS[e.verificationLevel] ?? e.verificationLevel}</span>
            </div>
            <p className={styles.evidenceCite}>
              <a href={e.locator.url} rel="noopener noreferrer external" target="_blank">
                {e.locator.title}
              </a>{" "}
              — {e.locator.institution}
              {e.locator.author ? ` · ${e.locator.author}` : ""}
              {e.locator.section ? ` · ${e.locator.section}` : ""}
            </p>
            {e.shortQuote && <blockquote className={styles.quote}>“{e.shortQuote}”</blockquote>}
            <p className={styles.claimMeta}>
              Değerlendirme:{" "}
              {e.supportAssessment.assessed
                ? `${e.supportAssessment.method === "direct_passage" ? "doğrudan pasaj" : e.supportAssessment.method} · ${
                    e.supportAssessment.actuallySupports === true ? "destekliyor" : e.supportAssessment.actuallySupports === false ? "desteklemiyor" : "belirsiz"
                  }`
                : "henüz değerlendirilmedi"}
              {e.dateRange ? ` · tarih: ${e.dateRange.display}` : ""}
            </p>
            {e.supportAssessment.note && <p className={styles.note}>{e.supportAssessment.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
