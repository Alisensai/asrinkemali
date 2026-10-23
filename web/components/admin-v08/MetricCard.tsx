import styles from "@/app/yonetim/admin.module.css";

export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
