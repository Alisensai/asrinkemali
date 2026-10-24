import assert from "node:assert/strict";
import test from "node:test";
import { contentSecurityPolicy, headerOptionsFromEnv, NO_STORE_ROUTES, securityHeaders } from "../lib/security/headers.ts";

// Not: güvenlik birim testleri `tests/security-*.test.mjs` adıyla düz tutulur. `tests/security/` alt
// klasörü, CI kabuğunda `tests/**/*.test.mjs` globunu yalnız alt klasöre genişletip mevcut testleri sessizce dışarıda bırakabilirdi.
const get = (headers, key) => headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;

test("üretim CSP'si eval, websocket ve dış köken içermez; kritik yönergeler kapalıdır", () => {
  const csp = contentSecurityPolicy(false);
  assert.doesNotMatch(csp, /unsafe-eval|ws:|wss:|https?:\/\//);
  for (const directive of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "default-src 'self'", "connect-src 'self'"]) assert.match(csp, new RegExp(directive));
});

test("geliştirme CSP'si yalnız HMR için eval ve websocket'e izin verir", () => {
  assert.match(contentSecurityPolicy(true), /'unsafe-eval'/);
  assert.match(contentSecurityPolicy(true), /connect-src 'self' ws: wss:/);
});

test("CSP modu: production'da zorunlu, report-only ek gözlem, geliştirmede açıkça kapatılabilir", () => {
  const productionDefault = securityHeaders(headerOptionsFromEnv({ NODE_ENV: "production" }));
  assert.ok(get(productionDefault, "Content-Security-Policy"));
  assert.equal(get(productionDefault, "Content-Security-Policy-Report-Only"), undefined);

  const productionOff = securityHeaders(headerOptionsFromEnv({ NODE_ENV: "production", ASRIN_CSP_MODE: "off" }));
  assert.ok(get(productionOff, "Content-Security-Policy"), "production CSP kapatılmamalı");
  assert.equal(get(productionOff, "Content-Security-Policy-Report-Only"), undefined);

  const productionReportOnly = securityHeaders(headerOptionsFromEnv({ NODE_ENV: "production", ASRIN_CSP_MODE: "report-only" }));
  assert.ok(get(productionReportOnly, "Content-Security-Policy"), "report-only zorunlu CSP'nin yerine geçmemeli");
  assert.ok(get(productionReportOnly, "Content-Security-Policy-Report-Only"));

  const developmentDefault = securityHeaders(headerOptionsFromEnv({ NODE_ENV: "development" }));
  assert.ok(get(developmentDefault, "Content-Security-Policy"));
  const developmentOff = securityHeaders(headerOptionsFromEnv({ NODE_ENV: "development", ASRIN_CSP_MODE: "off" }));
  assert.equal(get(developmentOff, "Content-Security-Policy"), undefined);
  assert.equal(get(developmentOff, "Content-Security-Policy-Report-Only"), undefined);

  const developmentReportOnly = securityHeaders(headerOptionsFromEnv({ NODE_ENV: "development", ASRIN_CSP_MODE: "report-only" }));
  assert.equal(get(developmentReportOnly, "Content-Security-Policy"), undefined);
  assert.ok(get(developmentReportOnly, "Content-Security-Policy-Report-Only"));
  assert.ok(get(securityHeaders(headerOptionsFromEnv({ ASRIN_CSP_MODE: "kapat-lütfen" })), "Content-Security-Policy"));
});

test("HSTS yalnız açıkça istenince ve geliştirme dışında eklenir", () => {
  assert.equal(get(securityHeaders(headerOptionsFromEnv({ NODE_ENV: "production" })), "Strict-Transport-Security"), undefined);
  assert.match(get(securityHeaders(headerOptionsFromEnv({ NODE_ENV: "production", ASRIN_ENABLE_HSTS: "1" })), "Strict-Transport-Security"), /max-age=31536000/);
  assert.equal(get(securityHeaders(headerOptionsFromEnv({ NODE_ENV: "development", ASRIN_ENABLE_HSTS: "1" })), "Strict-Transport-Security"), undefined);
});

test("temel başlıklar her modda bulunur; operasyonel uç noktalar önbelleğe alınmaz", () => {
  for (const mode of ["enforce", "report-only", "off"]) {
    const headers = securityHeaders({ mode, development: false, hsts: false });
    assert.equal(get(headers, "X-Content-Type-Options"), "nosniff");
    assert.equal(get(headers, "X-Frame-Options"), "DENY");
    assert.match(get(headers, "Permissions-Policy"), /camera=\(\)/);
  }
  assert.deepEqual([...NO_STORE_ROUTES], ["/api/health", "/api/ready"]);
});
