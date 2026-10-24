/**
 * ==============================================================================
 * ASRIN KEMALİ — MKA FORTRESS X V1.1
 * Cloudflare Worker / Edge Middleware PROJECT BLACKOUT Acil Durum Yönlendiricisi
 * ==============================================================================
 * Bu kenar betiği, LOCKDOWN acil durumunda tüm trafiği kaynak sunucuya ulaştırmadan
 * doğrudan kenarda karşılar ve statik blackout sayfasını döner.
 * ==============================================================================
 */

// Statik acil durum yanıtı için HTML içeriği (Derleme sırasında gömülür)
const BLACKOUT_HTML = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>ASRIN KEMALİ — Güvenlik Modu</title><style>body{background:#0b0f19;color:#f5f5f7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;text-align:center}.card{background:#131a29;border:1px solid rgba(197,160,89,0.3);padding:2.5rem;border-radius:8px;max-width:540px}.gold{color:#c5a059;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase}h1{font-size:1.4rem;margin:1rem 0}p{color:#9aa3b2;font-size:0.95rem;line-height:1.6}</style></head><body><div class="card"><div class="gold">ASRIN KEMALİ</div><div style="font-size:0.8rem;color:#e6ca85;margin:0.5rem 0 1.5rem">BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI</div><h1>Sistem Güvenlik İncelemesinde</h1><p>Veri bütünlüğü güvencesi kapsamında sistemimiz geçici olarak koruma modundadır. Anlayışınız için teşekkür ederiz.</p></div></body></html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Sağlık uç noktaları her zaman izinlidir (SLA denetleyicileri ve altyapı monitörleri için)
    if (url.pathname === "/api/health" || url.pathname === "/api/ready") {
      return fetch(request);
    }

    // 2. BLACKOUT Durumunu Kenar KV veya Ortam Değişkeninden Oku
    // Seviyeler: 0=NORMAL, 1=WATCH, 2=RESTRICTED, 3=LOCKDOWN
    let blackoutLevel = 0;
    try {
      if (env && env.BLACKOUT_KV) {
        const stored = await env.BLACKOUT_KV.get("level");
        blackoutLevel = stored ? parseInt(stored, 10) : 0;
      } else if (env && env.MKA_BLACKOUT_LEVEL) {
        blackoutLevel = parseInt(env.MKA_BLACKOUT_LEVEL, 10);
      }
    } catch {
      blackoutLevel = 0; // Hata durumunda fail-safe NORMAL
    }

    // 3. LOCKDOWN Seviyesi: Doğrudan Kenarda Kes ve Statik 503 Doldur
    if (blackoutLevel === 3) {
      return new Response(BLACKOUT_HTML, {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Retry-After": "300",
          "X-Fortress-State": "LOCKDOWN"
        }
      });
    }

    // 4. RESTRICTED Seviyesi: Dışa aktarma ve araştırma rotalarını kenarda 404/403 ile sınırla
    if (blackoutLevel === 2) {
      if (url.pathname.startsWith("/api/arastirma") || url.pathname.startsWith("/arastirma-laboratuvari")) {
        return new Response(JSON.stringify({ error: "restricted_mode_active" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 5. Normal Akış: Kaynak sunucuya aktar
    return fetch(request);
  }
};
