## MKA GÖREV DEVİR FORMU — GÖREV 17

- **GÖREV:** MKA-ANTIGRAVITY-17-HOME-SHELL
- **GITHUB REPO:** https://github.com/Alisensai/asrinkemali
- **BRANCH:** `feature/antigravity-v08-home-shell`
- **BASE:** `feature/antigravity-v08-design-system` (PR #30, commit `fbcc9c6`)
- **DURUM:** DRAFT PR (v0.8 Hazırlık)

---

### 1. Amaç ve Kapsam

Bu PR, **ASRIN KEMALİ** platformunun ana sayfa deneyimi, global navigasyonu ve mobil kabuk ince işçiliğini mükemmelleştirir.
Claude ve önceki sürümlerde tespit edilen mobil marka-buton çakışması, navigasyondaki çoklu aktif link durumu, arama diyaloğu klavye entegrasyonu ve Hero alanı tıklama engellerini çözer.

---

### 2. Uygulanan Modüller

1. **Global Navigasyon (`web/components/Navigation.tsx`):**
   - Deterministik aktif indeks algoritması (`computeActiveNavIndex`): tam sorgu eşleşmesi, tam rota eşleşmesi ve alt-rota önek eşleşmesi hiyerarşisiyle tekil `aria-current="page"` basımı sağlandı.
   - React 19 `useSyncExternalStore` ile URL query senkronizasyonu; SSR uyumu ve zero cascading render.
   - Sayfa geçişinde mobil menünün otomatik kapanması.
   - `Escape` tuşu ve Tab döngüsü (focus trap) ile mobil menü a11y yönetimi.

2. **Arama Diyaloğu (`web/components/SearchDialog.tsx`):**
   - `<form action="/arsiv" method="get">` ve `<input name="q">` ile gerçek yönlendirme ve arama butonu.
   - Türkçe karakter (`İ/i/ı`, `Ğ/ğ`, `Ş/ş`, `Ü/ü`, `Ö/ö`, `Ç/ç`) normalizasyonu (`normalizeSearchText`).
   - Diyalog kapandığında odağın açılış butonuna iadesi (`previousFocusRef`).

3. **Hero & Görsel Kabuk (`web/components/Hero.tsx` & `web/app/globals.css`):**
   - `.hero-art` ve `.hero-vignette` katmanlarına `pointer-events: none` verilerek tıklanabilirlik engelleri giderildi.
   - Veri gecikmesi veya boş dizi riskine karşı `DEFAULT_SLIDE` defansif koruma.
   - `ArrowLeft` ve `ArrowRight` tuşlarıyla slayt geçişi ve odaklanabilir klavye kabuğu (`tabIndex={0}`).
   - Yapay zekâ temsili rozet ve etiketinin korunması.

4. **Kısayol ve Vitrin İyileştirmeleri (`web/lib/site-data.ts` & `web/components/home/FeaturedShowcase.tsx`):**
   - Yayınlar kısayolundaki hatalı `/arsiv?tur=kitap` sorgusu arşiv taksonomisine uygun `/arsiv?tur=yayin` olarak güncellendi.
   - Vitrin kartlarındaki yanıltıcı `check` onay ikonları tarafsız `document` ikonu ile değiştirildi.

---

### 3. Test ve Doğrulama Sonuçları

- **Playwright E2E:** 54/54 test başarılı (9 viewport: 320px–1536px, sıfır yatay taşma, clearance > 0).
- **Unit Testler:** 56/56 test başarılı (`web/tests/*.test.mjs`, 10 yeni test).
- **Next.js Turbopack Build:** 164 sayfanın tamamı statik olarak derlendi.
- **Arşiv Doğrulaması:** 168 kayıt geçerli, 74/74 test başarılı.
- **ESLint:** 0 hata, 0 uyarı.

---

### 4. Ekran Görüntüleri

Tüm ekran görüntüleri `docs/screenshots/` dizininde mevcuttur:
- `v08-home-desktop-1536x1024.png`
- `v08-home-desktop-1440x900.png`
- `v08-home-tablet-1024x768.png`
- `v08-home-tablet-768x1024.png`
- `v08-home-mobile-430x932.png`
- `v08-home-mobile-390x844.png`
- `v08-home-mobile-375x667.png`
- `v08-home-mobile-360x800.png`
- `v08-home-mobile-320x568.png`
- `v08-home-hero-slide-2-1536x1024.png`
- `v08-home-menu-open-390x844.png`
- `v08-home-search-dialog-1536x1024.png`
