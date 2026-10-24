import type { EditorialPolicy, TrustedIdentityProvider } from "./identity.ts";

/**
 * Editoryal güven yapılandırması (saf modül; `server-only` içermez, testlerden ve diğer
 * kapılardan okunabilir). Bu repoda güvenilir kimlik sağlayıcısı ve etkin editoryal politika
 * YOKTUR. Bir sağlayıcı eklemek ayrı, insan onaylı bir görevdir
 * (docs/editorial/trust-gates/10-DEPLOYMENT-PREREQUISITES.md).
 */
export const REGISTERED_IDENTITY_PROVIDER: TrustedIdentityProvider | null = null;
export const ACTIVE_EDITORIAL_POLICY: EditorialPolicy | null = null;

/** Güvenilir insan kararı kaydedilebilir mi? Sağlayıcı ve politika birlikte gerekir. */
export function editorialTrustConfigured(): boolean {
  return REGISTERED_IDENTITY_PROVIDER !== null && ACTIVE_EDITORIAL_POLICY !== null;
}
