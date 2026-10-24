import type { Metadata } from "next";
import { getPublishedArchiveRecords } from "@/lib/archive";
import { parseComparisonParams, toComparisonDataset } from "@/lib/document-comparison/model";
import { DocumentComparisonView } from "@/components/document-comparison";

export const metadata: Metadata = {
  title: "MKA — Kaynaklı Belge Karşılaştırma Merkezi",
  description:
    "Mustafa Kemal Atatürk odaklı arşiv belgelerini yan yana, nesnel parametrelerle karşılaştırın.",
  alternates: { canonical: "/karsilastir" },
  robots: { index: false, follow: true },
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DocumentComparisonPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const { slugA, slugB, warnings } = parseComparisonParams(resolvedParams);
  const records = getPublishedArchiveRecords();
  const dataset = toComparisonDataset(records);

  return (
    <main id="icerik">
      <DocumentComparisonView
        dataset={dataset}
        initialSlugA={slugA}
        initialSlugB={slugB}
        warnings={warnings}
      />
    </main>
  );
}
