import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "./lib/security/access-contract";
import { blackoutRouteDecision } from "./lib/security/blackout/access";
import { BLACKOUT_DENY_BODY, blackoutGate } from "./lib/security/blackout/proxy-guard";

/**
 * MKA FORTRESS kapalı-başarısız erişim katmanı (kararlar `lib/security/access-contract.ts` içinde).
 * Ortam değişkeni yokken yalnız yönetim rotalarını (404) etkiler; normal sayfalar değişmeden geçer.
 *
 * PROJECT BLACKOUT, FORTRESS kararından SONRA ek kısıt uygulayabilir (asla gevşetmez). Kayıtlı
 * paylaşılan durum deposu yokken etkin düzey NORMAL'dir ve davranış değişmez (lib/security/blackout).
 */
export async function proxy(request: NextRequest) {
  const decision = decideAccess(request.nextUrl.pathname, request.headers.get("authorization"), process.env);
  if (decision.action === "allow") {
    let blackout;
    try {
      blackout = (await blackoutGate({ method: request.method, pathname: request.nextUrl.pathname })).decision;
    } catch {
      // Beklenmeyen hata: fail-closed (hassas yüzeyler kapalı, herkese açık okuma sürer).
      blackout = blackoutRouteDecision(0, { method: request.method, pathname: request.nextUrl.pathname }, { degraded: true });
    }
    if (blackout.action === "deny") {
      return new NextResponse(BLACKOUT_DENY_BODY, { status: blackout.status, headers: { "Content-Type": "text/plain; charset=utf-8", ...blackout.headers, ...decision.headers } });
    }
    if (!decision.headers) return NextResponse.next();
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(decision.headers)) response.headers.set(key, value);
    return response;
  }
  const body = decision.status === 404 ? "Sayfa bulunamadı." : decision.status === 401 ? "Kimlik doğrulama gerekli." : "Hizmet erişim denetimi yapılandırılmamış.";
  return new NextResponse(body, { status: decision.status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...decision.headers } });
}

export const config = {
  // Statik derleme çıktıları ve görseller hariç tutulur (yetkilendirme betik/stil yüklemeyi bozmasın).
  matcher: ["/((?!_next/static|_next/image|assets/|favicon.ico).*)"],
};
