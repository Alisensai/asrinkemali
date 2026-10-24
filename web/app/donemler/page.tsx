import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { PeriodComparePicker } from "@/components/periods/PeriodComparePicker";
import { PeriodCompareTable } from "@/components/periods/PeriodCompareTable";
import { PeriodEmptyState } from "@/components/periods/PeriodEmptyState";
import { PeriodRecordCard } from "@/components/periods/PeriodRecordCard";
import { PeriodStrip } from "@/components/periods/PeriodStrip";
import {
  getPeriodComparison,
  getPeriodDetail,
  getPeriodOverview,
  parsePeriodParams,
} from "@/lib/historical-periods";
import styles from "./donemler.module.css";

export const metadata: Metadata = {
  title: "Dönemler",
  description:
    "Atatürk ve Cumhuriyet dönemi tarihî gelişmeleri, arşivdeki yayımlanmış kayıtlar üzerinden dönemsel bağlamda keşfedin.",
  alternates: { canonical: "/donemler" },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DonemlerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { donem, karsilastir, warnings } = parsePeriodParams(params);
  const overview = getPeriodOverview();
  const detail = donem ? getPeriodDetail(donem) : null;
  const comparison = karsilastir.length === 2 ? getPeriodComparison(karsilastir[0], karsilastir[1]) : null;
  const comparisonError = comparison && "error" in comparison ? comparison.error : null;

  return (
    <ContentPage eyebrow="DÖNEMSEL BAĞLAMDA ARŞİV" title="TARİHÎ DÖNEMLER">
      <div className={styles.stack}>
        <p className={styles.intro}>
          Bu sayfadaki tüm sayılar yalnızca kaynak denetimli ve yayımlanmış arşiv
          kayıtlarından üretilir (uzman onayı bekliyor). Tarihi belirsiz kayıtlar ({overview.unassignedCount} adet) hiçbir
          döneme atanmadan ayrı sayılır.
        </p>

        {warnings.length ? (
          <div className={styles.warning} role="status">
            {warnings.map((warning: string) => <p key={warning}>{warning}</p>)}
          </div>
        ) : null}

        <PeriodStrip summaries={overview.periods} activeId={donem} />
        <PeriodComparePicker periods={overview.periods.map((p) => ({ id: p.period.id, title: p.period.title }))} initial={karsilastir} />

        {detail ? (
          <section aria-label={detail.period.title}>
            <header className={styles.periodHeader}>
              <h2>{detail.period.title}</h2>
              <p className={styles.periodRange}>
                {detail.period.start.slice(0, 4)} – {detail.period.end ? detail.period.end.slice(0, 4) : "günümüz"} · {detail.count} yayımlanmış kayıt
              </p>
              <p>{detail.period.summary}</p>
            </header>
            {detail.count > 0 ? (
              <>
                <div className={styles.factRow}>
                  <span>Kayıt türü: {detail.typeDistribution.map(([t, c]) => `${t} (${c})`).join(" · ") || "—"}</span>
                  <span>Kaynak kurum sayısı: {detail.sources.length}</span>
                  <span>Kişi sayısı: {detail.people.length}</span>
                  <span>Şehir/mekân sayısı: {detail.cities.length}</span>
                </div>
                <ol className={styles.recordList}>
                  {detail.records.map((record) => <PeriodRecordCard key={record.id} record={record} />)}
                </ol>
              </>
            ) : (
              <PeriodEmptyState title={detail.period.title} />
            )}
          </section>
        ) : null}

        {comparison && !("error" in comparison) ? <PeriodCompareTable comparison={comparison} /> : null}
        {comparisonError ? <div className={styles.warning} role="status"><p>{comparisonError}</p></div> : null}
      </div>
    </ContentPage>
  );
}
