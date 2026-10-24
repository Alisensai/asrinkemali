import Image from "next/image";
import Link from "next/link";
import type { ArchiveCollection } from "@/lib/site-types";

export function Archive({ collections }: { collections: ArchiveCollection[] }) {
  return <section className="archive-main container" aria-labelledby="archive-title"><div className="archive-heading"><div><div className="eyebrow">DİJİTAL KOLEKSİYON</div><h2 id="archive-title">ARŞİVİ KEŞFEDİN</h2></div><p>Kaynak, lisans ve tarih bilgisi doğrulanan kayıtlar yayımlanacaktır.</p></div><div className="archive-grid">{collections.map((collection) => <Link className="archive-card" href={collection.href} key={collection.type}><span className="archive-image"><Image src={collection.image.src} alt="" fill sizes="(max-width: 620px) 100vw, 33vw" /></span><span className="archive-card-inner"><span className="archive-tag">{collection.type}</span><h3>{collection.title}</h3><p>{collection.description}</p><span className="card-status">{collection.status}</span></span></Link>)}</div></section>;
}
