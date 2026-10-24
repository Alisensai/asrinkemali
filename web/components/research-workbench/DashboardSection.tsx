import Link from "next/link";
import type { ResearchCandidate } from "@/lib/research-evidence/candidates";
import {
  type WorkbenchData,
  CLAIM_STATUS_LABELS,
} from "@/lib/research-evidence/workbench";
import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

interface DashboardSectionProps {
  candidates: ResearchCandidate[];
  workbench: WorkbenchData;
}

export function DashboardSection({ candidates, workbench }: DashboardSectionProps) {
  const claims = workbench.claims;
  const withEvidence = claims.filter((claim) => {
    const current = claim.revisions.find((r) => r.version === claim.currentVersion);
    return current && current.evidenceIds.length > 0;
  });
  const passageBacked = workbench.evidence.filter(
    (e) => e.supportAssessment.method === "direct_passage" && e.supportAssessment.actuallySupports === true
  );

  const stats: Array<[string, string]> = [
    [String(claims.length), "İddia kaydı"],
    [String(workbench.evidence.length), "Kanıt konumu"],
    [String(passageBacked.length), "Pasaj temelli kanıt"],
    [String(workbench.contradictions.length), "Çelişki adayı (inceleme bekliyor)"],
    [String(candidates.length), "Kaynak adayı"],
    [String(workbench.notes.length), "Araştırma notu"],
  ];

  return (
    <section className={styles.section} aria-label="Araştırma paneli">
      <h2>A · Araştırma Paneli</h2>
      <div className={styles.grid}>
        {stats.map(([value, label]) => (
          <div className={styles.stat} key={label}>
            <span className={styles.statValue}>{value}</span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </div>
      <h3>İnsan incelemesi bekleyenler</h3>
      <ul className={styles.queueList}>
        {claims.map((claim) => {
          const latestRevision = claim.revisions[claim.revisions.length - 1];
          return (
            <li key={claim.id}>
              <Link href={`/arastirma-laboratuvari?bolum=kuyruk#claim-${claim.id}`}>{claim.id}</Link>
              <span>{latestRevision ? latestRevision.text.slice(0, 90) : "—"}…</span>
              <strong>{CLAIM_STATUS_LABELS[claim.status] ?? claim.status}</strong>
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>
        {withEvidence.length}/{claims.length} iddianın güncel sürümünde kanıt kaydı var. Hiçbir iddia
        &quot;onaylı&quot; değildir; pasaj temelli destek dahi insan tarihçi incelemesi olmadan kesinlik
        anlamına gelmez.
      </p>
    </section>
  );
}
