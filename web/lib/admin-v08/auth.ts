import "server-only";

import { resolveAdminSession, type AdminSession, type SessionProvider } from "./access-control";

export const REGISTERED_ADMIN_SESSION_PROVIDER: SessionProvider | null = null;

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
  return resolveAdminSession(REGISTERED_ADMIN_SESSION_PROVIDER);
}
