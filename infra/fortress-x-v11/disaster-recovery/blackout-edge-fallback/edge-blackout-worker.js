/**
 * ==============================================================================
 * ASRIN KEMALİ — MKA FORTRESS X V1.1
 * Cloudflare Worker / Edge Middleware PROJECT BLACKOUT Acil Durum Yönlendiricisi
 * ==============================================================================
 * GÜVENLİK SIKILAŞTIRMASI (V1.1 Görev 10):
 * 1. Gevşek tam sayı ayrıştırması kaldırıldı. Bozuk string ("2admin", "0foo", "1.99"),
 *    negatif sayılar, float, dizi ve nesne değerleri kesin olarak reddedilir.
 * 2. Yalnızca katı tam sayı 0, 1, 2, 3 seviyeleri kabul edilir.
 * 3. Çok PoP'lu / sunucusuz ortamlarda süreç belleğinin (isolate memory) dağıtık
 *    olmadığı kabul edilir; kalıcı ve tutarlı durum için dağıtık KV şartı belgelenmiştir.
 * 4. Depo kesintisinde tüm siteyi kapatıp kendi kendine DoS üretmeden WATCH (1)
 *    seviyesinde fail-closed güvenlik devreye girer.
 * ==============================================================================
 */

export const BLACKOUT_HTML = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>ASRIN KEMALİ — Güvenlik Modu</title><style>body{background:#0b0f19;color:#f5f5f7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;text-align:center}.card{background:#131a29;border:1px solid rgba(197,160,89,0.3);padding:2.5rem;border-radius:8px;max-width:540px}.gold{color:#c5a059;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase}h1{font-size:1.4rem;margin:1rem 0}p{color:#9aa3b2;font-size:0.95rem;line-height:1.6}</style></head><body><div class="card"><div class="gold">ASRIN KEMALİ</div><div style="font-size:0.8rem;color:#e6ca85;margin:0.5rem 0 1.5rem">BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI</div><h1>Sistem Güvenlik İncelemesinde</h1><p>Veri bütünlüğü güvencesi kapsamında sistemimiz geçici olarak koruma modundadır. Anlayışınız için teşekkür ederiz.</p></div></body></html>`;

// Süreç-içi yerel izolasyon önbelleği (NOT: 300+ PoP arasında dağıtık değildir; geçici tampon)
let isolateLastVerifiedLevel = 0;

/**
 * Durum verisini kesin ve katı şekilde doğrular.
 * Gevşek fonksiyon çağrıları KULLANILMAZ. Yalnızca 0, 1, 2, 3 tam sayıları veya tam karşılığı string'ler kabul edilir.
 */
export function sanitizeBlackoutLevel(rawVal) {
  if (rawVal === null || rawVal === undefined) return null;

  // Sayı tipi kontrolü
  if (typeof rawVal === "number") {
    return Number.isInteger(rawVal) && rawVal >= 0 && rawVal <= 3 ? rawVal : null;
  }

  // Dize tipi kontrolü (Tam olarak tek bir rakam olmalı: '0', '1', '2', '3')
  if (typeof rawVal === "string") {
    const trimmed = rawVal.trim();
    if (/^[0-3]$/.test(trimmed)) {
      return Number(trimmed);
    }
    return null;
  }

  // Boolean, dizi, nesne vb. tüm diğer tipler geçersizdir
  return null;
}

/**
 * Dağıtık depodan BLACKOUT durumunu okur ve doğrular.
 * Depo kesintisinde:
 * - İzolatın son doğrulanmış durumu varsa onu kullanır.
 * - Yoksa tüm siteyi gereksiz kapatıp DoS yaratmamak için WATCH (1) seviyesini seçer.
 */
export async function resolveBlackoutLevel(env) {
  let isDegraded = false;

  try {
    if (env && env.BLACKOUT_KV) {
      const stored = await env.BLACKOUT_KV.get("level");
      const sanitized = sanitizeBlackoutLevel(stored);
      if (sanitized !== null) {
        isolateLastVerifiedLevel = sanitized;
        return { level: sanitized, isDegraded: false };
      } else if (stored !== null && stored !== undefined) {
        // Depoda veri var ama biçimi bozuk
        isDegraded = true;
      }
    } else if (env && env.MKA_BLACKOUT_LEVEL !== undefined) {
      const sanitized = sanitizeBlackoutLevel(env.MKA_BLACKOUT_LEVEL);
      if (sanitized !== null) {
        isolateLastVerifiedLevel = sanitized;
        return { level: sanitized, isDegraded: false };
      }
      isDegraded = true;
    }
  } catch {
    isDegraded = true;
  }

  // Kesinti veya bozuk veri politikası:
  // 1. Son bilinen durum geçerliyse koru.
  // 2. Yoksa WATCH (1) seviyesine geç (fail-closed hassas yüzeyler, açık kamu arşivi).
  const fallbackLevel = isolateLastVerifiedLevel > 0 ? isolateLastVerifiedLevel : 1;
  return { level: fallbackLevel, isDegraded: true };
}

/**
 * Kenar isteğini BLACKOUT seviyesine göre yönlendirir.
 */
export async function handleEdgeRequest(request, env, fetchFn = globalThis.fetch) {
  const url = new URL(request.url);

  // 1. Sağlık uç noktaları izleme sistemleri için her zaman doğrudan izinlidir
  if (url.pathname === "/api/health" || url.pathname === "/api/ready") {
    return fetchFn(request);
  }

  // 2. Seviyeyi Çöz
  const { level, isDegraded } = await resolveBlackoutLevel(env);

  // 3. Seviye 3 (LOCKDOWN): Kenarda kes, statik 503 blackout sayfasını dön
  if (level === 3) {
    return new Response(BLACKOUT_HTML, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Retry-After": "300",
        "X-Fortress-State": "LOCKDOWN",
        ...(isDegraded ? { "X-Fortress-Degraded": "state_store_unreachable" } : {})
      }
    });
  }

  // 4. Seviye 2 (RESTRICTED): Salt-okunur güvenli mod.
  // Araştırma laboratuvarı ve dışa aktarım uç noktaları kenarda 403 ile kesilir.
  if (level === 2) {
    if (url.pathname.startsWith("/api/arastirma") || url.pathname.startsWith("/arastirma-laboratuvari")) {
      return new Response(JSON.stringify({ error: "restricted_mode_active" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      });
    }
  }

  // 5. Seviye 1 (WATCH) veya Seviye 0 (NORMAL): Kaynak sunucuya aktar
  const response = await fetchFn(request);
  if (isDegraded || level === 1) {
    const newHeaders = new Headers(response.headers);
    if (isDegraded) {
      newHeaders.set("X-Fortress-Degraded", "state_store_unreachable");
    }
    if (level === 1) {
      newHeaders.set("X-Fortress-State", "WATCH");
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }

  return response;
}

export default {
  fetch(request, env, ctx) {
    return handleEdgeRequest(request, env);
  }
};
