import { isAdminPath } from "../access-contract.ts";
import type { BlackoutLevel } from "./types.ts";

/**
 * BLACKOUT düzeyine göre rota erişim kararı (saf). `proxy.ts`'e BAĞLI DEĞİLDİR; bağlamak,
 * paylaşılan durum deposu kurulduktan sonra ayrı ve onaylı bir değişikliktir.
 *
 *  NORMAL / WATCH : davranış değişmez.
 *  RESTRICTED     : kritik API'ler (araştırma dışa aktarımı vb.) ve yönetim rotaları 503.
 *  LOCKDOWN       : salt-okunur güvenli mod. Durum değiştiren tüm istekler ve sağlık dışı tüm
 *                   API'ler 503; herkese açık sayfalar GET/HEAD ile okunmaya devam eder.
 *  Sağlık uç noktaları her düzeyde açıktır (izleme ve geri dönüş doğrulaması için).
 */

export const HEALTH_PATHS = ["/api/health", "/api/ready"] as const;
export const CRITICAL_API_PREFIXES = ["/api/arastirma-laboratuvari", "/api/admin", "/api/editor"] as const;
const READ_METHODS = new Set(["GET", "HEAD"]);

export type BlackoutRouteDecision = { action: "allow" } | { action: "deny"; status: 503; reason: string; headers: Record<string, string> };

const deny = (reason: string): BlackoutRouteDecision => ({
  action: "deny",
  status: 503,
  reason,
  headers: { "Retry-After": "300", "Cache-Control": "no-store" },
});

const matchesPrefix = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function blackoutRouteDecision(level: BlackoutLevel, request: { method: string; pathname: string }): BlackoutRouteDecision {
  const pathname = request.pathname.toLowerCase();
  const method = request.method.toUpperCase();
  if (matchesPrefix(pathname, HEALTH_PATHS)) return { action: "allow" };
  if (level <= 1) return { action: "allow" };
  if (matchesPrefix(pathname, CRITICAL_API_PREFIXES) || isAdminPath(pathname)) return deny("kritik-yüzey-kapalı");
  if (level === 3) {
    if (!READ_METHODS.has(method)) return deny("salt-okunur-güvenli-mod");
    if (pathname.startsWith("/api/")) return deny("salt-okunur-güvenli-mod-api");
  }
  return { action: "allow" };
}
