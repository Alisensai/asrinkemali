import type { NextConfig } from "next";
import { headerOptionsFromEnv, NO_STORE_ROUTES, securityHeaders } from "./lib/security/headers";

// MKA FORTRESS: güvenlik başlıkları ve CSP `lib/security/headers.ts` içinde tanımlıdır.
// ASRIN_CSP_MODE=report-only|off|enforce (varsayılan enforce), ASRIN_ENABLE_HSTS=1 yalnız HTTPS dağıtımında.
const headerOptions = headerOptionsFromEnv(process.env);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders(headerOptions) },
      ...NO_STORE_ROUTES.map((source) => ({ source, headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] })),
    ];
  },
};

export default nextConfig;
