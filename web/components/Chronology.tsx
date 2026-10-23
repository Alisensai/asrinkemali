import type { ChronologyEntry } from "@/lib/site-types";

export function Chronology({ entries }: { entries: ChronologyEntry[] }) {
  return <section id="kronoloji" aria-labelledby="chronology-title"><h2 id="chronology-title">Kronoloji</h2>{entries.length === 0 ? <p>Kaynak doğrulaması tamamlanan kayıtlar burada gösterilecek.</p> : <ol>{entries.map((entry) => <li key={`${entry.year}-${entry.description}`}><strong>{entry.year}</strong><span>{entry.description}</span></li>)}</ol>}</section>;
}
