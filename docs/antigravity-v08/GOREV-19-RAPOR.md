# MKA GÖREV 19 — ATATÜRK YAŞAM DENEYİMİ RAPORU

**GÖREV KODU:** MKA-ANTIGRAVITY-19  
**AJAN:** ANTIGRAVITY  
**TARİH:** 24 Ekim 2026  
**DAL:** `feature/antigravity-v08-ataturk-life-experience`  
**BASE:** `feature/antigravity-v08-premium-archive` (PR #38, commit `e00bf32`)  
**DURUM:** TAMAMLANDI / DRAFT PR HAZIR  

---

## 1. Uygulanan Modüller ve Değişiklikler

1. **Semantik İkon Eşlemesi (`web/components/ataturk-experience/TypeBadge.tsx`):**
   - Konuşma (`speech`) kayıt türünün yanlışlıkla kitap (`book`) ikonuna eşlenmesi düzeltildi; doğrudan semantik `Icon name="speech"` eşlemesine geçirildi.
   - Belge (`document`), Fotoğraf (`image`), Olay (`calendar`), Yayın (`book`), Mekân (`place`), Konuşma (`speech`) olmak üzere 6 kayıt türü için eksiksiz ve tutarlı görsel dil sağlandı.

2. **Etkileşim Güvenliği ve Hero Pointer Koruması (`web/components/ataturk-experience/ataturk-experience.module.css`):**
   - Hero bölümündeki dekoratif görsel katmanları (`.heroArt`, `.heroShade`) için `pointer-events: none` eklenerek alttaki etkileşimli bağlantıların ve butonların tıklanabilirliği güvence altına alındı.
   - 320px–1536px responsive akışta taşma koruması pekiştirildi.

3. **Kapsamlı Birim ve Sözleşme Testleri (`web/tests/ataturk-experience.test.mjs`):**
   - Resmi görev sözleşmesi gereğince `[19.001]` ila `[19.010]` test senaryoları eklendi:
     - `[19.001]` `draft` ve `reviewed` kayıtların Atatürk deneyimine sızmadığı, yalnız `published` kayıtların gösterildiği doğrulandı.
     - `[19.002]` `published` etiketinin sahte insan onayına ("uzman onaylı") dönüştürülmediği, "uzman onayı bekliyor" ayrımının korunduğu kanıtlandı.
     - `[19.003]` 1881–1918 erken dönemine yanlış yerleştirme reddedildi; yalnızca bu aralıktaki belgelerin erken yıllara girdiği doğrulandı.
     - `[19.004]` Tarihsiz kayıtlara uydurma yıl atanmadığı, `tarihsiz` periyoduna ayrıldığı doğrulandı.
     - `[19.005]` Tahmini tarihlerin (`certainty: "estimated"`) kullanıcılara dürüstçe uyarı notuyla sunulduğu doğrulandı.
     - `[19.006]` Mekân inşa/kuruluş yılı ile Atatürk'ün yaşam olaylarının kesin biçimde ayrıldığı (`PLACE_DATE_NOTE`) doğrulandı.
     - `[19.007]` Çocukluk ve öğrenim temasında sadece okul binalarının öğrenim kanıtı sayılmadığı kanıtlandı.
     - `[19.008]` Öne çıkan alıntının yalnız kurumsal HTTPS kaynağı ve doğrulanmış metinden geldiği denetlendi.
     - `[19.009]` `/ataturk` istemci bileşenlerinin `node:fs` veya sunucu sırları içermediği doğrulandı.
     - `[19.010]` `TypeBadge` bileşeninin tüm kayıt türlerini doğru semantik ikonlarla eşlediği doğrulandı.

4. **İzole Playwright E2E Doğrulama Altyapısı (`web/playwright.ataturk-v08.config.ts` ve `web/e2e/ataturk-v08.spec.ts`):**
   - Çakışmaları önlemek için müstakil E2E portu (`4430`) üzerinde çalışan Playwright testi oluşturuldu.
   - 9 farklı viewportta (`320x568`, `360x800`, `375x667`, `390x844`, `430x932`, `768x1024`, `1024x768`, `1440x900`, `1536x1024`) sıfır yatay taşma (`scrollWidth <= innerWidth + 2px`), roving tabindex klavye gezinimi, modal ESC/focus iadesi ve dijital sergi filtreleme akışları doğrulandı.

---

## 2. Risk ve Durum Envanteri

| Durum Kodu | Sınıflandırma | Referans / Dosya | Kanıt ve Gerekçe |
|:---|:---|:---|:---|
| **CONFIRMED** | Epistemik Dürüstlük | `ataturk-experience.ts` | Teknik `published` durumu insan uzman onayı gibi sunulmaz; "Kaynak denetimli · uzman onayı bekliyor" notu korunur. |
| **CONFIRMED** | Sıfır Yatay Taşma | `ataturk-v08.spec.ts` | 9 Viewportta (320px .. 1536px) `scrollWidth <= innerWidth + 2px` doğrulandı. |
| **CONFIRMED** | Temsili Görsel Ayrımı | `ExperienceHero.tsx` | Hero kapağında `ataturk-hero-temsili.webp` için "Yapay zekâ destekli temsili Atatürk görseli" ibaresi ve ekran okuyucu uyumu korundu. |
| **CONFIRMED** | Semantik İkon Uyumu | `TypeBadge.tsx` | `speech` kayıt türü `Icon name="speech"` ile eşlendi. |
| **CONFIRMED** | Mekân / Yaşam Tarihi Ayrımı | `ataturk-experience.test.mjs` | Mekân kayıtlarının tarihi Atatürk'ün bizzat bulunduğu tarih olarak yansıtılmaz; özel açıklama notu eklenir. |
| **NEEDS_REVIEW** | İnsan Tarihçi Onayı | Arşiv Koleksiyonu | 151 yayımlanmış kayıt insan uzman incelemesi beklemektedir; sistem bu engeli gizlemez. |
| **NOT_IN_SCOPE** | Arşiv Kayıt JSON'ları | `content/archive/` | Veri kataloglarına dokunulmadı; backend veri doğruluğu ve bütünlüğü korundu. |

---

## 3. Test ve Doğrulama Metrikleri

1. **Playwright E2E Testleri (`web/playwright.ataturk-v08.config.ts`):**
   - **9 Viewport:** `desktop-1536x1024`, `desktop-1440x900`, `tablet-1024x768`, `tablet-768x1024`, `mobile-430x932`, `mobile-390x844`, `mobile-375x667`, `mobile-360x800`, `mobile-320x568`.
   - **Toplam:** **36 test çalıştırıldı, 36'sı başarılı geçti (0 hata)**.
   - Doğrulanan senaryolar: Sıfır yatay taşma (320px..1536px), Hero temsili görsel bildirimi, Yıl rayı roving gezinim, Modal ESC ve odak iadesi, Sergi filtreleme ve boş durum yönetimi.

2. **Birim Testleri (`npm test` in `web/`):**
   - **Toplam:** **76 test çalıştırıldı, 76'sı başarılı geçti (0 hata)**.
   - 10 yeni Task 19 sözleşme testi başarıyla tamamlandı.

3. **Linter & Tip Denetimi (`npm run lint` & `npm run typecheck` in `web/`):**
   - ESLint: Sıfır hata, sıfır uyarı.
   - TypeScript: Sıfır hata.

4. **Next.js Production Build (`npm run build` in `web/`):**
   - Turbopack derlemesi: Sıfır hata.
   - 164 statik rota derlendi (`/ataturk` dahil).

5. **Kök Dizin Arşiv Doğrulaması:**
   - `node scripts/archive/validate.mjs`: Başarılı.
   - `node --test "scripts/archive/tests/*.test.mjs"`: 74 test çalıştırıldı, 74'ü başarılı geçti.

---

## 4. Ekran Görüntüsü Arşivi

- `docs/screenshots/v08-ataturk-desktop-1536x1024.png`
- `docs/screenshots/v08-ataturk-desktop-1440x900.png`
- `docs/screenshots/v08-ataturk-tablet-1024x768.png`
- `docs/screenshots/v08-ataturk-tablet-768x1024.png`
- `docs/screenshots/v08-ataturk-mobile-430x932.png`
- `docs/screenshots/v08-ataturk-mobile-390x844.png`
- `docs/screenshots/v08-ataturk-mobile-375x667.png`
- `docs/screenshots/v08-ataturk-mobile-360x800.png`
- `docs/screenshots/v08-ataturk-mobile-320x568.png`
- `docs/screenshots/v08-ataturk-rail-1536x1024.png`
- `docs/screenshots/v08-ataturk-exhibit-1536x1024.png`
- `docs/screenshots/v08-ataturk-mobile-320x568-detail.png`

---

## 5. Geri Alma (Rollback) Planı

Olası bir geri alma gereksiniminde:
```bash
git checkout feature/antigravity-v08-premium-archive
git branch -D feature/antigravity-v08-ataturk-life-experience
```
İlgili değişiklikler izole edilmiş olup diğer modülleri etkilemez.
