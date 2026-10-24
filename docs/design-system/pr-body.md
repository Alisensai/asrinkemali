## MKA GÖREV DEVİR FORMU — GÖREV 16

- **GÖREV:** MKA-ANTIGRAVITY-16-DESIGN-SYSTEM
- **GITHUB REPO:** https://github.com/Alisensai/asrinkemali
- **BRANCH:** `feature/antigravity-v08-design-system`
- **BASE:** `abd3369a65cecfd07f80f28f0d097478b8e40540` (`feature/antigravity-v06-visual-polish` / PR #23)
- **HEAD:** `fbcc9c62290d93bfb4fabeaf339c905fd04bd37e`
- **DURUM:** DRAFT PR (v0.8 Hazırlık)

---

### 1. Amaç ve Kapsam

Bu PR, **ASRIN KEMALİ** platformunun görsel ve teknik temelini oluşturan **MKA Tasarım Sistemi ve Token Mimarisi**'ni hayata geçirir. `design/ONAYLANAN-TASARIM.webp` (1536×1024) ana referansına dayalı olarak 3 katmanlı CSS token yapısını kurar, erişilebilir ve bağımsız React UI primitiflerini kullanıma sunar ve 9 viewportta (320px–1536px) sıfır yatay taşma garantisi sağlar.

---

### 2. Uygulanan Modüller

1. **Token Mimarisi (`web/styles/mka-tokens.css`):**
   - **Katman 1 (Primitive):** Renkler (`--mka-color-black`, `--mka-color-red-masthead`, `--mka-color-gold`, vb.), 4/8-tabanlı spacing (`--mka-space-1` .. `--mka-space-16`), responsive clamp tipografi skalası (`--mka-text-xs` .. `--mka-text-4xl`), yarıçaplar, gölgeler, z-index ve hareket geçişleri.
   - **Katman 2 (Semantic):** Yüzeyler (`--mka-surface-*`), metinler (`--mka-text-*`), sınırlar (`--mka-border-*`), odak halkası (`--mka-focus-ring`).
   - **Katman 3 (Geriye Uyumluluk):** Mevcut `--gold`, `--cream`, `--red-masthead`, `--night` vb. değişkenler alias'lanarak mevcut CSS modülleri ve sayfaların bozulması engellendi.
   - Yüksek kontrast (`forced-colors: active`) ve azaltılmış hareket (`prefers-reduced-motion`) erişilebilirlik modları.

2. **Erişilebilir UI Primitifleri (`web/components/design-system/`):**
   - `Button`: Birincil bordo, ikincil altın-kontur, ghost, outline; min 44px mobil touch target; aria-busy ve aria-disabled desteği; Next.js Link entegrasyonu.
   - `TextLink`: İç ve dış bağlantı ayrımı; otomatik `rel="noopener noreferrer"`; `isSafeUrl` ile `javascript:` enjeksiyon engellemesi.
   - `Badge`: Dürüst durum rozetleri (`published`, `reviewed`, `unverified`, `ai`). Teknik katalog durumunu insan tarihçi onayı gibi göstermez.
   - `StatusNote`: Editoryal notlar, arşiv disclaimers ve AI şeffaflık panelleri (`role="note"`).
   - `MuseumPlaque`: Görseli bulunmayan kayıtlar için sahte görsel üretmeyen tipografik müze künyesi.
   - `Surface`: Seviye 0–3 elevasyon, altın bordür ve kontrollü yansıma.
   - `Divider`: Altın degrade bordür ve isteğe bağlı merkez `✦` rozet motifi.
   - `FormField`, `Input`, `Select`: Erişilebilir form alanları (`htmlFor`, `aria-describedby`, `aria-invalid`, `role="alert"`).
   - `Breadcrumb`: `nav aria-label` ve `aria-current="page"` destekli ekmek kırıntısı navigasyonu.
   - `EmptyState`: Boş koleksiyonlarda uydurma içerik üretmeyen, dürüst ve eyleme yönlendiren boş durum bileşeni.
   - `design-system.module.css`: Modüler scoped stiller.
   - `index.ts`: Barrel export.

3. **Dokümantasyon & QA Sözleşmeleri (`docs/design-system/`):**
   - `reference-map.md`: `design/ONAYLANAN-TASARIM.webp` referansının 1536×1024 bölge, token ve kontrast cetveli.
   - `API.md`: Primitif bileşen props ve kullanım sözleşmesi.
   - `qa-manifest.json`: Makine tarafından okunabilir devir manifestosu.
   - `docs/antigravity-v08/GOREV-16-RAPOR.md`: Detaylı görev raporu.

4. **Katalog Armatürü (`web/app/tasarim-sistemi/`):**
   - Tüm primitiflerin test edildiği, arama motorlarına kapalı (`noindex, nofollow`) geliştirici ve regresyon armatürü.

5. **Kontrollü Entegrasyon:**
   - `web/app/arsiv/page.tsx`: Boş arama durumunda `EmptyState` tüketimi.
   - `web/app/globals.css`: `mka-tokens.css` içe aktarımı.

---

### 3. Test ve Doğrulama Sonuçları

- **Design System Unit Tests (`web/tests/design-system.test.mjs`):** 46/46 PASS (0 fail, 0 skipped, 394ms)
- **TypeScript Typecheck (`npm run typecheck`):** PASS (0 error, `tsc --noEmit`)
- **ESLint (`npm run lint`):** PASS (0 error, 0 warning)
- **Playwright 9 Viewport E2E Suite (`web/e2e/design-system.spec.ts`):** 27/27 PASS
  - Viewportlar: 1536×1024, 1440×900, 1024×768, 768×1024, 430×932, 390×844, 375×667, 360×800, 320×568
  - Sıfır yatay taşma (`scrollWidth <= innerWidth + 2px`) doğrulandı.
- **Next.js Production Build (`npm run build`):** PASS (164/164 rota derlendi)
- **Archive Validation & Root Tests:** PASS (74/74 test geçti, 168 kayıt doğrulandı)

---

### 4. Ekran Görüntüsü Kanıtları (`docs/screenshots/`)

- `v08-16-design-system-desktop-1536x1024.png`
- `v08-16-design-system-desktop-1440x900.png`
- `v08-16-design-system-tablet-1024x768.png`
- `v08-16-design-system-tablet-768x1024.png`
- `v08-16-design-system-mobile-430x932.png`
- `v08-16-design-system-mobile-390x844.png`
- `v08-16-design-system-mobile-375x667.png`
- `v08-16-design-system-mobile-360x800.png`
- `v08-16-design-system-mobile-320x568.png`

---

### 5. Editoryal ve Güvenlik Uyumu

- **İnsan Onayı Ayrımı:** Teknik `published` statüsü editoryal onay gibi sunulmaz; sahte yeşil onay rozeti üretilmez.
- **Görsel Hakları & Provenans:** Medyası olmayan kayıtlar için sahte görsel üretilmez, `MuseumPlaque` tipografik künyesi sunulur.
- **XSS Koruması:** `TextLink` bileşeninde `isSafeUrl` ile `javascript:` URL şemaları engellenir.
- **SSR/RSC Güvenliği:** Primitifler istemci paketine `node:fs` veya gizli anahtar taşımaz.
- **Backend Bütünlüğü:** `lib/archive.ts`, `lib/publishing/*`, `proxy.ts`, CSP yapılandırmaları korunmuştur.
