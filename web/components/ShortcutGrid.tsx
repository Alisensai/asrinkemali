import type { Shortcut } from "@/lib/site-types";

export function ShortcutGrid({ items }: { items: Shortcut[] }) {
  return <section aria-label="Hızlı erişim"><ul>{items.map((item) => <li key={item.label}><a href={item.href}><strong>{item.label}</strong><span>{item.description}</span></a></li>)}</ul></section>;
}
