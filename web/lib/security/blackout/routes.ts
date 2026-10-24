import { isAdminPath } from "../access-contract.ts";
import { LEVEL_NAMES, type BlackoutLevel } from "./types.ts";

/**
 * Rota sınıflandırması ve BLACKOUT düzeylerinin rota etkisi (tek doğruluk kaynağı).
 *
 * Bu tablo uygulama (proxy) ve edge katmanı için aynı sözleşmedir; Antigravity edge kuralları
 * buradaki sınıf ve kararları izlemelidir (docs/security/fortress-x-v11/BLACKOUT-INTEGRATION-CONTRACT.md).
 */

export type RouteClass = "health" | "admin" | "research" | "public_api" | "public_page";
export type MethodKind = "read" | "write";
export type RouteEffect = "allow" | "deny";

/** Her düzeyde açık izleme uç noktaları. */
export const HEALTH_PATHS = ["/api/health", "/api/ready"] as const;
/** Hassas araştırma yüzeyleri (sayfa + API). Production'da zaten 404; BLACKOUT ek katmandır. */
export const RESEARCH_PREFIXES = ["/api/arastirma-laboratuvari", "/arastirma-laboratuvari"] as const;
/** Geriye dönük uyumluluk: önceki sürümün kritik API listesi. */
export const CRITICAL_API_PREFIXES = ["/api/arastirma-laboratuvari", "/api/admin", "/api/editor"] as const;

const READ_METHODS = new Set(["GET", "HEAD"]);

const matchesPrefix = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * Yolu karşılaştırma için normalize eder: küçük harf, yüzde kodlaması çözülür, çift ve sondaki
 * eğik çizgiler kaldırılır. Çözülemeyen kodlama `null` döner; çağıran bunu hassas sayar.
 */
export function normalizePath(raw: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(raw); } catch { return null; }
  if (decoded.includes("\0")) return null;
  const collapsed = decoded.replace(/\\/g, "/").replace(/\/{2,}/g, "/").toLowerCase();
  const trimmed = collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function classifyRoute(rawPathname: string): RouteClass {
  const pathname = normalizePath(rawPathname);
  // Çözülemeyen veya şüpheli yol: en hassas sınıf (yalnız kısıtlı düzeylerde etkili).
  if (pathname === null) return "admin";
  if ((HEALTH_PATHS as readonly string[]).includes(pathname)) return "health";
  if (isAdminPath(pathname)) return "admin";
  if (matchesPrefix(pathname, RESEARCH_PREFIXES)) return "research";
  if (pathname.startsWith("/api/") || pathname === "/api") return "public_api";
  return "public_page";
}

export const methodKind = (method: string): MethodKind => (READ_METHODS.has(method.toUpperCase()) ? "read" : "write");

/**
 * Düzey × rota sınıfı × yöntem → etki.
 *  NORMAL/WATCH : değişiklik yok (FORTRESS ve uygulama kapıları geçerli kalır).
 *  RESTRICTED   : yönetim ve araştırma yüzeyleri kapalı; API'lere durum değiştiren istek kapalı.
 *  LOCKDOWN     : salt-okunur güvenli mod. Durum değiştiren her istek ve sağlık dışı her API
 *                 kapalı; herkese açık sayfalar GET/HEAD ile okunur.
 *  health       : her düzeyde açık.
 */
export const ROUTE_POLICY: Record<BlackoutLevel, Record<RouteClass, Record<MethodKind, RouteEffect>>> = {
  0: {
    health: { read: "allow", write: "allow" }, admin: { read: "allow", write: "allow" }, research: { read: "allow", write: "allow" },
    public_api: { read: "allow", write: "allow" }, public_page: { read: "allow", write: "allow" },
  },
  1: {
    health: { read: "allow", write: "allow" }, admin: { read: "allow", write: "allow" }, research: { read: "allow", write: "allow" },
    public_api: { read: "allow", write: "allow" }, public_page: { read: "allow", write: "allow" },
  },
  2: {
    health: { read: "allow", write: "allow" }, admin: { read: "deny", write: "deny" }, research: { read: "deny", write: "deny" },
    public_api: { read: "allow", write: "deny" }, public_page: { read: "allow", write: "allow" },
  },
  3: {
    health: { read: "allow", write: "allow" }, admin: { read: "deny", write: "deny" }, research: { read: "deny", write: "deny" },
    public_api: { read: "deny", write: "deny" }, public_page: { read: "allow", write: "deny" },
  },
};

export interface RouteDecisionInput { method: string; pathname: string }
export interface RouteDecisionOptions {
  /** Durum deposu erişilemez veya kaydı geçersiz: hassas yüzeyler en az RESTRICTED gibi kapanır. */
  degraded?: boolean;
}

export function effectiveLevel(level: BlackoutLevel, options: RouteDecisionOptions = {}): BlackoutLevel {
  return options.degraded && level < 2 ? 2 : level;
}

export function routeEffect(level: BlackoutLevel, input: RouteDecisionInput, options: RouteDecisionOptions = {}): { effect: RouteEffect; routeClass: RouteClass; effectiveLevel: BlackoutLevel; reason: string } {
  const routeClass = classifyRoute(input.pathname);
  const eff = effectiveLevel(level, options);
  const effect = ROUTE_POLICY[eff][routeClass][methodKind(input.method)];
  const reason = effect === "allow" ? "izinli" : `${LEVEL_NAMES[eff].toLowerCase()}${options.degraded && level < 2 ? "-durum-deposu-erişilemez" : ""}:${routeClass}:${methodKind(input.method)}`;
  return { effect, routeClass, effectiveLevel: eff, reason };
}
