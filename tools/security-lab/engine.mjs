import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const SENSITIVE = /(?:authorization|cookie|password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi;

export function assertLocalTarget(rawTarget) {
  const target = new URL(rawTarget);
  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  if (!LOOPBACK_HOSTS.has(hostname) || target.username || target.password) {
    throw new Error("MKA RED TEAM LAB yalnızca localhost/127.0.0.1/::1 hedeflerine bağlanabilir.");
  }
  if (!["http:", "https:"].includes(target.protocol)) throw new Error("Desteklenmeyen laboratuvar protokolü.");
  return target;
}

function redact(value) {
  return String(value ?? "").replace(SENSITIVE, "[REDACTED]").slice(0, 512);
}

async function request(target, scenario) {
  const url = new URL(scenario.path, target);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), scenario.timeoutMs ?? 8_000);
  try {
    const response = await fetch(url, {
      method: scenario.method ?? "GET",
      redirect: "manual",
      headers: scenario.headers,
      signal: controller.signal,
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: redact(text),
      location: response.headers.get("location") ?? "",
    };
  } finally {
    clearTimeout(timer);
  }
}

const noServerError = (result) => result.status < 500;
const isNotFound = (result) => result.status === 404;
const isMethodRejected = (result) => result.status === 405;
const isSameOriginRedirect = (result, target) => !result.location || new URL(result.location, target).origin === target.origin;

export function scenarios() {
  const hostileScript = encodeURIComponent('<script>window.__mkaXss=1</script>');
  return [
    ["RT-001", "Ana sayfa herkese açık", "INFO", "/", (r) => r.status === 200],
    ["RT-002", "Arşiv herkese açık", "INFO", "/arsiv", (r) => r.status === 200],
    ["RT-003", "Sağlık API'si salt-okunur", "LOW", "/api/health", (r) => r.status === 200 && r.body.includes('"status":"ok"')],
    ["RT-004", "Hazırlık API'si salt-okunur", "LOW", "/api/ready", (r) => [200, 503].includes(r.status)],
    ["RT-005", "Araştırma export production'da kapalı", "HIGH", "/api/arastirma-laboratuvari/export?format=claims-v2", isNotFound],
    ["RT-006", "Araştırma export HEAD production'da kapalı", "HIGH", "/api/arastirma-laboratuvari/export", isNotFound, "HEAD"],
    ["RT-007", "Health POST method abuse reddi", "MEDIUM", "/api/health", isMethodRejected, "POST"],
    ["RT-008", "Ready DELETE method abuse reddi", "MEDIUM", "/api/ready", isMethodRejected, "DELETE"],
    ["RT-009", "Yetkisiz admin yolu gizli", "HIGH", "/admin", isNotFound],
    ["RT-010", "Yetkisiz editor yolu gizli", "HIGH", "/editor", isNotFound],
    ["RT-011", "Yetkisiz API admin yolu gizli", "HIGH", "/api/admin/publish", isNotFound],
    ["RT-012", "Ortam dosyası erişilemez", "HIGH", "/.env", isNotFound],
    ["RT-013", "Git yapılandırması erişilemez", "HIGH", "/.git/config", isNotFound],
    ["RT-014", "Paket bildirimi erişilemez", "MEDIUM", "/package.json", isNotFound],
    ["RT-015", "Kodlanmış path traversal reddi", "HIGH", "/%2e%2e/%2e%2e/package.json", (r) => [400, 404].includes(r.status)],
    ["RT-016", "XSS sorgusu çalıştırılmaz veya yansıtılmaz", "HIGH", `/arsiv?q=${hostileScript}`, (r) => noServerError(r) && !r.body.includes("window.__mkaXss")],
    ["RT-017", "SQLi benzeri sorgu sunucuyu düşürmez", "MEDIUM", "/arsiv?q=%27%20OR%201%3D1--", noServerError],
    ["RT-018", "Prototype pollution sorgusu sunucuyu düşürmez", "MEDIUM", "/arsiv?__proto__[polluted]=true", noServerError],
    ["RT-019", "Bozuk Unicode girdisi hata sızdırmaz", "MEDIUM", "/arsiv?q=%ED%A0%80", (r) => noServerError(r) && !/ENOENT|stack|at Object\./i.test(r.body)],
    ["RT-020", "Aşırı arama girdisi hata sızdırmaz", "MEDIUM", `/arsiv?q=${"a".repeat(6000)}`, noServerError],
    ["RT-021", "Açık yönlendirme yok", "HIGH", "/?next=https://example.invalid", (r, target) => isSameOriginRedirect(r, target)],
    ["RT-022", "Şemaya benzer eğik çizgi girdisi dışa yönlendirmez", "HIGH", "/%2F%2Fexample.invalid", (r, target) => isSameOriginRedirect(r, target)],
    ["RT-023", "Bilinmeyen rota hata ayrıntısı sızdırmaz", "MEDIUM", "/olmayan-sayfa", (r) => isNotFound(r) && !/node_modules|[A-Z]:\\|\/home\/runner|stack/i.test(r.body)],
    ["RT-024", "Bilinmeyen arşiv kaydı hata ayrıntısı sızdırmaz", "MEDIUM", "/arsiv/yayinda-olmayan-kayit", (r) => isNotFound(r) && !/node_modules|stack/i.test(r.body)],
    ["RT-025", "Production CSP zorunlu", "HIGH", "/", (r) => /object-src 'none'/.test(r.headers["content-security-policy"] ?? "")],
    ["RT-026", "Clickjacking savunması mevcut", "MEDIUM", "/", (r) => r.headers["x-frame-options"] === "DENY" && /frame-ancestors 'none'/.test(r.headers["content-security-policy"] ?? "")],
    ["RT-027", "Referrer politikası mevcut", "LOW", "/", (r) => r.headers["referrer-policy"] === "strict-origin-when-cross-origin"],
    ["RT-028", "Health cevabı önbelleğe alınmaz", "MEDIUM", "/api/health", (r) => /no-store/.test(r.headers["cache-control"] ?? "")],
    ["RT-029", "Ready cevabı önbelleğe alınmaz", "MEDIUM", "/api/ready", (r) => /no-store/.test(r.headers["cache-control"] ?? "")],
    ["RT-030", "Health cevabı sır veya yığın izi içermez", "MEDIUM", "/api/health", (r) => !/token|password|secret|stack/i.test(r.body)],
    ["RT-031", "Geçersiz tarih parametresi kontrollü işlenir", "LOW", "/tarihte-bugun?ay=99&gun=-1", noServerError],
    ["RT-032", "Geçersiz kronoloji parametresi kontrollü işlenir", "LOW", "/kronoloji?yil=1e999", noServerError],
    ["RT-033", "Export format karmaşası production kapısını aşmaz", "HIGH", "/api/arastirma-laboratuvari/export?format=../../etc/passwd", isNotFound],
    ["RT-034", "Robots rotası erişilebilir", "INFO", "/robots.txt", (r) => r.status === 200 && /User-agent/i.test(r.body)],
    ["RT-035", "Yerel hedef koruması dış hedefi reddeder", "HIGH", "N/A", () => {
      try { assertLocalTarget("https://example.invalid"); return false; } catch { return true; }
    }, "LOCAL"],
    ["RT-036", "BLACKOUT entegrasyon dalında mevcut değil", "INFO", "N/A", () => true, "N/A"],
  ].map(([id, title, risk, path, assert, method = "GET"]) => ({ id, title, risk, path, assert, method }));
}

