import "server-only";

import { createActorResolver, type ActorResolver, type EditorialPolicy, type TrustedIdentityProvider } from "./identity.ts";

/**
 * Üretim bağlantı noktası. Bu repoda güvenilir kimlik sağlayıcısı ve etkin editoryal
 * politika yoktur (PR #26 `getCurrentAdminSession()` de `null` döner). Bu nedenle her
 * karar yazımı `not_configured` / `policy_unconfigured` ile kapalı kalır. Bir sağlayıcı
 * eklemek ayrı, insan onaylı bir görevdir (docs/editorial/trust-gates/10-DEPLOYMENT-PREREQUISITES.md).
 */
export const REGISTERED_IDENTITY_PROVIDER: TrustedIdentityProvider | null = null;
export const ACTIVE_EDITORIAL_POLICY: EditorialPolicy | null = null;

export function getProductionActorResolver(): ActorResolver {
  return createActorResolver({ provider: REGISTERED_IDENTITY_PROVIDER, environment: process.env.NODE_ENV });
}
