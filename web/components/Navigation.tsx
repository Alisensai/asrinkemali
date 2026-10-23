"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LinkItem } from "@/lib/site-types";
import { Icon } from "./Icon";

export function Navigation({ items }: { items: LinkItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        const menu = menuRef.current;
        const toggle = toggleRef.current;
        if (!menu || !toggle) return;

        const focusables = [
          toggle,
          ...Array.from(menu.querySelectorAll<HTMLElement>("a[href]")),
        ];

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }
    }

    function handleClickOutside(event: MouseEvent) {
      if (open && navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <nav ref={navRef} className="main-nav" aria-label="Ana menü">
      <div className="container nav-inner">
        <button
          ref={toggleRef}
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={open}
          aria-controls="main-menu"
          onClick={() => setOpen((current) => !current)}
        >
          <Icon name="menu" />
          <span>MENÜ</span>
        </button>
        <div id="main-menu" ref={menuRef} className={`menu-links${open ? " open" : ""}`}>
          {items.map((item, index) => {
            const route = item.href.split("?")[0];
            const active = route === "/" ? pathname === "/" : pathname.startsWith(route);
            return (
              <Link
                key={item.href}
                className={`nav-item${index === 0 ? " nav-home" : ""}${active ? " active" : ""}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {index === 0 ? <Icon name="home" size={15} /> : null}
                <span className="nav-label">{item.label.toLocaleUpperCase("tr-TR")}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
