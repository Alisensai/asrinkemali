import "server-only";

import type { AdminSession } from "./access-control";

export {
  canAccessSection,
  canPerformRoleAction,
  ROLE_SECTIONS,
  ADMIN_SECTIONS,
  ADMIN_ROLES,
} from "./access-control";
export type {
  AdminRole,
  AdminSection,
  AdminSession,
  AuthenticatedPrincipal,
  SessionProvider,
} from "./access-control";

export async function getCurrentAdminSession(): Promise<AdminSession | null> {
  // No trusted identity provider is configured in this repository yet.
  return null;
}