export async function runLab({ baseUrl, outputFile }) {
  const target = assertLocalTarget(baseUrl);
  const results = [];
  for (const scenario of scenarios()) {
    if (scenario.method === "N/A") {
      results.push({ id: scenario.id, title: scenario.title, risk: scenario.risk, status: "na", expected: "BLACKOUT kodu entegrasyon dalında bulunmadığı için N/A", actual: "Claude dalında ayrı tutuluyor; çalışma ağacı değiştirilmedi." });
      continue;
    }
    if (scenario.method === "LOCAL") {
      const passed = scenario.assert();
      results.push({ id: scenario.id, title: scenario.title, risk: scenario.risk, status: passed ? "passed" : "failed", expected: "Dış hedef reddi", actual: passed ? "Dış hedef isteği gönderilmeden reddedildi" : "Yerel hedef koruması başarısız" });
      continue;
    }
    try {
      const actual = await request(target, scenario);
      const passed = scenario.assert(actual, target);
      results.push({ id: scenario.id, title: scenario.title, risk: scenario.risk, status: passed ? "passed" : "failed", expected: "Güvenli HTTP davranışı", actual: { status: actual.status, location: actual.location, headers: { "cache-control": actual.headers["cache-control"], "content-security-policy": actual.headers["content-security-policy"], "x-frame-options": actual.headers["x-frame-options"] }, bodyPreview: actual.body } });
    } catch (error) {
      results.push({ id: scenario.id, title: scenario.title, risk: scenario.risk, status: "failed", expected: "Güvenli HTTP davranışı", actual: { error: redact(error instanceof Error ? error.message : error) } });
    }
  }
  const summary = Object.fromEntries(["passed", "failed", "na"].map((key) => [key, results.filter((result) => result.status === key).length]));
  const report = { schemaVersion: "1.0", lab: "MKA FORTRESS X — RED TEAM LAB", target: target.origin, generatedAt: new Date().toISOString(), summary, results };
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
