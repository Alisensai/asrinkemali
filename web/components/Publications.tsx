import Image from "next/image";
import Link from "next/link";
import type { Publication } from "@/lib/site-types";

export function Publications({ items }: { items: Publication[] }) {
  return <section className="publications section-head-wrapper" aria-labelledby="publications-title"><div className="section-topline"><h2 id="publications-title">GÜNCEL YAYINLAR</h2><Link className="section-more-link" href="/yayinlar">Tüm Yayınlar <span aria-hidden="true">→</span></Link></div>{items.length > 0 ? <div className="publication-grid">{items.map((item) => <Link className="publication-card" href={item.href} key={item.id}><Image className="publication-image" src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 960px) 100vw, 24vw" /><span className="publication-tag">{item.category}</span><h3>{item.title}</h3><span className="publication-footer"><time>{item.publishedAt}</time><span aria-hidden="true">→</span></span></Link>)}</div> : <div className="publication-empty empty-state"><strong>Henüz doğrulanmış yayın bulunmuyor.</strong><p>Kaynak ve editör incelemesi tamamlanan çalışmalar burada yer alacak.</p></div>}</section>;
}
