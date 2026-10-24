import type { ResearchCandidate } from "@/lib/research-evidence/candidates";
import { candidateStateLabel } from "@/lib/research-evidence/candidates";
import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

interface GapSectionProps {
  candidates: ResearchCandidate[];
}

export function GapSection({ candidates }: GapSectionProps) {
  const targetStart = 1881;
  const targetEnd = 1918;
  const inTarget = candidates.filter((candidate) => {
    const start = candidate.periodStart ?? candidate.eventYear;
    const end = candidate.periodEnd ?? candidate.eventYear;
    return start !== null && start <= targetEnd && (end ?? start) >= targetStart;
  });

  const byState = candidates.reduce<Record<string, number>>((acc, candidate) => {
    acc[candidate.state] = (acc[candidate.state] ?? 0) + 1;
    return acc;
  }, {});

  const institutions = [...new Set(candidates.map((candidate) => candidate.institution))];
  const themes = [...new Set(candidates.flatMap((candidate) => candidate.researchThemes))].sort();

  return (
    <section className={styles.section} aria-label="Boşluk analizi">
      <h2>G · 1881–1918 Boşluk Analizi</h2>
      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{inTarget.length}</span>
          <span className={styles.statLabel}>Hedef dönem adayı</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{institutions.length}</span>
          <span className={styles.statLabel}>Kurum</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{byState.awaiting_human_review ?? 0}</span>
          <span className={styles.statLabel}>İnsan incelemesi bekliyor</span>
        </div>
      </div>
      <h3>Durum dağılımı</h3>
      <ul className={styles.stateList}>
        {Object.entries(byState).map(([state, count]) => (
          <li key={state}>
            <span>{candidateStateLabel(state)}</span>
            <strong>{count}</strong>
          </li>
        ))}
      </ul>
      <h3>Araştırma temaları</h3>
      <ul className={styles.themeList}>
        {themes.map((theme) => (
          <li key={theme}>{theme}</li>
        ))}
      </ul>
      <p className={styles.note}>
        Bu durumların hiçbiri otomatik olarak tarih uzmanı veya editör onayı anlamına gelmez.
      </p>
    </section>
  );
}
