import Link from "next/link";
import type { ChronologyEntry } from "@/lib/site-types";
import { Icon } from "./Icon";

export function Chronology({ entries }: { entries: ChronologyEntry[] }) {
  return <aside className="timeline-teaser" aria-labelledby="chronology-title"><div className="timeline-heading"><h2 id="chronology-title"><Icon name="calendar" size={16} /><span>TARİHTE BUGÜN</span></h2><span className="today-marker">Kaynak denetimli</span></div>{entries.length > 0 ? <ol className="timeline-items">{entries.map((entry) => <li key={`${entry.year}-${entry.description}`}><time>{entry.year}</time><span className="t-bullet" aria-hidden="true" /><p>{entry.description}</p></li>)}</ol> : <div className="timeline-empty empty-state"><strong>Doğrulanmış günlük kayıt bekleniyor.</strong><p>Bu alan, kaynak bağlantısı olmayan olayları tarihî gerçek gibi yayımlamaz.</p></div>}<div className="timeline-footer"><Link className="timeline-all" href="/kronoloji">Kronolojiye Git <span aria-hidden="true">→</span></Link></div></aside>;
}
