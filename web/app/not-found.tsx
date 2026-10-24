import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="icerik" className="not-found container">
      <div className="not-found-card">
        <div className="not-found-crest" aria-hidden="true">
          <Image src="/assets/mka-arma.webp" width={84} height={84} alt="" priority />
        </div>
        <p className="eyebrow">KAYIP ARŞİV ODASI • 404</p>
        <h1>Arşiv Kaydı veya Sayfa Bulunamadı</h1>
        <p>
          Talep ettiğiniz içerik yayımlanmamış, editoryal inceleme aşamasında tutuluyor veya arşiv kataloğunda henüz yer almıyor olabilir.
        </p>
        <div className="not-found-actions">
          <Link className="button button-red" href="/">
            <span>ANA SAYFAYA DÖN</span>
            <span className="btn-arrow" aria-hidden="true">→</span>
          </Link>
          <Link className="button button-outline" href="/arsiv">
            <span>DİJİTAL ARŞİVİ KEŞFET</span>
            <span className="btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
