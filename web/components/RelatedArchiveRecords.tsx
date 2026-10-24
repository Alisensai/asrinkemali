import Link from "next/link";
import type { RecommendationItem } from "@/lib/recommendations";

type Props = { items: readonly RecommendationItem[] };

/** Intentionally unstyled: visual ownership stays with the archive/detail design team. */
export function RelatedArchiveRecords({ items }: Props) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="related-archive-heading">
      <h2 id="related-archive-heading">İlgili kayıtlar</h2>
      <p>Öneriler yalnız katalog metadatasındaki açık ilişkiler ve ortak alanlara dayanır; tarihî neden-sonuç iddiası değildir.</p>
      <ul>
        {items.map((item) => (
          <li key={item.recordId}>
            <Link href={`/arsiv/${item.slug}`}>{item.title}</Link>
            <span> — {item.dateDisplay}</span>
            <p>{item.reasons[0]}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
