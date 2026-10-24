/**
 * MKA FORTRESS — bağlantı (href) güvenliği, izin listesi yaklaşımı.
 *
 * V1.0 denetimi: `startsWith("javascript:")` gibi yasak listeleri atlatılabilir; tarayıcılar
 * şemadaki ASCII sekme/satır sonlarını ve baştaki C0 kontrol karakterlerini yok sayar
 * (`java\tscript:alert(1)` hâlâ çalışır). Burada yalnız şunlar kabul edilir:
 *  - site içi göreli yol: tek `/` ile başlayan (`//` protokolsüz harici adres değil),
 *  - kullanıcı bilgisi içermeyen `http:` / `https:` mutlak adres.
 */

const C0_OR_SPACE = /[\u0000- \u007f]/g;

export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(C0_OR_SPACE, "");
  if (cleaned.length === 0 || cleaned.length > 2048) return null;
  if (cleaned.startsWith("/") && !cleaned.startsWith("//") && !cleaned.startsWith("/\\")) {
    return raw.trim();
  }
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function isSafeHref(raw: unknown): boolean {
  return safeHref(raw) !== null;
}
