import {
  type WorkbenchData,
  CLAIM_STATUS_LABELS,
} from "@/lib/research-evidence/workbench";
import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

interface QueueSectionProps {
  workbench: WorkbenchData;
}

export function QueueSection({ workbench }: QueueSectionProps) {
  return (
    <section className={styles.section} aria-label="İddia inceleme kuyruğu">
      <h2>C · İddia İnceleme Kuyruğu</h2>
      <p className={styles.lede}>
        Her iddia sürümlüdür: metin değiştiğinde eski kanıtlar otomatik geçerli sayılmaz (stale).
      </p>
      <ul className={styles.claimList}>
        {workbench.claims.map((claim) => {
          const current = claim.revisions.find((r) => r.version === claim.currentVersion);
          const staleCount = claim.revisions.length - 1;
          const claimEvidence = workbench.evidence.filter((e) => e.claimId === claim.id);
          const hasContradiction = workbench.contradictions.some((c) => c.claimId === claim.id);
          return (
            <li key={claim.id} id={`claim-${claim.id}`} className={styles.claimCard}>
              <div className={styles.claimHead}>
                <strong>{claim.id}</strong>
                <span>
                  v{claim.currentVersion} · {CLAIM_STATUS_LABELS[claim.status] ?? claim.status}
                </span>
                {hasContradiction && <span className={styles.flagWarn}>çelişki adayı</span>}
              </div>
              <p className={styles.claimText}>{current?.text}</p>
              {claim.uncertaintyNote && <p className={styles.uncertain}>Belirsizlik: {claim.uncertaintyNote}</p>}
              <p className={styles.claimMeta}>
                {claimEvidence.length} kanıt · {staleCount > 0 ? `${staleCount} eski sürüm (stale)` : "tek sürüm"} ·
                kategori: {claim.category}
              </p>
              {claim.revisions.length > 1 && (
                <details className={styles.revisionDetails}>
                  <summary>Revizyon geçmişi ({claim.revisions.length} sürüm)</summary>
                  <ol>
                    {claim.revisions.map((r) => (
                      <li key={r.version}>
                        <strong>v{r.version}</strong> — {r.revisionNote}
                        {r.version !== claim.currentVersion ? " (stale)" : ""}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
