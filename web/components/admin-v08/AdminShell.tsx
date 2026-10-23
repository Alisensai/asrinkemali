import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentAdminSession } from "@/lib/admin-v08/auth";
import { canAccessSection, ROLE_LABELS } from "@/lib/admin-v08/access-control";
import type { AdminSection, AdminSession } from "@/lib/admin-v08/access-control";
import { AdminNavigation } from "@/components/admin-v08/AdminNavigation";
import styles from "@/app/yonetim/admin.module.css";

export function AdminShell({ session, children }: { session: AdminSession; children: ReactNode }) {
  return (
    <div className={styles.adminShell} data-admin-route>
      <aside className={styles.sidebar} aria-label="Yönetim modülleri">
        <Link className={styles.brand} href="/yonetim">
          <span className={styles.brandMark}>MKA</span>
          <span>Kontrol Merkezi</span>
        </Link>
        <AdminNavigation session={session} />
        <div className={styles.sidebarIdentity}>
          <span>{ROLE_LABELS[session.role]}</span>
          <strong>{session.displayName}</strong>
        </div>
      </aside>
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <span className={styles.kicker}>ASRIN KEMALİ · YÖNETİM</span>
          <span className={styles.readonlyNotice}>V0.8 · salt okunur ve dry-run</span>
        </header>
        <div className={styles.content}>{children}</div>
      </section>
    </div>
  );
}

export async function AdminSectionGate({
  session,
  section,
  children,
}: {
  session?: AdminSession;
  section: AdminSection;
  children: ReactNode;
}) {
  const authorizedSession = session ?? await getCurrentAdminSession();
  if (!authorizedSession) return null;
  if (!canAccessSection(authorizedSession, section)) {
    return (
      <section className={styles.emptyState} role="alert">
        <h1>Erişim reddedildi</h1>
        <p>Bu modül için hesabınızda gerekli yetki bulunmuyor.</p>
      </section>
    );
  }
  return children;
}
