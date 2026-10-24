import type { ResearchCandidate } from "@/lib/research-evidence/candidates";
import styles from "@/app/arastirma-laboratuvari/laboratuvar.module.css";

interface BibliographySectionProps {
  candidates: ResearchCandidate[];
}

export function BibliographySection({ candidates }: BibliographySectionProps) {
  return (
    <section className={styles.section} aria-label="Akademik kaynakça">
      <h2>F · Akademik Kaynakça</h2>
      <p className={styles.lede}>
        Eksik yazar/tarih alanları uydurulmaz ve [eksik: …] olarak işaretlenir. Özgün eser ile yayımlayan
        dijital platform ayrı tutulur.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Aday</th>
              <th scope="col">Chicago</th>
              <th scope="col">APA</th>
              <th scope="col">BibTeX</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => {
              const author = candidate.authors.map((a) => a.name).join(" ve ") || "[eksik: yazar]";
              const year = candidate.publishedAt ? String(candidate.publishedAt).slice(0, 4) : "[eksik: yıl]";
              const platform = candidate.institution;
              const url = candidate.url;
              return (
                <tr key={candidate.id}>
                  <td>{candidate.id}</td>
                  <td>
                    {author}. {year}. “{candidate.title}.” {platform}. {url}.
                  </td>
                  <td>
                    {author} ({year}). {candidate.title}. {platform}. {url}
                  </td>
                  <td>
                    <code>
                      @misc&#123;{candidate.id},&#10; author = &#123;{`{${author}}`}&#125;,&#10; year = &#123;{year}&#125;,&#10;
                      title = &#123;{candidate.title}&#125;,&#10; url = &#123;{url}&#125;&#10;&#125;
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
