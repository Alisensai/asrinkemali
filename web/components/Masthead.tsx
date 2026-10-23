import Image from "next/image";
import Link from "next/link";
import { Icon } from "./Icon";

export function Masthead({ onSearch }: { onSearch: () => void }) {
  return <div className="container masthead"><Link href="/" className="identity" aria-label="Asrın Kemali ana sayfa"><span className="identity-crest-wrapper"><Image className="identity-crest" src="/assets/mka-arma.webp" width={136} height={136} priority alt="MKA — Asrın Kemali amblemi" /></span><span className="identity-copy"><span className="identity-name">ASRIN KEMALİ</span><span className="identity-motto">BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI</span></span></Link><div className="masthead-actions"><button className="header-search" type="button" aria-label="Arşivde Ara" onClick={onSearch}><Icon name="search" size={16} /><span>Arşivde Ara</span></button><Link className="museum-button" href="/arsiv" aria-label="Dijital arşive git"><Icon name="museum" size={18} /><span>Dijital Arşiv</span></Link></div></div>;
}
