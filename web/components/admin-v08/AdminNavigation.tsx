"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminSection, AdminSession } from "@/lib/admin-v08/access-control";
import styles from "@/app/yonetim/admin.module.css";

const NAVIGATION: ReadonlyArray<{ section: AdminSection; href: string; label: string }> = [
  { section: "overview", href: "/yonetim", label: "Genel Bakış" },
  { section: "archive", href: "/yonetim/arsiv", label: "Arşiv" },
  { section: "reviews", href: "/yonetim/incelemeler", label: "İncelemeler" },
  { section: "publications", href: "/yonetim/yayinlar", label: "Yayınlar" },
  { section: "articles", href: "/yonetim/makaleler", label: "Makaleler" },
  { section: "calendar", href: "/yonetim/takvim", label: "Takvim" },
  { section: "today", href: "/yonetim/tarihte-bugun", label: "Tarihte Bugün" },
  { section: "sources", href: "/yonetim/kaynaklar", label: "Kaynaklar ve Haklar" },
  { section: "users", href: "/yonetim/kullanicilar", label: "Kullanıcılar ve Roller" },
  { section: "audit", href: "/yonetim/denetim", label: "Denetim Günlüğü" },
  { section: "system", href: "/yonetim/sistem", label: "Sistem Sağlığı" },
];

export function AdminNavigation({ session }: { session: AdminSession }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Yönetim modülleri">
      {NAVIGATION.filter((item) => session.allowedSections.includes(item.section)).map((item) => {
        const active = pathname === item.href || (item.href !== "/yonetim" && pathname.startsWith(`${item.href}/`));
        return <Link aria-current={active ? "page" : undefined} className={styles.navItem} href={item.href} key={item.section}>{item.label}</Link>;
      })}
    </nav>
  );
}
