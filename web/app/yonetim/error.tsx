"use client";

import styles from "./admin.module.css";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.accessPage} role="alert">
      <section className={styles.accessCard}>
        <span className={styles.kicker}>YÖNETİM VERİSİ</span>
        <h1>Modül yüklenemedi</h1>
        <p>İstenen repository verisi okunamadı veya biçim denetiminden geçmedi. Güvenli olmayan varsayılan içerik gösterilmedi.</p>
        <button className={styles.button} onClick={() => reset()} type="button">Yeniden dene</button>
      </section>
    </main>
  );
}
