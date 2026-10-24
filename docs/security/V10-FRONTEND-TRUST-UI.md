# V1.0 arayüz — sahte güven rozetleri, güvenli bağlantı ve sergi tasarımı

- **Dal:** `feature/claude-v10-frontend-trust-ui`
- **Taban:** `fix/claude-v10-backend-security-integration` (PR #66; `safe-url.ts` buradan gelir) + `release/v0.9-final-takeover-release-candidate` (`ec773a4`) birleştirmesi.
- **Tarih:** 2026-10-24.

İnsan onayı sahtelenmedi. Doğrulama kapıları gevşetilmedi. Playwright/e2e, workflow ve backend/güvenlik dosyaları (`lib/security/*`, `lib/publishing/*`, `lib/editorial-trust/*`, `tools/release-check/*`) değiştirilmedi.

## 1. Sahte "DOĞRULANMIŞ KAYNAK" rozeti (SEC-V10-FE-01)

**Bulgu:** `DocumentShowcase`, `ExhibitionSectionRenderer` (2), `ExhibitionTimeline` ve `VirtualGalleryRoom` (2) kaynak inceleme paneline sabit `isVerified: true` geçiriyordu. Sentetik staging sergisi dahil her kaynakta "DOĞRULANMIŞ KAYNAK" görünüyordu. Ayrıca:
- Kaynak panelindeki yeşil rozet, sergi JSON'undaki serbest metni (`verificationBadge: "Doğrulanmış Kurumsal Kaynak"`) gösteriyordu.
- Hero, kayıt içi `editorialReview.status` değerini ("İnceleme: PUBLISHED") basıyordu.
- Küratör adı "Küratöryel İnceleme:" etiketiyle sunuluyordu.

**Düzeltme (veriye dayalı):**
- Güven durumu yalnız `web/lib/exhibitions/source-trust.ts` → `resolveSourceTrust()` ile belirlenir.
  - "verified" yalnız şu üçü birlikteyse döner: editoryal güven katmanı yapılandırılmış (`editorialTrustConfigured()`) + karar deposundan doğrulanmış onay + sergi sentetik/staging değil.
  - Repoda sağlayıcı ve politika `null` olduğu için bugün hiçbir kaynak "verified" olamaz.
- Sentetik sergi: "SENTETİK ÖNİZLEME · DOĞRULANMADI". Staging: "STAGING TASLAĞI · YAYINDA DEĞİL". Diğer durum: "İNCELEME BEKLİYOR".
- `ExhibitionView` güven durumunu bir kez türetir ve hem odaya, liste moduna hem de inceleme paneline geçirir. Bileşenler güveni kendileri belirleyemez.
- Uyarı bandı artık kayıt içi `status` yerine güven durumuna bağlı.
- Hero rozeti güven etiketini gösterir. Küratör alanı "Küratör (kayıt beyanı, onay değildir)" olarak etiketlendi.

## 2. `TextLink` güvenli URL kontrolü (SEC-V10-FE-02)

**Bulgu:** Yasak listesi (`startsWith("javascript:")`), `java\tscript:`, `\x01javascript:` gibi tarayıcının yok saydığı karakterlerle atlatılabiliyordu. Güvensiz adres işlevsiz `#` bağlantısına dönüşüyordu.

**Düzeltme:**
- `isSafeUrl` artık FORTRESS `safeHref`/`isSafeHref` izin listesine devreder (dosya değiştirilmedi).
- Güvensiz adres düz metin olarak gösterilir.
- `//` ile başlayan protokolsüz adresler dış bağlantı sayılmaz (zaten reddedilir).
- Sergi kaynak bağlantıları (`src.sourceUrl`, `SourceInspector`) da `safeHref` üzerinden geçer.

## 3. Sergi gövdesi tasarımı

`VirtualGalleryRoom`, `ExhibitionSectionRenderer`, `DocumentShowcase`, `ExhibitionTimeline`, `ExhibitionCard` ve dizin filtreleri, CSS modülünde tanımlı olmayan yaklaşık 170 sınıf kullanıyordu. Sergi detay gövdesi stilsiz render ediliyordu. Bu sınıflar mevcut MKA token'larıyla `exhibitions.module.css` dosyasına eklendi:
- 44 px dokunma hedefleri
- `focus-visible` halkası
- 960/620 px kırılımları
- `prefers-reduced-motion`

## Testler

`web/tests/v10-frontend-trust.test.mjs` içinde 6 test var. FE-04, FE-05 ve FE-06 düzeltmeler olmadan kırmızıdır.

`tests/exhibitions.test.mjs` içindeki T-26-020 güncellendi: rozetin koşullu olduğunu artık veriye dayalı güven durumu üzerinden doğruluyor.

## Bilinen ve çözülmeyenler

- Staging sergi verisinde "Bu sergideki her bilgi … doğrulanmıştır" gibi içerik beyanları var. Bunlar içerik/editoryal karar konusu ve production'da render edilmiyor (staging 404).
- `design-system.test.mjs` [16.034], var olmayan `TextLink.js`'yi içe aktarmaya çalışıyor ve kendi sahte uygulamasına düşüyor. Bu yüzden gerçek kodu test etmiyor. Gerçek kontrol V10-FE-05'te.
- İnsan onayı 0; kimlik sağlayıcısı yok. `release_ready=false` doğru durum.
