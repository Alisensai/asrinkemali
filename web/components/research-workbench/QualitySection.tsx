import type { WorkbenchData } from "@/lib/research-evidence/workbench";
import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

interface QualitySectionProps {
  workbench: WorkbenchData;
}

export function QualitySection({ workbench }: QualitySectionProps) {
  return (
    <section className={styles.section} aria-label="Veri kalite raporları">
      <h2>I · Veri Kalite Raporları</h2>
      <p className={styles.lede}>
        9 boyutlu aday denetimi. Telif izni hiçbir aday için doğrulanmamıştır (0 puan) ve otomatik
        &quot;içe aktarıma hazır&quot; kararı üretilmez.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Aday</th>
              <th scope="col">Erişim</th>
              <th scope="col">Künye</th>
              <th scope="col">Nitelik netliği</th>
              <th scope="col">Dönem</th>
              <th scope="col">Provenans</th>
              <th scope="col">Telif</th>
              <th scope="col">Bağımsızlık</th>
              <th scope="col">İnceleme ihtiyacı</th>
            </tr>
          </thead>
          <tbody>
            {workbench.audits.map((audit) => (
              <tr key={audit.candidateId}>
                <td>{audit.candidateId}</td>
                <td>{scoreLabel(audit.scores.accessibility)}</td>
                <td>{scoreLabel(audit.scores.bibliographicIntegrity)}</td>
                <td>{scoreLabel(audit.scores.sourceNatureClarity)}</td>
                <td>{scoreLabel(audit.scores.periodRelevance)}</td>
                <td>{scoreLabel(audit.scores.provenanceIntegrity)}</td>
                <td>{scoreLabel(audit.scores.copyrightClarity)}</td>
                <td>{scoreLabel(audit.scores.independence)}</td>
                <td>{scoreLabel(audit.scores.humanReviewNeed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Öne çıkan denetim bulguları</h3>
      <ul className={styles.findingList}>
        {workbench.audits
          .flatMap((audit) => audit.findings.map((finding) => [audit.candidateId, finding] as const))
          .filter(([, finding]) => finding.startsWith("Künye araştırması"))
          .map(([id, finding]) => (
            <li key={id}>
              <strong>{id}</strong> — {finding}
            </li>
          ))}
      </ul>
    </section>
  );
}

function scoreLabel(value: number | undefined) {
  if (value === undefined) return "—";
  if (value >= 1) return "✓";
  if (value <= 0) return "✗";
  return value.toFixed(1);
}
