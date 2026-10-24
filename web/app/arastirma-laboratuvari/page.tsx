import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  loadResearchPool,
  researchLabEnabled,
  candidateStateLabel,
  type ResearchCandidate,
} from "@/lib/research-evidence/candidates";
import styles from "./laboratuvar.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Araştırma Laboratuvarı",
  description: "MKA Evidence Engine — kaynak adayları havuzu ve arşiv boşluk analizi (yalnızca geliştirme ortamı).",
  robots: { index: false, follow: false },
};

/**
 * Geliştirme/özel panel: yalnızca MKA_RESEARCH_LAB=1 bayrağıyla açılır.
 * Production build'de bayrak yoksa sayfa 404 döner; aday verisi istemciye
 * gönderilmez. Hiçbir aday bu panel üzerinden yayımlanmaz; yayın kararı
 * insan uzman incelemesiyle ayrıca verilir.
 */
export default function ResearchLabPage() {
  if (!researchLabEnabled()) {
    notFound();
  }
  const { candidates } = loadResearchPool();
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
    <main className={styles.lab}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>MKA EVIDENCE ENGINE</p>
        <h1>Araştırma Laboratuvarı</h1>
        <p className={styles.lede}>
          Kaynak keşfi, aday havuzu ve boşluk analizi paneli. Bu panel geliştirme ortamına özeldir ve
          adaylar henüz yayımlanmış arşive ait değildir; hiçbiri insan onayı olmadan arşive aktarılmaz.
        </p>
      </header>

      <section className={styles.grid} aria-label="Havuz özeti">
        <div className={styles.stat}>
          <span className={styles.statValue}>{candidates.length}</span>
          <span className={styles.statLabel}>Toplam aday</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{inTarget.length}</span>
          <span className={styles.statLabel}>1881–1918 kapsamında</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{institutions.length}</span>
          <span className={styles.statLabel}>Kurum</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{byState.awaiting_human_review ?? 0}</span>
          <span className={styles.statLabel}>İnsan incelemesi bekliyor</span>
        </div>
      </section>

      <section className={styles.section} aria-label="Durum dağılımı">
        <h2>Durum dağılımı</h2>
        <ul className={styles.stateList}>
          {Object.entries(byState).map(([state, count]) => (
            <li key={state}>
              <span>{candidateStateLabel(state)}</span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Bu durumların hiçbiri otomatik olarak tarih uzmanı veya editör onayı anlamına gelmez.
        </p>
      </section>

      <section className={styles.section} aria-label="Araştırma temaları">
        <h2>Araştırma temaları</h2>
        <ul className={styles.themeList}>
          {themes.map((theme) => (
            <li key={theme}>{theme}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-label="Kaynak adayları">
        <h2>Kaynak adayları</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Kimlik</th>
                <th>Başlık</th>
                <th>Kurum</th>
                <th>Dönem</th>
                <th>Nitelik</th>
                <th>Durum</th>
                <th>Doğrulama</th>
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
    </main>
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
        <a href={candidate.url} rel="nofollow noreferrer noopener" target="_blank">
          {candidate.title}
        </a>
      </td>
      <td>{candidate.institution}</td>
      <td className={styles.periodCell}>{period}</td>
      <td>{candidate.sourceNature === "primary" ? "Birincil" : candidate.sourceNature === "secondary" ? "İkincil" : "Belirsiz"}</td>
      <td>{candidateStateLabel(candidate.state)}</td>
      <td>{flags}</td>
    </tr>
  );
}
