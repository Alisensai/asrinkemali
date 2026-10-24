import type { ComparisonResult } from "@/lib/document-comparison/model";
import styles from "./comparison.module.css";

interface Props {
  result: ComparisonResult;
}

export function ComparisonTable({ result }: Props) {
  const { docA, docB, fieldRows } = result;

  return (
    <div
      className={styles.tableScroll}
      tabIndex={0}
      role="region"
      aria-label="Belge Karşılaştırma Tablosu"
    >
      <table className={styles.compareTable}>
        <caption>
          İki arşiv belgesinin nesnel katalog alanlarının yan yana karşılaştırması. Bu tablo güvenilirlik veya önem sıralaması içermez.
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ width: "22%" }}>
              Katalog Alanı
            </th>
            <th scope="col" className={styles.colHeaderA}>
              1. Belge: {docA.title}
            </th>
            <th scope="col" className={styles.colHeaderB}>
              2. Belge: {docB.title}
            </th>
          </tr>
        </thead>
        <tbody>
          {fieldRows.map((row) => (
            <tr key={row.key} className={row.isDifferent ? styles.diffRow : undefined}>
              <th scope="row">
                {row.label}
                {row.isDifferent ? (
                  <span
                    style={{
                      display: "block",
                      fontSize: "10px",
                      fontWeight: "normal",
                      color: "var(--comp-muted)",
                      marginTop: "2px",
                    }}
                  >
                    (Farklı)
                  </span>
                ) : null}
              </th>
              <td className={styles.cellA}>
                <div>{row.valueA}</div>
                {row.externalUrlA ? (
                  <a
                    href={row.externalUrlA}
                    target="_blank"
                    rel="noopener noreferrer external"
                    className={styles.extLink}
                  >
                    Kurumsal Sayfayı Aç ↗
                  </a>
                ) : null}
              </td>
              <td className={styles.cellB}>
                <div>{row.valueB}</div>
                {row.externalUrlB ? (
                  <a
                    href={row.externalUrlB}
                    target="_blank"
                    rel="noopener noreferrer external"
                    className={styles.extLink}
                  >
                    Kurumsal Sayfayı Aç ↗
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
