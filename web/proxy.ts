import { NextResponse, type NextRequest } from "next/server";
import { decideAccess } from "./lib/security/access-contract";

/**
 * MKA FORTRESS kapalı-başarısız erişim katmanı (kararlar `lib/security/access-contract.ts` içinde).
 * Ortam değişkeni yokken yalnız yönetim rotalarını (404) etkiler; normal sayfalar değişmeden geçer.
 */
export function proxy(request: NextRequest) {
  const decision = decideAccess(request.nextUrl.pathname, request.headers.get("authorization"), process.env);
  if (decision.action === "allow") {
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
