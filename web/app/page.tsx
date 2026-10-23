import Link from "next/link";
import { Archive } from "@/components/Archive";
import { Chronology } from "@/components/Chronology";
import { Hero } from "@/components/Hero";
import { Publications } from "@/components/Publications";
import { ShortcutGrid } from "@/components/ShortcutGrid";
import { archiveCollections, chronology, heroSlides, publications, shortcuts } from "@/lib/site-data";

export default function HomePage() {
  return <main id="icerik"><Hero slides={heroSlides} /><ShortcutGrid items={shortcuts} /><div className="container content-grid"><Publications items={publications} /><Chronology entries={chronology} /></div><Archive collections={archiveCollections} /><section className="statement-section"><div className="container statement-inner"><div className="statement-mark" aria-hidden="true">MKA</div><div className="statement-content"><div className="eyebrow">HAKKIMIZDA</div><h2>Tarihî hafıza, güvenilir kaynaklarla yaşar.</h2><p>Asrın Kemali, Mustafa Kemal Atatürk&apos;e ilişkin tarih, kültür ve arşiv çalışmalarına odaklanan bağımsız bir dijital projedir. Kamu kurumu, resmî enstitü veya mevcut bir dernek değildir.</p><Link href="/hakkimizda" className="text-link">Proje ilkelerimizi okuyun →</Link></div></div></section><section className="lower-sections container"><article><span className="eyebrow">GELECEK ÇALIŞMALAR</span><h2>ARAŞTIRMA VE SÖYLEŞİLER</h2><p>Uzman katkıları ve tarih söyleşileri için planlanan alan henüz faal değildir.</p></article><article><span className="eyebrow">DUYURULAR</span><h2>ETKİNLİK TAKVİMİ</h2><p>Doğrulanmış düzenleyici, tarih ve katılım bilgisi bulunan etkinlikler yayımlandığında burada yer alacaktır.</p></article></section></main>;
}
