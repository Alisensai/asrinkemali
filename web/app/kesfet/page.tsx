import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArchiveRecords } from "@/lib/archive";
import {
  archiveRecordToExploreDTO,
  getActiveRecommendationService,
} from "@/lib/explore-ui/adapter";
import {
  buildExploreClusters,
} from "@/lib/explore-ui/recommendations";
import {
  parseExploreSearchParams,
  searchExploreRecords,
} from "@/lib/explore-ui/search";
import type {
  ExploreRecommendation,
  ExploreRecordDTO,
} from "@/lib/explore-ui/types";
import {
  ExploreCard,
  ExploreEmptyState,
  ExploreFilterBar,
  ExploreHero,
  RecommendationCluster,
} from "@/components/explore";
import styles from "./kesfet.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasFilter = Boolean(
    params.q || params.tur || params.kategori || params.donem || params.kayit
  );

  return {
    title: "Keşfet & Açıklanabilir Kaynaklı Öneriler | Asrın Kemali",
    description:
      "Mustafa Kemal Atatürk'ün mirasını katalog sinyalleri, ortak şahsiyetler ve tarihsel dönem bağıntılarıyla açıklanabilir biçimde keşfedin.",
    alternates: { canonical: "/kesfet" },
    robots: hasFilter ? { index: false, follow: true } : undefined,
  };
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawParams = await searchParams;
  const filterState = parseExploreSearchParams(rawParams);

  // Sunucu tarafında yalnızca doğrulanmış/yayımlanmış kayıtları yükle
  const publishedRecords = getPublishedArchiveRecords();
  const explorePool: ExploreRecordDTO[] = publishedRecords.map(
    archiveRecordToExploreDTO
  );

  // 1. Tohum kayıt odağı denetimi (?kayit=[slug])
  let seedRecord: ExploreRecordDTO | undefined;
  let seedRecommendations: ExploreRecommendation[] = [];

  if (filterState.kayit) {
    seedRecord = explorePool.find(
      (r) => r.slug === filterState.kayit || r.id === filterState.kayit
    );

    if (seedRecord) {
      const service = getActiveRecommendationService();
      seedRecommendations = await service.getRecommendations(
        seedRecord,
        explorePool,
        12
      );
    }
  }

  // 2. Arama ve filtreleme sonuçları
  const searchResult = searchExploreRecords(explorePool, {
    q: filterState.q,
    tur: filterState.tur,
    kategori: filterState.kategori,
    donem: filterState.donem,
    siralama: filterState.siralama,
    sayfa: filterState.sayfa,
    pageSize: 12,
  });

  // 3. Genel keşif için tematik kümeler
  const isDefaultView =
    !filterState.q &&
    !filterState.tur &&
    !filterState.kategori &&
    !filterState.donem &&
    !seedRecord;

  const clusters = isDefaultView ? buildExploreClusters(explorePool) : [];

  const hasAnyFilter = Boolean(
    filterState.q ||
      filterState.tur ||
      filterState.kategori ||
      filterState.donem ||
      filterState.kayit
  );

  return (
    <div className={styles.pageContainer}>
      {/* Hero ve Arama */}
      <ExploreHero
        query={filterState.q}
        publishedRecordCount={explorePool.length}
        activeSeedTitle={seedRecord?.title}
        activeSeedSlug={seedRecord?.slug}
      />

      {/* Filtre ve Yönlendirme Çubuğu */}
      <ExploreFilterBar
        activeFilters={{
          q: filterState.q,
          tur: filterState.tur,
          kategori: filterState.kategori,
          donem: filterState.donem,
          kayit: filterState.kayit,
          siralama: filterState.siralama,
        }}
        availableTypes={searchResult.availableTypes}
        availableCategories={searchResult.availableCategories}
        totalResults={seedRecord ? seedRecommendations.length : searchResult.total}
      />

      <main id="explore-results-main">
        {/* TOHUM KAYIT ÖNERİ MODU: Belirli bir kayda göre açıklanabilir öneriler */}
        {seedRecord && seedRecommendations.length > 0 ? (
          <section
            className={styles.recordsSection}
            aria-labelledby="seed-recommendations-heading"
          >
            <h2 id="seed-recommendations-heading" className={styles.recordsHeading}>
              &quot;{seedRecord.title}&quot; İçin Açıklanabilir Öneriler
            </h2>
            <p className={styles.recordsLead}>
              Bu öneriler; paylaşılan şahsiyetler, coğrafi mekânlar, tarihsel dönem
              ve arşiv kataloğundaki doğrudan çapraz referanslar analiz edilerek
              sıralanmıştır.
            </p>

            <div className={styles.cardsGrid}>
              {seedRecommendations.map((rec) => (
                <ExploreCard
                  key={rec.record.id}
                  record={rec.record}
                  recommendation={rec}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* BOŞ DURUM */}
        {((seedRecord && seedRecommendations.length === 0) ||
          (!seedRecord && searchResult.total === 0)) ? (
          <ExploreEmptyState
            query={filterState.q}
            hasFilters={hasAnyFilter}
          />
        ) : null}

        {/* GENEL KEŞİF MODU: Tematik Kümeler */}
        {isDefaultView ? (
          <div className={styles.clustersSection}>
            <h2 className={styles.clustersMainHeading}>Tematik ve Dönemsel Kümeler</h2>
            <p className={styles.clustersMainLead}>
              Belgeleri, fotoğrafları ve tarihsel tanıklıkları temalarına göre
              birlikte inceleyin.
            </p>
            {clusters.map((cluster) => (
              <RecommendationCluster key={cluster.id} cluster={cluster} />
            ))}
          </div>
        ) : null}

        {/* FİLTRELENMİŞ KAYITLAR VEYA GENEL LİSTELEME */}
        {(!seedRecord && searchResult.total > 0) ? (
          <section
            className={styles.recordsSection}
            aria-labelledby="catalog-records-heading"
          >
            <h2 id="catalog-records-heading" className={styles.recordsHeading}>
              {filterState.q
                ? `"${filterState.q}" Arama Sonuçları`
                : isDefaultView
                ? "Tüm Arşivden Öne Çıkan Kayıtlar"
                : "Filtrelenmiş Arşiv Kayıtları"}
            </h2>
            <p className={styles.recordsLead}>
              {filterState.q
                ? `${searchResult.total} kaynaklı arşiv kaydı eşleşti.`
                : "Kaynak doğrulaması yapılmış, kurum provenansına sahip kayıtlar."}
            </p>

            <div className={styles.cardsGrid}>
              {searchResult.hits.map((hit) => (
                <ExploreCard
                  key={hit.record.id}
                  record={hit.record}
                  matchedFields={hit.matchedFields}
                />
              ))}
            </div>

            {/* Sayfalama */}
            {searchResult.pageCount > 1 ? (
              <nav className={styles.pagination} aria-label="Sayfalama navigasyonu">
                {Array.from({ length: searchResult.pageCount }, (_, i) => i + 1).map(
                  (pageNum) => {
                    const isCurrent = pageNum === searchResult.page;
                    const params = new URLSearchParams();
                    if (filterState.q) params.set("q", filterState.q);
                    if (filterState.tur) params.set("tur", filterState.tur);
                    if (filterState.kategori) params.set("kategori", filterState.kategori);
                    if (filterState.donem) params.set("donem", filterState.donem);
                    if (filterState.siralama) params.set("siralama", filterState.siralama);
                    if (pageNum > 1) params.set("sayfa", String(pageNum));
                    const href = `/kesfet?${params.toString()}`;

                    return (
                      <Link
                        key={pageNum}
                        href={href}
                        className={
                          isCurrent
                            ? styles.paginationLinkActive
                            : styles.paginationLink
                        }
                        aria-current={isCurrent ? "page" : undefined}
                      >
                        {pageNum}
                      </Link>
                    );
                  }
                )}
              </nav>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
