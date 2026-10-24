"use client";

import Image from "next/image";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="icerik" className="not-found container">
      <div className="not-found-card">
        <div className="not-found-crest" aria-hidden="true">
          <Image src="/assets/mka-arma.webp" width={84} height={84} alt="" priority />
        </div>
        <p className="eyebrow">BEKLENMEYEN HATA • SİSTEM DURUMU</p>
        <h1>İçerik Yüklenemedi</h1>
        <p>Arşiv bağlantısı kurulurken beklenmeyen bir durum oluştu. Yeniden deneyebilir veya ana sayfaya dönebilirsiniz.</p>
        <div className="not-found-actions">
          <button className="button button-red" type="button" onClick={reset}>
            <span>YENİDEN DENE</span>
            <span className="btn-arrow" aria-hidden="true">↻</span>
          </button>
          <Link className="button button-outline" href="/">
            <span>ANA SAYFAYA DÖN</span>
            <span className="btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
