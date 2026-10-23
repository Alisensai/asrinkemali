import styles from "./admin.module.css";

export default function AdminLoading() {
  return <main className={styles.accessPage} aria-live="polite"><p>Yönetim verileri yükleniyor…</p></main>;
}
