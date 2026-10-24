import type { AdminRole } from "./access-control";

export const FORTRESS_ROLES = ["viewer", "contributor", "historian", "editor", "admin"] as const;
export type FortressRole = (typeof FORTRESS_ROLES)[number];

export const FORTRESS_PERMISSIONS = [
  "archive.read_drafts",
  "archive.edit",
  "review.submit_expert",
  "publication.edit",
  "publication.approve",
  "publication.schedule",
  "audit.read",
  "users.manage",
] as const;
export type FortressPermission = (typeof FORTRESS_PERMISSIONS)[number];

function frozenPermissions(...permissions: FortressPermission[]): readonly FortressPermission[] {
  return Object.freeze(permissions);
}

const ROLE_PERMISSIONS: Readonly<Record<FortressRole, readonly FortressPermission[]>> = Object.freeze({
  viewer: frozenPermissions(),
  contributor: frozenPermissions("archive.read_drafts", "archive.edit", "publication.edit"),
  historian: frozenPermissions("archive.read_drafts", "review.submit_expert"),
  editor: frozenPermissions("archive.read_drafts", "publication.edit", "publication.approve", "publication.schedule", "audit.read"),
  admin: frozenPermissions("audit.read", "users.manage"),
});

const ROLE_CROSSWALK: Readonly<Record<FortressRole, AdminRole>> = Object.freeze({
  viewer: "researcher",
  contributor: "content_editor",
  historian: "historian",
  editor: "chief_editor",
  admin: "system_admin",
});

const ADMIN_EXPECTED_PERMISSIONS: Readonly<Record<AdminRole, readonly FortressPermission[]>> = Object.freeze({
  system_admin: frozenPermissions("audit.read", "users.manage"),
  chief_editor: frozenPermissions("archive.read_drafts", "publication.edit", "publication.approve", "publication.schedule", "audit.read"),
  historian: frozenPermissions("archive.read_drafts", "review.submit_expert"),
  content_editor: frozenPermissions("archive.read_drafts", "archive.edit", "publication.edit"),
  researcher: frozenPermissions("archive.read_drafts"),
  readonly_auditor: frozenPermissions("archive.read_drafts", "audit.read"),
});

export interface FortressPrincipalClaims {
  issuer: string;
  subject: string;
  roles: readonly string[];
  permissions: readonly string[];
  issuedAt: number;
  expiresAt: number;
  mfa: boolean;
}

export interface FortressSessionProvider {
  readonly id: string;
  verifySession(): Promise<FortressPrincipalClaims | null>;
}

export interface AdminPermissionGrant {
  readonly role: AdminRole;
  readonly fortressRole: FortressRole;
  readonly permissions: readonly FortressPermission[];
  readonly issuer: string;
  readonly subject: string;
  readonly mfa: boolean;
}

const verifiedGrants = new WeakSet<object>();

export interface PermissionCrosswalkRow {
  fortressRole: FortressRole;
  adminRole: AdminRole;
  sourcePermissions: readonly FortressPermission[];
  expectedByAdminRole: readonly FortressPermission[];
  grantedIntersection: readonly FortressPermission[];
}

function isFortressRole(value: string): value is FortressRole {
  return FORTRESS_ROLES.includes(value as FortressRole);
}

function isFortressPermission(value: string): value is FortressPermission {
  return FORTRESS_PERMISSIONS.includes(value as FortressPermission);
}

export function buildPermissionCrosswalk(): readonly PermissionCrosswalkRow[] {
  return Object.freeze(FORTRESS_ROLES.map((fortressRole) => {
    const adminRole = ROLE_CROSSWALK[fortressRole];
    const sourcePermissions = ROLE_PERMISSIONS[fortressRole];
    const expectedByAdminRole = ADMIN_EXPECTED_PERMISSIONS[adminRole];
    const grantedIntersection = sourcePermissions.filter((permission) => expectedByAdminRole.includes(permission));
    return Object.freeze({
      fortressRole,
      adminRole,
      sourcePermissions,
      expectedByAdminRole,
      grantedIntersection: Object.freeze(grantedIntersection),
    });
  }));
}

function mapVerifiedFortressPrincipal(
  claims: FortressPrincipalClaims | null | undefined,
  now = Date.now(),
): AdminPermissionGrant | null {
  if (!claims || typeof claims !== "object") return null;
  if (
    typeof claims.issuer !== "string" ||
    !claims.issuer.trim() ||
    typeof claims.subject !== "string" ||
    !claims.subject.trim() ||
    !Array.isArray(claims.roles) ||
    !Array.isArray(claims.permissions)
  ) return null;
  if (!Number.isFinite(claims.issuedAt) || !Number.isFinite(claims.expiresAt) || claims.issuedAt > now + 60_000) return null;
  if (claims.expiresAt <= now || claims.expiresAt - claims.issuedAt > 8 * 60 * 60 * 1000) return null;

  const roles = [...new Set(claims.roles.filter(isFortressRole))];
  if (roles.length !== 1) return null;
  const fortressRole = roles[0];
  const adminRole = ROLE_CROSSWALK[fortressRole];
  const sourceRolePermissions = ROLE_PERMISSIONS[fortressRole];
  const claimedPermissions = new Set(claims.permissions.filter(isFortressPermission));
  const expectedPermissions = ADMIN_EXPECTED_PERMISSIONS[adminRole];
  const permissions = sourceRolePermissions.filter(
    (permission) => claimedPermissions.has(permission) && expectedPermissions.includes(permission),
  );

  return Object.freeze({
    role: adminRole,
    fortressRole,
    permissions: Object.freeze(permissions),
    issuer: claims.issuer,
    subject: claims.subject,
    mfa: claims.mfa === true,
  });
}

export async function resolveAdminPermissionGrant(
  provider: FortressSessionProvider | null,
  now = Date.now(),
): Promise<AdminPermissionGrant | null> {
  if (!provider || typeof provider.id !== "string" || !provider.id.trim()) return null;
  try {
    const claims = await provider.verifySession();
    if (!claims || claims.issuer !== provider.id) return null;
    const grant = mapVerifiedFortressPrincipal(claims, now);
    if (grant) verifiedGrants.add(grant);
    return grant;
  } catch {
    return null;
  }
}

export type AdminMutation = "archive.edit" | "review.submit_expert" | "publication.edit" | "publication.approve" | "publication.schedule" | "users.manage";

export function authorizeAdminMutation(
  grant: AdminPermissionGrant | null,
  action: AdminMutation,
  context: { resourceAuthor?: string } = {},
): { allowed: boolean; reason: "no-trusted-grant" | "permission-denied" | "mfa-required" | "self-approval" | "allowed" } {
  if (!grant || !verifiedGrants.has(grant)) return { allowed: false, reason: "no-trusted-grant" };
  if (!grant.permissions.includes(action)) return { allowed: false, reason: "permission-denied" };
  if (["review.submit_expert", "publication.approve", "publication.schedule", "users.manage"].includes(action) && !grant.mfa) {
    return { allowed: false, reason: "mfa-required" };
  }
  if (
    ["review.submit_expert", "publication.approve"].includes(action) &&
    context.resourceAuthor &&
    context.resourceAuthor === grant.subject
  ) {
    return { allowed: false, reason: "self-approval" };
  }
  return { allowed: true, reason: "allowed" };
}
