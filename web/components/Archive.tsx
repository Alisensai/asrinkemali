import type { ArchiveRecord } from "@/lib/site-types";

export function Archive({ records }: { records: ArchiveRecord[] }) {
  const published = records.filter((record) => record.verificationStatus === "doğrulandı");
  return <section id="arsiv" aria-labelledby="archive-title"><h2 id="archive-title">Arşiv</h2>{published.length === 0 ? <p>Yalnızca kaynak ve lisansı doğrulanmış kayıtlar yayımlanır.</p> : <ul>{published.map((record) => <li key={record.id}><h3>{record.title}</h3><p>{record.description}</p><small>{record.source} · {record.license}</small></li>)}</ul>}</section>;
}
