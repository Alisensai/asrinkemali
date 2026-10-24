/**
 * ==============================================================================
 * ASRIN KEMALİ — MKA FORTRESS X V1.1
 * Cloudflare Worker / Edge Middleware PROJECT BLACKOUT Acil Durum Yönlendiricisi
 * ==============================================================================
 * GÜVENLİK SIKILAŞTIRMASI:
 * 1. Durum deposu kesintisinde fail-open NORMAL'e dönülmez; son bilinen doğrulanmış
 *    seviye korunur. İlk başlangıçta kesinti varsa gereksiz tam kapanma (DoS)
 *    yapılmadan WATCH (1) seviyesinde fail-closed hassas koruma devreye girer.
 * 2. Bozuk veya geçersiz durum verileri güvenle reddedilir.
 * 3. /api/health ve /api/ready her koşulda izleme sistemleri için açık tutulur.
 * ==============================================================================
 */

export const BLACKOUT_HTML = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>ASRIN KEMALİ — Güvenlik Modu</title><style>body{background:#0b0f19;color:#f5f5f7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;text-align:center}.card{background:#131a29;border:1px solid rgba(197,160,89,0.3);padding:2.5rem;border-radius:8px;max-width:540px}.gold{color:#c5a059;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase}h1{font-size:1.4rem;margin:1rem 0}p{color:#9aa3b2;font-size:0.95rem;line-height:1.6}</style></head><body><div class="card"><div class="gold">ASRIN KEMALİ</div><div style="font-size:0.8rem;color:#e6ca85;margin:0.5rem 0 1.5rem">BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI</div><h1>Sistem Güvenlik İncelemesinde</h1><p>Veri bütünlüğü güvencesi kapsamında sistemimiz geçici olarak koruma modundadır. Anlayışınız için teşekkür ederiz.</p></div></body></html>`;

// Son bilinen doğrulanmış güvenlik durumu (Bellek içi izolasyon önbelleği)
let lastVerifiedLevel = 0;

/**
 * Durum verisini ayrıştırır ve sınırlar (0, 1, 2, 3)
 */
export function sanitizeBlackoutLevel(rawVal) {
  if (rawVal === null || rawVal === undefined) return null;
  const num = typeof rawVal === "number" ? rawVal : parseInt(String(rawVal).trim(), 10);
  if (Number.isInteger(num) && num >= 0 && num <= 3) {
    return num;
  }
  return null; // Bozuk veya geçersiz
}

/**
 * Depo durumunu güvenle çözer; kesintide son bilinen durumu korur
 */
export async function resolveBlackoutLevel(env) {
  let isDegraded = false;
  try {
    if (env && env.BLACKOUT_KV) {
      const stored = await env.BLACKOUT_KV.get("level");
      const sanitized = sanitizeBlackoutLevel(stored);
      if (sanitized !== null) {
        lastVerifiedLevel = sanitized;
        return { level: sanitized, isDegraded: false };
      } else if (stored !== null) {
        // Değer var ama bozuk
        isDegraded = true;
      }
    } else if (env && env.MKA_BLACKOUT_LEVEL !== undefined) {
      const sanitized = sanitizeBlackoutLevel(env.MKA_BLACKOUT_LEVEL);
      if (sanitized !== null) {
        lastVerifiedLevel = sanitized;
        return { level: sanitized, isDegraded: false };
      }
      isDegraded = true;
    }
  } catch {
    isDegraded = true;
  }

  // Kesinti veya bozuk veri politikası:
  // 1. Son bilinen durum varsa onu koru.
  // 2. Yoksa tüm siteyi gereksiz kapatmadan (self-DoS yapmadan) WATCH (1) seviyesine geç;
  //    böylece kamuya açık okuma sürer ama kritik/hassas yüzeyler kapalı kalır.
  const fallbackLevel = lastVerifiedLevel > 0 ? lastVerifiedLevel : 1;
  return { level: fallbackLevel, isDegraded: true };
}

export async function handleEdgeRequest(request, env, fetchFn = globalThis.fetch) {
  const url = new URL(request.url);

  // 1. Sağlık uç noktaları her zaman izinlidir
  if (url.pathname === "/api/health" || url.pathname === "/api/ready") {
    return fetchFn(request);
  }

  // 2. BLACKOUT Düzeyini Çöz
  const { level, isDegraded } = await resolveBlackoutLevel(env);

  // 3. LOCKDOWN (3): Doğrudan Kenarda Kes ve Statik 503 Ver
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

  // 4. RESTRICTED (2): Dışa aktarma ve araştırma rotalarını kenarda engelle
  if (level === 2) {
    if (url.pathname.startsWith("/api/arastirma") || url.pathname.startsWith("/arastirma-laboratuvari")) {
      return new Response(JSON.stringify({ error: "restricted_mode_active" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // 5. Normal veya Watch Seviyesi: İsteği arka uca aktar
  const response = await fetchFn(request);
  if (isDegraded) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-Fortress-Degraded", "state_store_unreachable");
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
