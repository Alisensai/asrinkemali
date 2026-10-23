import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadResearchPool,
  researchLabEnabled,
  candidateStateLabel,
  type ResearchCandidate,
} from "@/lib/research-evidence/candidates";
import {
  loadWorkbench,
  CLAIM_STATUS_LABELS,
  VERIFICATION_LEVEL_LABELS,
  type WorkbenchClaim,
  type WorkbenchEvidence,
} from "@/lib/research-evidence/workbench";
import styles from "./laboratuvar.module.css";
import SourceCompare from "./SourceCompare";
import NotebookPanel from "./NotebookPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Araştırma Laboratuvarı — Evidence Workbench",
  description:
    "MKA Evidence Workbench — iddia inceleme kuyruğu, kanıt konumları, kaynak karşılaştırma ve akademik kaynakça (yalnızca geliştirme ortamı).",
  robots: { index: false, follow: false },
};

const TABS: Array<{ key: string; label: string }> = [
  { key: "dashboard", label: "A · Araştırma Paneli" },
  { key: "adaylar", label: "B · Kaynak Adayları" },
  { key: "kuyruk", label: "C · İddia Kuyruğu" },
  { key: "kanit", label: "D · Kanıt Detayları" },
  { key: "karsilastirma", label: "E · Kaynak Karşılaştırma" },
  { key: "kaynakca", label: "F · Akademik Kaynakça" },
  { key: "bosluk", label: "G · Boşluk Analizi" },
  { key: "notlar", label: "H · Araştırma Notları" },
  { key: "kalite", label: "I · Veri Kalitesi" },
  { key: "disari", label: "J · Dışa Aktarım" },
];

/**
 * Geliştirme/özel panel: yalnızca MKA_RESEARCH_LAB=1 bayrağıyla ve
 * NODE_ENV=production OLMAYAN ortamda açılır. Production'da bayrak set
 * edilse bile 404 döner. Staging verisi yayımlanmış arşiv değildir.
 */
export default async function ResearchLabPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!researchLabEnabled()) {
    notFound();
  }
  const params = await searchParams;
  const tabParam = typeof params.bolum === "string" ? params.bolum : "dashboard";
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : "dashboard";

  const { candidates } = loadResearchPool();
  const workbench = loadWorkbench();

  return (
    <main className={styles.lab}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>MKA EVIDENCE WORKBENCH 2.0</p>
        <h1>Araştırma Laboratuvarı</h1>
        <p className={styles.lede}>
          İddia inceleme kuyruğu, kanıt konumları, kaynak karşılaştırma, akademik kaynakça ve veri kalitesi.
          Bu panel geliştirme ortamına özeldir; staging verisi yayımlanmış arşiv değildir ve hiçbir kayıt
          insan uzman onayı olmadan arşive aktarılmaz.
        </p>
      </header>

      <nav className={styles.tabNav} aria-label="Panel bölümleri">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/arastirma-laboratuvari?bolum=${t.key}`}
            className={t.key === tab ? `${styles.tabLink} ${styles.tabActive}` : styles.tabLink}
            aria-current={t.key === tab ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "dashboard" && <DashboardSection candidates={candidates} workbench={workbench} />}
      {tab === "adaylar" && <CandidatesSection candidates={candidates} />}
      {tab === "kuyruk" && <QueueSection workbench={workbench} />}
      {tab === "kanit" && <EvidenceSection evidence={workbench.evidence} />}
      {tab === "karsilastirma" && <SourceCompare candidates={candidates} />}
      {tab === "kaynakca" && <BibliographySection candidates={candidates} />}
      {tab === "bosluk" && <GapSection candidates={candidates} />}
      {tab === "notlar" && <NotebookPanel notes={workbench.notes} />}
      {tab === "kalite" && <QualitySection workbench={workbench} />}
      {tab === "disari" && <ExportSection />}
    </main>
  );
}

/* ---------- A · Dashboard ---------- */

function DashboardSection({
  candidates,
  workbench,
}: {
  candidates: ResearchCandidate[];
  workbench: ReturnType<typeof loadWorkbench>;
}) {
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
        {claims.map((claim) => (
          <li key={claim.id}>
            <Link href={`/arastirma-laboratuvari?bolum=kuyruk#claim-${claim.id}`}>{claim.id}</Link>
            <span>{claim.revisions[claim.revisions.length - 1].text.slice(0, 90)}…</span>
            <strong>{CLAIM_STATUS_LABELS[claim.status] ?? claim.status}</strong>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        {withEvidence.length}/{claims.length} iddianın güncel sürümünde kanıt kaydı var. Hiçbir iddia
        "onaylı" değildir; pasaj temelli destek dahi insan tarihçi incelemesi olmadan kesinlik
        anlamına gelmez.
      </p>
    </section>
  );
}

