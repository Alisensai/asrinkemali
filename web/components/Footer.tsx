import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return <footer className="site-footer"><div className="container footer-top"><div className="footer-brand"><Image src="/assets/mka-arma.webp" width={72} height={72} alt="MKA amblemi" /><div className="footer-brand-text"><strong>ASRIN KEMALİ</strong><p>Bir asrın mirası, sonsuzluğun hafızası.</p></div></div><div className="footer-contact"><h2>PROJE</h2><Link href="/hakkimizda">Hakkımızda ve yayın ilkeleri</Link><p>Bağımsız dijital tarih ve kültür projesi.</p></div></div><div className="container footer-bottom"><span>© 2026 Asrın Kemali • Tüm hakları saklıdır.</span><span>Resmî devlet kurumu veya Atatürk&apos;ün resmî temsilcisi değildir. Görsel canlandırmalar yapay zekâ ile üretilmiştir.</span></div></footer>;
}
