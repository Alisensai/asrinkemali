/**
 * MKA FORTRESS — HTTP güvenlik başlıkları (saf, test edilebilir).
 *
 * CSP notu: Next.js App Router satır içi betikler (`self.__next_f.push`) üretir; nonce
 * altyapısı olmadan `script-src` için `'unsafe-inline'` gerekir. Bu temel politika yine de
 * eklenti/nesne yüklemeyi, başka kökenden betik/bağlantıyı, `<base>` ele geçirmeyi,
 * çerçevelenmeyi ve form hedefi değiştirmeyi engeller. Nonce tabanlı katı CSP V1.0 işidir.
 */
export type CspMode = "enforce" | "report-only" | "off";
export type SecurityHeaderOptions = { mode: CspMode; development: boolean; hsts: boolean };
export type Header = { key: string; value: string };

export function contentSecurityPolicy(development: boolean) {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // React geliştirme modu eval ve HMR websocket'i kullanır; yalnız geliştirmede açılır.
    "script-src": ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(development ? ["ws:", "wss:"] : [])],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "frame-src": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
  };
  return Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

export function securityHeaders({ mode, development, hsts }: SecurityHeaderOptions): Header[] {
  const headers: Header[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
  ];
  if (mode === "enforce") headers.push({ key: "Content-Security-Policy", value: contentSecurityPolicy(development) });
  if (mode === "report-only") headers.push({ key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy(development) });
  // HSTS yalnız HTTPS ile sunulan gerçek önizleme/canlı alan adında açılmalıdır; yerel http geliştirmeyi bozmaz.
  if (hsts && !development) headers.push({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" });
  return headers;
}

/** Ortam değişkenlerinden seçenekler; bilinmeyen CSP modu güvenli varsayılana (enforce) düşer. */
export function headerOptionsFromEnv(env: Record<string, string | undefined>): SecurityHeaderOptions {
  const requested = env.ASRIN_CSP_MODE;
  const mode: CspMode = requested === "report-only" || requested === "off" ? requested : "enforce";
  return { mode, development: env.NODE_ENV === "development", hsts: env.ASRIN_ENABLE_HSTS === "1" };
}

/** Hiçbir yanıtta önbelleğe alınmaması gereken operasyonel uç noktalar. */
export const NO_STORE_ROUTES = ["/api/health", "/api/ready"] as const;
