export const ADMIN_ROLES = [
  "system_admin",
  "chief_editor",
  "historian",
  "content_editor",
  "researcher",
  "readonly_auditor",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Readonly<Record<AdminRole, string>> = Object.freeze({
  system_admin: "Sistem yöneticisi",
  chief_editor: "Baş editör",
  historian: "Tarih uzmanı",
  content_editor: "İçerik editörü",
  researcher: "Araştırmacı",
  readonly_auditor: "Salt okunur denetçi",
});

export const ADMIN_SECTIONS = [
  "overview",
  "archive",
  "reviews",
  "publications",
  "articles",
  "calendar",
  "today",
  "sources",
  "users",
  "audit",
  "system",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export interface AuthenticatedPrincipal {
  subject: string;
  displayName: string;
  role: AdminRole;
}

export interface AdminSession extends AuthenticatedPrincipal {
  allowedSections: readonly AdminSection[];
}

export interface SessionProvider {
  getAuthenticatedPrincipal(): Promise<AuthenticatedPrincipal | null>;
}

const ALL_SECTIONS: readonly AdminSection[] = Object.freeze([...ADMIN_SECTIONS]);

export const ROLE_SECTIONS: Readonly<Record<AdminRole, readonly AdminSection[]>> = Object.freeze({
  system_admin: ALL_SECTIONS,
  chief_editor: Object.freeze(["overview", "archive", "publications", "articles", "calendar", "today", "audit"] as const),
  historian: Object.freeze(["overview", "archive", "reviews", "sources", "audit"] as const),
  content_editor: Object.freeze(["overview", "archive", "publications", "articles", "calendar"] as const),
  researcher: Object.freeze(["overview", "archive", "sources", "today"] as const),
  readonly_auditor: Object.freeze(["overview", "archive", "audit", "system"] as const),
});

function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

export async function resolveAdminSession(provider: SessionProvider | null): Promise<AdminSession | null> {
  if (!provider) return null;

  const principal = await provider.getAuthenticatedPrincipal();
  if (!principal || !principal.subject.trim() || !principal.displayName.trim() || !isAdminRole(principal.role)) {
    return null;
  }

  return Object.freeze({
    subject: principal.subject,
    displayName: principal.displayName,
    role: principal.role,
    allowedSections: ROLE_SECTIONS[principal.role],
  });
}

export function canAccessSection(session: AdminSession, section: AdminSection): boolean {
  return session.allowedSections.includes(section);
}

export function canPerformRoleAction(session: AdminSession, action: "review_history" | "approve_publication" | "manage_users"): boolean {
  if (action === "manage_users") return session.role === "system_admin";
  if (action === "review_history") return session.role === "historian" || session.role === "system_admin";
  return session.role === "chief_editor" || session.role === "content_editor" || session.role === "system_admin";
}
