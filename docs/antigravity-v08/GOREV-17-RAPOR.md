# MKA GÖREV 17 — ANA SAYFA / MOBİL KABUK RAPORU

**GÖREV KODU:** MKA-ANTIGRAVITY-17-HOME-SHELL  
**AJAN:** ANTIGRAVITY  
**TARİH:** 24 Ekim 2026  
**DAL:** `feature/antigravity-v08-home-shell`  
**BASE:** `feature/antigravity-v08-design-system` (PR #30, commit `fbcc9c6`)  
**DURUM:** TAMAMLANDI / DRAFT PR HAZIR  

---

## 1. Uygulanan Modüller ve Değişiklikler

1. **Global Navigasyon ve Deterministik Aktif Durum Yönetimi (`web/components/Navigation.tsx`):**
   - **Deterministik Aktif Link İndeksi:** `computeActiveNavIndex(items, pathname, search)` saf fonksiyonu geliştirildi. Öncelik sırası:
     1. Tam sorgulu eşleşme (örn. `/arsiv?tur=belge` doğrudan Belgeler menü öğesini işaretler).
     2. Tam yol eşleşmesi (örn. `/` yalnızca Ana Sayfa'yı, `/arsiv` tekil Arşiv menü öğesini işaretler).
     3. Alt rota önek eşleşmesi (örn. `/arsiv/1924-anayasasi` detayında yalnızca genel `/arsiv` seçilir; fotoğraf veya belgeler seçilmez).
   - **Tekil `aria-current="page"`:** Eşleşmeyen rotalarda (`-1`) hiçbir linke `aria-current` basılmaz; birden fazla linkin aynı anda aktif görünmesi engellendi.
   - **React 19 Uyumlu Arama Senkronizasyonu:** `window.location.search` tarayıcı durumu `useSyncExternalStore` ile dinlendi; `useEffect` içi `setState` kuralı çiğnenmeden, SSR uyumlu ve render sıçraması olmaksızın sorgu güncellemeleri yakalandı.
   - **Sayfa Değişiminde Otomatik Kapanış:** Kullanıcı bir menü bağlantısına tıkladığında veya rota değiştiğinde mobil çekmece otomatik kapanır.
   - **Klavye Erişilebilirliği ve Focus Trap:** Menü açıkken `Escape` tuşu menüyü kapatır ve odağı menü butonuna iade eder; Tab/Shift+Tab döngüsü açık çekmece içinde tutulur.

2. **Arama Diyaloğu (`web/components/SearchDialog.tsx`):**
   - **Gerçek Form ve Klavye Doğal Davranışı:** Modal içine `<form action="/arsiv" method="get">` ve `<input name="q">` eklendi; kullanıcı Enter'a bastığında doğrudan `/arsiv?q=...` sayfasına yönlenir.
   - **Türkçe Karakter ve Aksan Normalizasyonu:** `normalizeSearchText` fonksiyonu ile Türkçe `İ/i/ı`, `Ğ/ğ`, `Ş/ş`, `Ü/ü`, `Ö/ö`, `Ç/ç` harfleri ve gereksiz boşluklar güvenle temizlenir.
   - **Odak Restorasyonu (Focus Restoration):** Dialog açılmadan önce aktif olan buton referansı (`previousFocusRef`) tutulur; diyalog `Escape` veya kapat butonu ile kapandığında odak tetikleyici butona kesintisiz iade edilir.
   - **A11y Nitelikleri:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` ve `aria-label` tanımlandı.

3. **Hero ve Görsel Kabuk İnce İşçiliği (`web/components/Hero.tsx` & `web/app/globals.css`):**
   - **Pointer-Events İzolasyonu:** `.hero-art` ve `.hero-vignette` katmanlarına hem inline hem de CSS düzeyinde `pointer-events: none` tanımlandı; kahraman Atatürk portresinin veya degrade perdelerinin butonların ve linklerin üzerine binip tıklanmayı engellemesi kesin olarak önlendi.
   - **Defansif Slayt Yedekleme:** Veri gelmemesi veya boş dizi verilmesi durumunda `DEFAULT_SLIDE` devreye girer; tanımsız indeks çökmesi engellendi.
   - **Klavye Kontrolleri:** Hero alanı odaklandığında (`tabIndex={0}`), `ArrowLeft` ve `ArrowRight` tuşlarıyla slaytlar arasında gezinti sağlandı.
   - **Görünür Yapay Zekâ Şeffaflığı:** Slayt görsellerinde "YAPAY ZEKA TEMSİLİ" etiketi hem semantik olarak hem de görsel rozet olarak korundu.

4. **Kısayol ve Vitrin İyileştirmeleri (`web/lib/site-data.ts` & `web/components/home/FeaturedShowcase.tsx`):**
   - **Doğru Arşiv Taksonomisi:** Yayınlar kısayolundaki `/arsiv?tur=kitap` sorgusu arşiv sözleşmesine (`archive-record.types.ts`) uygun şekilde `/arsiv?tur=yayin` olarak düzeltildi.
   - **Epistemik Dürüstlük:** `FeaturedShowcase` üzerindeki yanıltıcı `check` (onaylandı/doğrulandı iması oluşturan) ikonları yerine tarafsız `document` ikonu kullanıldı; insan tarihçi incelemesi yapılmamış kayıtlar yanlış etiketlenmedi.

---

## 2. Risk ve Durum Envanteri

| Durum Kodu | Sınıflandırma | Referans / Dosya | Kanıt ve Gerekçe |
|:---|:---|:---|:---|
| **CONFIRMED** | Tekil Aktif Menü | `Navigation.tsx` & `home-shell.spec.ts` | `/`, `/arsiv`, `/arsiv?tur=belge` ve `/arsiv/[slug]` durumlarında yalnız bir adet `aria-current="page"` üretildiği E2E ve unit testlerle doğrulandı. |
| **CONFIRMED** | Sıfır Yatay Taşma | `home-shell.spec.ts` | 9 Viewportta (320px .. 1536px) ana sayfanın hiçbir öğesi yatay taşma üretmedi (`scrollWidth <= innerWidth + 2px`). |
| **CONFIRMED** | 320px Marka/Buton Çakışmasızlığı | `home-shell.spec.ts` | 320px mobilde `.identity` ile `.masthead-actions` arasında pozitif açıklık (clearance > 0) ölçüldü; elemanlar birbirini ezmiyor. |
| **CONFIRMED** | Odak Restorasyonu | `SearchDialog.tsx` & `home-shell.spec.ts` | Arama modalı kapatıldığında odak doğrudan arama butonuna döndürüldü. |
| **CONFIRMED** | Tıklanabilir Hero Kontrolleri | `Hero.tsx` & `globals.css` | `.hero-art` `pointer-events: none` yapıldı; butonlar ve linkler tıklama olaylarını tam alıyor. |
| **FIXED** | Kısayol Sorgu Hatası | `site-data.ts` | `/arsiv?tur=kitap` -> `/arsiv?tur=yayin` olarak güncellendi. |
| **FIXED** | React 19 Lint Uyarısı | `Navigation.tsx` | `useEffect` içindeki senkron `setState`, `useSyncExternalStore` ile değiştirilerek React 19 kurallarına uyarlandı. |
| **NEEDS_REVIEW** | Arşiv Arama Filtreleri | Görev 18 (Premium Arşiv) | Arama modalından gelen `q` parametresinin filtre çekmecesi ve URL ile tam senkronizasyonu Görev 18'de genişletilecektir. |
| **BLOCKED** | Sahte Tarihçi İkonları | `FeaturedShowcase.tsx` | Sistemde hiçbir vitrin kartına insan onayını ima eden onay ikonu konulamaz; kural korundu. |
| **NOT_IN_SCOPE** | Arşiv JSON Kayıtları | `content/archive/records/` | Arşiv kayıtlarına ve şemalarına dokunulmadı; veri bütünlüğü korundu. |

---

## 3. Test ve Doğrulama Metrikleri

1. **Playwright E2E Testleri (`web/playwright.home-shell.config.ts`):**
   - **9 Viewport:** `desktop-1536x1024`, `desktop-1440x900`, `tablet-1024x768`, `tablet-768x1024`, `mobile-430x932`, `mobile-390x844`, `mobile-375x667`, `mobile-360x800`, `mobile-320x568`.
   - **Toplam:** **54 test çalıştırıldı, 54'ü başarılı geçti (0 hata)**.
   - Doğrulanan senaryolar: Sıfır taşma, 320px başlık çakışmasızlığı, tekil navigasyon `aria-current`, mobil çekmece Tab döngüsü ve Escape, SearchDialog arama ve focus restorasyonu, Hero klavye kontrolleri.

2. **Birim Testleri (`npm test`):**
   - **56/56 test başarılı geçti (0 hata).**
   - `web/tests/home-shell.test.mjs` altındaki 10 yeni test (aktif indeks hesaplaması, arama metni normalizasyonu, form aksiyonu, hero a11y) eksiksiz doğrulandı.

3. **Prodüksiyon Derlemesi (`npm run typecheck && npm run build`):**
   - TypeScript hatasız geçti.
   - 164 rotanın tamamı Turbopack ile statik (SSG/Static) olarak başarıyla derlendi.

4. **Arşiv Doğrulaması (`validate.mjs` ve testler):**
   - 168 arşiv kaydı doğrulandı.
   - 74/74 arşiv testi başarıyla geçti.

5. **Linter Denetimi (`npm run lint`):**
   - 0 hata, 0 uyarı ile temiz tamamlandı.

---

## 4. Ekran Görüntüleri Envanteri

Oluşturulan ekran görüntüleri `docs/screenshots/` dizininde arşivlenmiştir:
- `v08-home-desktop-1536x1024.png`
- `v08-home-desktop-1440x900.png`
- `v08-home-tablet-1024x768.png`
- `v08-home-tablet-768x1024.png`
- `v08-home-mobile-430x932.png`
- `v08-home-mobile-390x844.png`
- `v08-home-mobile-375x667.png`
- `v08-home-mobile-360x800.png`
- `v08-home-mobile-320x568.png`
- `v08-home-hero-slide-2-1536x1024.png` (Hero klavye geçişi)
- `v08-home-menu-open-390x844.png` (Mobil açık çekmece)
- `v08-home-search-dialog-1536x1024.png` (Arama diyaloğu açık)

---

## 5. Devir Notları (Sonraki Görev: GÖREV 18)

- **Temel:** `feature/antigravity-v08-home-shell` dalı, Görev 18 (Premium Dijital Arşiv) için hazır ve test edilmiş temiz bir temel sağlar.
- **Search Entegrasyonu:** `SearchDialog` artık `/arsiv?q=...` rotasına yönlendirmektedir; Görev 18'de arşiv arama sayfası bu `q` sorgusunu yakalayıp filtre paneline bağlayacaktır.
