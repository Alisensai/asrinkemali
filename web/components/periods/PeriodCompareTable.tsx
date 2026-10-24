import type { PeriodComparison } from "@/lib/historical-periods";
import styles from "@/app/donemler/donemler.module.css";

function Cell({ pairs }: { pairs: [string, number][] }) {
  if (!pairs.length) return <p className={styles.muted}>Kayıtta bu alan yok.</p>;
  return (
    <ul>
      {pairs.slice(0, 8).map(([label, count]) => (
        <li key={label}>{label} <span className={styles.muted}>({count})</span></li>
      ))}
    </ul>
  );
}

export function PeriodCompareTable({ comparison }: { comparison: PeriodComparison }) {
  const { a, b } = comparison;
  return (
    <section className={styles.compareSection} aria-label="Dönem karşılaştırması">
      <div className={styles.compareGrid}>
        <header className={styles.compareHead}>
          <h2>{a.period.title}</h2>
          <p>{a.period.start.slice(0, 4)} – {a.period.end ? a.period.end.slice(0, 4) : "günümüz"}</p>
        </header>
        <header className={styles.compareHead}>
          <h2>{b.period.title}</h2>
          <p>{b.period.start.slice(0, 4)} – {b.period.end ? b.period.end.slice(0, 4) : "günümüz"}</p>
        </header>

        <div><h3>Yayımlanmış kayıt sayısı</h3><p className={styles.bigNumber}>{a.count}</p></div>
        <div><h3>Yayımlanmış kayıt sayısı</h3><p className={styles.bigNumber}>{b.count}</p></div>

        <div><h3>Kayıt türleri</h3><Cell pairs={a.typeDistribution} /></div>
        <div><h3>Kayıt türleri</h3><Cell pairs={b.typeDistribution} /></div>

        <div><h3>Kategoriler</h3><Cell pairs={a.categoryDistribution} /></div>
        <div><h3>Kategoriler</h3><Cell pairs={b.categoryDistribution} /></div>

        <div><h3>Kaynak kurumlar</h3><Cell pairs={a.sources} /></div>
        <div><h3>Kaynak kurumlar</h3><Cell pairs={b.sources} /></div>

        <div><h3>Kişiler</h3><Cell pairs={a.people} /></div>
        <div><h3>Kişiler</h3><Cell pairs={b.people} /></div>

        <div><h3>Şehir / mekân</h3><Cell pairs={a.cities} /></div>
        <div><h3>Şehir / mekân</h3><Cell pairs={b.cities} /></div>

        <div><h3>Kayıt yıl aralığı</h3><p>{a.earliestYear ?? "—"} – {a.latestYear ?? "—"}</p></div>
        <div><h3>Kayıt yıl aralığı</h3><p>{b.earliestYear ?? "—"} – {b.latestYear ?? "—"}</p></div>
      </div>

      <div className={styles.sharedBox}>
        <h3>Her iki dönemde de kaydı olan kişiler</h3>
        {comparison.sharedPeople.length ? (
          <ul>{comparison.sharedPeople.map((name) => <li key={name}>{name}</li>)}</ul>
        ) : (
          <p className={styles.muted}>Yayımlanmış kayıtlarda ortak kişi bulunmuyor.</p>
        )}
        <p className={styles.muted}>{comparison.causalityNote}</p>
      </div>
    </section>
  );
}
