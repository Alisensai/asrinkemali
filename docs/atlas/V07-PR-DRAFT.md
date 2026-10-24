# Draft PR açıklaması (GitHub'a gönderilmedi)

**Başlık:** `feat(atlas): V0.7 MKA Atlas 2.0 — şehir, zaman ve kaynaklı keşif`

**Hedef:** `integration/asrinkemali-v06-release-candidate`

**Kaynak:** `feature/gemini-v07-atlas-2`

### Amaç
Yayın kapısından geçen arşiv kayıtlarını harita şeması, erişilebilir şehir listesi, tarih aralığı, kaynak kurumu, kişi, kategori, açık katalog bağlantıları ve şehir kapsamı karşılaştırması ile keşfedilebilir kılmak.

### Dosyalar
- `web/app/atlas/page.tsx`
- `web/components/atlas/AtlasExplorer.tsx`, `AtlasMap.tsx`, `AtlasTimeline.tsx`, `atlas.module.css`
- `web/lib/atlas/model.ts`, `adapters.ts`
- `web/tests/atlas.test.mjs`
- `web/e2e/atlas.spec.ts`
- `docs/atlas/*`

### Çalıştırılan testler
Yerel Node 22.16 ile `node --test web/tests/atlas.test.mjs`: **31/31 geçti**. Saf veri modülünde strict `tsc`, TS/TSX sözdizimi kontrolü ve CSS parse testi geçti. Tam Next.js `npm ci`, lint, typecheck, build, Playwright E2E ve gerçek 168 kayıt uçtan uca testi **çalıştırılamadı**.

### Ekran görüntüleri
**Henüz yok.** Playwright testindeki ekran görüntüsü komutları 320, 360, 390, 430, 768, 1024, 1440, 1536 px çözünürlüklerini kapsar; yalnız E2E koşulduğunda gerçek görüntü üretir.

### İçerik ve coğrafya uyarıları
SVG yalnız şehir-seçim şemasıdır; kesin konum veya gerçek tarihî olay koordinatı değildir. Published insan onayı değildir. Tarih türleri ayrılmıştır. Kaynaklar ve ilişki kenarları katalog verisiyle sınırlıdır.

### Bloke edici teknik hususlar
GitHub 403 yazma reddi ve konteynerden GitHub'a DNS erişimsizliği; gerçek Next.js bağımlılıklarının bulunmaması. Bu kısıtlar kaldırılıp CI/E2E sağlıklı çalıştırılmadan PR Ready yapılmamalıdır.
