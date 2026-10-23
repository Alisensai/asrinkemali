"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LinkItem } from "@/lib/site-types";
import { Icon } from "./Icon";

export function Navigation({ items }: { items: LinkItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return <nav className="main-nav" aria-label="Ana menü"><div className="container nav-inner"><button type="button" className="mobile-menu-toggle" aria-expanded={open} aria-controls="main-menu" onClick={() => setOpen((current) => !current)}><Icon name="menu" /><span>MENÜ</span></button><div id="main-menu" className={`menu-links${open ? " open" : ""}`}>{items.map((item, index) => { const route = item.href.split("?")[0]; const active = route === "/" ? pathname === "/" : pathname.startsWith(route); return <Link key={item.href} className={`nav-item${index === 0 ? " nav-home" : ""}${active ? " active" : ""}`} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>{index === 0 ? <Icon name="home" size={15} /> : null}<span className="nav-label">{item.label.toLocaleUpperCase("tr-TR")}</span></Link>; })}</div></div></nav>;
}
