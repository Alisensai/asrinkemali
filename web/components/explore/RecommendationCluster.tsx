import Link from "next/link";
import type { ExploreCluster } from "../../lib/explore-ui/types";
import { ExploreCard } from "./ExploreCard";
import styles from "../../app/kesfet/kesfet.module.css";

interface RecommendationClusterProps {
  cluster: ExploreCluster;
}

export function RecommendationCluster({ cluster }: RecommendationClusterProps) {
  if (!cluster || cluster.records.length === 0) {
    return null;
  }

  const exploreUrl = `/kesfet?kategori=${encodeURIComponent(cluster.category)}`;

  return (
    <section className={styles.clusterSection} aria-labelledby={`cluster-${cluster.id}`}>
      <div className={styles.clusterHeader}>
        <div className={styles.clusterTitleGroup}>
          <div className={styles.clusterCategoryBadge}>TEMATİK KÜME</div>
          <h2 id={`cluster-${cluster.id}`} className={styles.clusterTitle}>
            {cluster.title}
          </h2>
          <p className={styles.clusterDescription}>{cluster.description}</p>
        </div>

        <div className={styles.clusterMeta}>
          <span className={styles.clusterCountBadge}>
            {cluster.itemCount} Kaynak
          </span>
          <Link href={exploreUrl} className={styles.clusterActionLink}>
            Tüm Kümeyi Gör →
          </Link>
        </div>
      </div>

      <div className={styles.clusterGrid}>
        {cluster.records.slice(0, 3).map((record) => (
          <ExploreCard key={record.id} record={record} />
        ))}
      </div>
    </section>
  );
}
