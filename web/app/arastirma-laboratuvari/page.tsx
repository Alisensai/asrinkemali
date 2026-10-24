import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadResearchPool,
  researchLabEnabled,
} from "@/lib/research-evidence/candidates";
import {
  loadWorkbench,
} from "@/lib/research-evidence/workbench";
import {
  DashboardSection,
  CandidatesSection,
  QueueSection,
  EvidenceSection,
  SourceCompare,
  BibliographySection,
  GapSection,
  NotebookPanel,
  QualitySection,
  ExportSection,
} from "@/components/research-workbench";
import styles from "./laboratuvar.module.css";

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
