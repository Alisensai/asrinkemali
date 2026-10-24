"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { LinkItem } from "@/lib/site-types";
import { Icon } from "./Icon";

function subscribeSearch(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getSearchSnapshot() {
  return typeof window !== "undefined" ? window.location.search : "";
}

function getServerSearchSnapshot() {
  return "";
}

/**
 * Computes the single active navigation item index without prefix ambiguity.
 * Guarantees exactly one or zero items receive aria-current="page".
 */
export function computeActiveNavIndex(items: LinkItem[], pathname: string, search = ""): number {
  if (!items || items.length === 0) return -1;
  if (pathname === "/") {
    return items.findIndex((it) => it.href === "/");
  }

  // 1. If search parameters exist, match query parameters first
  if (search) {
    const full = `${pathname}${search}`;
    const exact = items.findIndex((it) => it.href === full);
    if (exact !== -1) return exact;

    const currentParams = new URLSearchParams(search);
    const queryMatch = items.findIndex((it) => {
      if (!it.href.includes("?")) return false;
      const [itPath, itQuery] = it.href.split("?");
      if (itPath !== pathname) return false;
      const itParams = new URLSearchParams(itQuery);
      let match = true;
      for (const [k, v] of itParams.entries()) {
        if (currentParams.get(k) !== v) {
          match = false;
          break;
        }
      }
      return match;
    });
    if (queryMatch !== -1) return queryMatch;
  }

  // 2. Exact pathname match without query (e.g. /arsiv, /ataturk, /kronoloji)
  const exactPathMatch = items.findIndex((it) => it.href === pathname);
  if (exactPathMatch !== -1) return exactPathMatch;

  // 3. Sub-route prefix match (e.g. /arsiv/record-slug -> /arsiv)
  let bestIndex = -1;
  let bestLen = 0;
  items.forEach((item, index) => {
    if (item.href === "/" || item.href.includes("?")) return;
    if (pathname.startsWith(`${item.href}/`) && item.href.length > bestLen) {
      bestIndex = index;
      bestLen = item.href.length;
    }
  });

  return bestIndex;
}

export function Navigation({ items }: { items: LinkItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSyncExternalStore(subscribeSearch, getSearchSnapshot, getServerSearchSnapshot);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const activeIndex = computeActiveNavIndex(items, pathname, search);

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
            const active = index === activeIndex;
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
