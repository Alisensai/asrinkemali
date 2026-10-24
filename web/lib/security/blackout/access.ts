import type { BlackoutLevel } from "./types.ts";
import { routeEffect, type RouteDecisionInput, type RouteDecisionOptions } from "./routes.ts";

export { CRITICAL_API_PREFIXES, HEALTH_PATHS } from "./routes.ts";

/**
 * BLACKOUT düzeyine göre rota erişim kararı (saf). Etki tablosu `routes.ts` içindedir.
 * Proxy bağlantısı `proxy-guard.ts` üzerinden yapılır; kayıtlı durum deposu yokken etkin düzey
 * NORMAL'dir ve davranış değişmez.
 */

export type BlackoutRouteDecision = { action: "allow" } | { action: "deny"; status: 503; reason: string; headers: Record<string, string> };

export function blackoutRouteDecision(level: BlackoutLevel, request: RouteDecisionInput, options: RouteDecisionOptions = {}): BlackoutRouteDecision {
  const result = routeEffect(level, request, options);
  if (result.effect === "allow") return { action: "allow" };
  return {
    action: "deny",
    status: 503,
    reason: result.reason,
    headers: { "Retry-After": "300", "Cache-Control": "no-store" },
  };
}
