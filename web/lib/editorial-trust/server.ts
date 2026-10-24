import "server-only";

import { ACTIVE_EDITORIAL_POLICY, REGISTERED_IDENTITY_PROVIDER } from "./configuration.ts";
import { createActorResolver, type ActorResolver } from "./identity.ts";

/**
 * Üretim bağlantı noktası. Bu repoda güvenilir kimlik sağlayıcısı ve etkin editoryal
 * politika yoktur (PR #26 `getCurrentAdminSession()` de `null` döner). Bu nedenle her
 * karar yazımı `not_configured` / `policy_unconfigured` ile kapalı kalır. Değerler tek
 * kaynaktan (`configuration.ts`) gelir; diğer yayın kapıları da aynı değeri okur.
 */
export { ACTIVE_EDITORIAL_POLICY, REGISTERED_IDENTITY_PROVIDER };

export function getProductionActorResolver(): ActorResolver {
  return createActorResolver({ provider: REGISTERED_IDENTITY_PROVIDER, environment: process.env.NODE_ENV });
}
