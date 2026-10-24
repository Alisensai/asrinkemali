import { ACTOR_ROLES, isOneOf, type ActorIdentityEvidence, type ActorRole, type DecisionKind, type SubjectType } from "./model.ts";
import { parseStrictTimestamp } from "./time.ts";

/**
 * Güvenilir kimlik sınırı.
 *
 * Aktör yalnız sunucu tarafındaki bir `TrustedIdentityProvider` üzerinden çözülür.
 * İstek başlığı, sorgu dizgisi, çerez etiketi, localStorage veya istemci JSON'u bu
 * modüle hiçbir yoldan giremez. Çözülen kanıt modül içi bir WeakSet ile işaretlenir;
 * aynı alanlara sahip elle kurulmuş (ör. JSON'dan gelen) nesne kanıt sayılmaz.
 */

export interface ProviderSession {
  subject: string;
  role: string;
  provider: string;
  sessionId: string;
  authenticatedAt: string;
  expiresAt: string;
  /** Görüntüleme adı güvenilir kimlik değildir; karar kaydına kimlik olarak girmez. */
  displayName?: string;
}

export interface TrustedIdentityProvider {
  readonly id: string;
  /** Yalnız test paketlerinde true. Production ortamında böyle bir sağlayıcı reddedilir. */
  readonly testOnly?: boolean;
  getVerifiedSession(): Promise<ProviderSession | null>;
}

export type IdentityError =
  | "not_configured"
  | "test_provider_forbidden_in_production"
  | "identity_unavailable"
  | "session_invalid"
  | "session_expired"
  | "unknown_role";

export type ResolveResult = { ok: true; actor: ActorIdentityEvidence } | { ok: false; error: IdentityError };

export interface ActorResolver {
  /** `untrustedRequestContext` bilinçli olarak yok sayılır (başlık/sorgu/localStorage rolü). */
  resolve(untrustedRequestContext?: unknown): Promise<ResolveResult>;
}

const serverResolved = new WeakSet<object>();

export function isServerResolvedActor(value: unknown): value is ActorIdentityEvidence {
  return typeof value === "object" && value !== null && serverResolved.has(value);
}

export function createActorResolver(options: {
  provider: TrustedIdentityProvider | null;
  environment: string | undefined;
  now?: () => number;
}): ActorResolver {
  const now = options.now ?? Date.now;
  const provider = options.provider;
  return {
    async resolve(): Promise<ResolveResult> {
      if (!provider) return { ok: false, error: "not_configured" };
      if (provider.testOnly && options.environment === "production") return { ok: false, error: "test_provider_forbidden_in_production" };
      let session: ProviderSession | null;
      try {
        session = await provider.getVerifiedSession();
      } catch {
        return { ok: false, error: "identity_unavailable" };
      }
      if (!session) return { ok: false, error: "identity_unavailable" };
      const fields = [session.subject, session.provider, session.sessionId];
      if (fields.some((field) => typeof field !== "string" || !field.trim()) || session.provider !== provider.id) {
        return { ok: false, error: "session_invalid" };
      }
      if (!isOneOf(ACTOR_ROLES, session.role)) return { ok: false, error: "unknown_role" };
      const current = now();
      const authenticated = parseStrictTimestamp(session.authenticatedAt, current);
      const expires = parseStrictTimestamp(session.expiresAt);
      if (!authenticated.ok || !expires.ok) return { ok: false, error: "session_invalid" };
      if (expires.epochMs <= current) return { ok: false, error: "session_expired" };
      const actor: ActorIdentityEvidence = Object.freeze({
        actorId: session.subject.trim(),
        role: session.role,
        provider: provider.id,
        sessionId: session.sessionId,
        authenticatedAt: authenticated.utc,
        expiresAt: expires.utc,
      });
      serverResolved.add(actor);
      return { ok: true, actor };
    },
  };
}

/**
 * Yapılandırılmış editoryal politika. Kurum ve personel yapısı bilinmediği için repoda
 * etkin bir politika yoktur; `null` politika her yazmayı `policy_unconfigured` ile kapatır.
 */
export interface EditorialPolicy {
  version: string;
  decisionRoles: Readonly<Record<DecisionKind, readonly ActorRole[]>>;
  /** Onay geçerlilik süresi; politika tanımlamıyorsa null (süre uydurulmaz). */
  approvalValidityMs: number | null;
}

/** Önerilen başlangıç rol eşlemesi; etkin değildir, yalnız belge ve test için. */
export const RECOMMENDED_DECISION_ROLES: Readonly<Record<DecisionKind, readonly ActorRole[]>> = Object.freeze({
  historian_review: Object.freeze(["historian"] as const),
  publication_editor: Object.freeze(["chief_editor"] as const),
});

export type AuthorizationError =
  | "policy_unconfigured"
  | "actor_not_server_resolved"
  | "role_not_permitted"
  | "conflict_of_interest_author"
  | "separation_of_duties";

export interface AuthorizationContext {
  subjectType: SubjectType;
  /** Kaydı oluşturan/değiştiren güvenilir aktör kimlikleri. */
  authorActorIds: readonly string[];
  /** Aynı kaydın aynı revizyonunda diğer karar türünü vermiş aktörler. */
  otherDecisionActorIds: readonly string[];
}

export function authorizeDecision(
  actor: unknown,
  decisionKind: DecisionKind,
  policy: EditorialPolicy | null,
  context: AuthorizationContext,
): { ok: true } | { ok: false; error: AuthorizationError } {
  if (!policy) return { ok: false, error: "policy_unconfigured" };
  if (!isServerResolvedActor(actor)) return { ok: false, error: "actor_not_server_resolved" };
  // system_admin dahil hiçbir rol, politikada açıkça listelenmedikçe uzmanlık kararı veremez.
  if (!policy.decisionRoles[decisionKind]?.includes(actor.role)) return { ok: false, error: "role_not_permitted" };
  if (context.authorActorIds.includes(actor.actorId)) return { ok: false, error: "conflict_of_interest_author" };
  if (context.otherDecisionActorIds.includes(actor.actorId)) return { ok: false, error: "separation_of_duties" };
  return { ok: true };
}
