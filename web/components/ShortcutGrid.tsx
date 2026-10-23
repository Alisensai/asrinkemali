import Image from "next/image";
import Link from "next/link";
import type { Shortcut } from "@/lib/site-types";
import { Icon, type IconName } from "./Icon";

export function ShortcutGrid({ items }: { items: Shortcut[] }) {
  return <section className="shortcuts container" aria-label="Hızlı arşiv erişimi">{items.map((item) => <Link className="shortcut" href={item.href} key={`${item.kicker}-${item.label}`}><Image className="shortcut-image" src={item.image.src} alt="" fill sizes="(max-width: 620px) 50vw, 25vw" /><span className="shortcut-overlay" /><span className="tile-icon-box"><Icon name={item.icon as IconName} size={24} /></span><span className="shortcut-text"><span>{item.kicker.toLocaleUpperCase("tr-TR")}</span><strong>{item.label.toLocaleUpperCase("tr-TR")}</strong></span><span className="shortcut-arrow" aria-hidden="true">→</span></Link>)}</section>;
}
