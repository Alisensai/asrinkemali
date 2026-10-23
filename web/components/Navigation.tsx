import type { LinkItem } from "@/lib/site-types";

export function Navigation({ items }: { items: LinkItem[] }) {
  return <nav aria-label="Ana gezinme"><ul>{items.map((item) => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}</ul></nav>;
}
