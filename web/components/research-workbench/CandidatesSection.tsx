import type { ResearchCandidate } from "@/lib/research-evidence/candidates";
import { candidateStateLabel } from "@/lib/research-evidence/candidates";
import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

interface CandidatesSectionProps {
  candidates: ResearchCandidate[];
}

export function CandidatesSection({ candidates }: CandidatesSectionProps) {
  const targetStart = 1881;
  const targetEnd = 1918;
  const inTarget = candidates.filter((candidate) => {
    const start = candidate.periodStart ?? candidate.eventYear;
    const end = candidate.periodEnd ?? candidate.eventYear;
    return start !== null && start <= targetEnd && (end ?? start) >= targetStart;
  });

  return (
    <section className={styles.section} aria-label="Kaynak adayları">
      <h2>B · Kaynak Adayları</h2>
      <p className={styles.lede}>
        {candidates.length} aday; {inTarget.length} tanesi 1881–1918 hedef dönemiyle örtüşüyor.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Kimlik</th>
              <th scope="col">Başlık</th>
              <th scope="col">Kurum</th>
              <th scope="col">Dönem</th>
              <th scope="col">Nitelik</th>
              <th scope="col">Durum</th>
              <th scope="col">Doğrulama</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} />
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        Erişilebilirlik denetimi yalnızca bağlantının açık olduğunu gösterir; tarihî doğruluk kanıtı
        değildir. Künyesi eksik adaylar eksik bırakılmıştır; hiçbir alan uydurulmaz.
      </p>
    </section>
  );
}

function CandidateRow({ candidate }: { candidate: ResearchCandidate }) {
  const period =
    candidate.periodStart !== null
      ? `${candidate.periodStart}–${candidate.periodEnd ?? ""}`
      : (candidate.eventYear ?? "—");

  const flags = [
    candidate.verification.citationComplete ? "künye ✓" : "künye ✗",
    candidate.verification.rightsKnown ? "hak bilgisi ✓" : "hak bilgisi ✗",
    candidate.verification.humanReviewed ? "insan ✓" : "insan ✗",
  ].join(" · ");

  return (
    <tr>
      <td>{candidate.id}</td>
      <td>
        <a href={candidate.url} rel="noopener noreferrer external" target="_blank">
          {candidate.title}
        </a>
      </td>
      <td>{candidate.institution}</td>
      <td className={styles.periodCell}>{period}</td>
      <td>
        {candidate.sourceNature === "primary"
          ? "Birincil"
          : candidate.sourceNature === "secondary"
            ? "İkincil"
            : "Belirsiz"}
      </td>
      <td>{candidateStateLabel(candidate.state)}</td>
      <td>{flags}</td>
    </tr>
  );
}