/* ---------- B · Kaynak Adayları ---------- */

function CandidatesSection({ candidates }: { candidates: ResearchCandidate[] }) {
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

/* ---------- C · İddia Kuyruğu ---------- */

function QueueSection({ workbench }: { workbench: ReturnType<typeof loadWorkbench> }) {
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

/* ---------- D · Kanıt Detayları ---------- */

function EvidenceSection({ evidence }: { evidence: WorkbenchEvidence[] }) {
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
              <a href={e.locator.url} rel="nofollow noreferrer noopener" target="_blank">
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

/* ---------- F · Akademik Kaynakça ---------- */

function BibliographySection({ candidates }: { candidates: ResearchCandidate[] }) {
  return (
    <section className={styles.section} aria-label="Akademik kaynakça">
      <h2>F · Akademik Kaynakça</h2>
      <p className={styles.lede}>
        Eksik yazar/tarih alanları uydurulmaz ve [eksik: …] olarak işaretlenir. Özgün eser ile yayımlayan
        dijital platform ayrı tutulur.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Aday</th>
              <th>Chicago</th>
              <th>APA</th>
              <th>BibTeX</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => {
              const author = candidate.authors.map((a) => a.name).join(" ve ") || "[eksik: yazar]";
              const year = candidate.publishedAt ? String(candidate.publishedAt).slice(0, 4) : "[eksik: yıl]";
              const platform = candidate.institution;
              const url = candidate.url;
              return (
                <tr key={candidate.id}>
                  <td>{candidate.id}</td>
                  <td>
                    {author}. {year}. “{candidate.title}.” {platform}. {url}.
                  </td>
                  <td>
                    {author} ({year}). {candidate.title}. {platform}. {url}
                  </td>
                  <td>
                    <code>
                      @misc&#123;{candidate.id},&#10; author = &#123;{`{${author}}`}&#125;,&#10; year = &#123;{year}&#125;,&#10;
                      title = &#123;{candidate.title}&#125;,&#10; url = &#123;{url}&#125;&#10;&#125;
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- G · Boşluk Analizi ---------- */

function GapSection({ candidates }: { candidates: ResearchCandidate[] }) {
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

/* ---------- I · Veri Kalitesi ---------- */

function QualitySection({ workbench }: { workbench: ReturnType<typeof loadWorkbench> }) {
  return (
    <section className={styles.section} aria-label="Veri kalite raporları">
      <h2>I · Veri Kalite Raporları</h2>
      <p className={styles.lede}>
        9 boyutlu aday denetimi. Telif izni hiçbir aday için doğrulanmamıştır (0 puan) ve otomatik
        "içe aktarıma hazır" kararı üretilmez.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Aday</th>
              <th>Erişim</th>
              <th>Künye</th>
              <th>Nitelik netliği</th>
              <th>Dönem</th>
              <th>Provenans</th>
              <th>Telif</th>
              <th>Bağımsızlık</th>
              <th>İnceleme ihtiyacı</th>
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

function scoreLabel(value: number) {
  if (value >= 1) return "✓";
  if (value <= 0) return "✗";
  return value.toFixed(1);
}

/* ---------- J · Dışa Aktarım ---------- */

function ExportSection() {
  return (
    <section className={styles.section} aria-label="Dışa aktarım merkezi">
      <h2>J · Dışa Aktarım Merkezi</h2>
      <p className={styles.lede}>
        Dışa aktarılan dosyalar gerçek arşive otomatik aktarılmaz; dry-run varsayılan'dır. İçe aktarım
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
