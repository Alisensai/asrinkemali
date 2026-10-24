import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { normalizeTurkish } from "@/lib/archive";
import {
  getPublicationCategories,
  getPublishedPublications,
} from "@/lib/publishing/repository";
import type { PublicationKind } from "../../../schemas/publication-record.types";
import {
  PublicationFilters,
  PublicationCard,
  PublicationEmptyState,
} from "@/components/publication-experience";
import styles from "../publishing.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

const KINDS: PublicationKind[] = [
  "research_article",
  "biography",
  "historical_analysis",
  "sourced_article",
];

function one(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasFilter = Boolean(params.kategori || params.tur);

  return {
    title: "Yayınlar",
    description: "Kaynakça ve insan editör onayı bulunan araştırma yazıları.",
    alternates: { canonical: "/yayinlar" },
    robots: hasFilter ? { index: false, follow: true } : undefined,
  };
}

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const category = one(params.kategori);
  const kindParam = one(params.tur);
  const kind = KINDS.includes(kindParam as PublicationKind)
    ? (kindParam as PublicationKind)
    : undefined;
  const categories = getPublicationCategories();

  const publications = getPublishedPublications()
    .filter(
      (record) =>
        !category || normalizeTurkish(record.category) === normalizeTurkish(category)
    )
    .filter((record) => !kind || record.kind === kind);

  return (
    <ContentPage eyebrow="ARAŞTIRMA VE İNCELEME" title="YAYINLAR">
      <div className={styles.stack}>
        <PublicationFilters
          categories={categories}
          kinds={KINDS}
          selectedCategory={category}
          selectedKind={kind}
        />

        <div className={styles.resultHeader}>
          <h2>Editör onaylı yayınlar</h2>
          <p aria-live="polite">{publications.length} sonuç</p>
        </div>

        {publications.length > 0 ? (
          <ul className={styles.cards}>
            {publications.map((record) => (
              <PublicationCard key={record.id} publication={record} />
            ))}
          </ul>
        ) : (
          <PublicationEmptyState />
        )}
      </div>
    </ContentPage>
  );
}
