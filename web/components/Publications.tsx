import type { Publication } from "@/lib/site-types";

export function Publications({ items }: { items: Publication[] }) {
  return <section id="yayinlar" aria-labelledby="publications-title"><h2 id="publications-title">Güncel yayınlar</h2>{items.length === 0 ? <p>Doğrulanmış yayınlar yakında eklenecek.</p> : <ul>{items.map((item) => <li key={item.id}><a href={item.href}>{item.title}</a><p>{item.category} · {item.publishedAt}</p></li>)}</ul>}</section>;
}
