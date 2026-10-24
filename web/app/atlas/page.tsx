import type { Metadata } from "next";
import { getPublishedArchiveRecords } from "@/lib/archive";
import { parseAtlasParams, toAtlasDataset } from "@/lib/atlas/model";
import { AtlasExplorer } from "@/components/atlas/AtlasExplorer";

export const metadata: Metadata = {
  title: "MKA Atlas 2.0 — Tarih, Mekân ve Arşiv Keşfi",
  description: "Kaynaklı arşiv kayıtlarını şehir, tarih, kişi, kurum ve kayıt ilişkileri üzerinden keşfedin.",
  alternates: { canonical: "/atlas" },
  robots: { index: false, follow: true },
};
type Props = {searchParams: Promise<Record<string,string | string[] | undefined>>};
export default async function AtlasPage({searchParams}:Props) {
  const {filters,warnings} = parseAtlasParams(await searchParams);
  const dataset = toAtlasDataset(getPublishedArchiveRecords());
  return <main id="icerik"><AtlasExplorer dataset={dataset} initialFilters={filters} warnings={warnings}/></main>;
}
