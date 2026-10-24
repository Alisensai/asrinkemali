# MKA GÖREV 20 — KİMİ TARİHÎ DÖNEMLER VE KRONOLOJİ KEŞFİ RAPORU

**GÖREV KODU:** MKA-ANTIGRAVITY-20  
**AJAN:** ANTIGRAVITY  
**TARİH:** 24 Ekim 2026  
**DAL:** `feature/antigravity-v08-kimi-periods`  
**BASE:** `feature/antigravity-v08-ataturk-life-experience` (PR #40, commit `c5110d0`)  
**DURUM:** TAMAMLANDI / DRAFT PR HAZIR  

---

## 1. Uygulanan Modüller ve Değişiklikler

Kimi tarafından metin içinde tasarlanan 12 kod dosyası ayrıştırılmış, Next.js 15 App Router mimarisine entegre edilmiş, tespit edilen kritik çalışma zamanı ve platform uyumsuzlukları giderilmiştir:

1. **Saf Motor (`web/lib/historical-periods/core.mjs`):**
   - 8 tarihî dönemi (`ilk-yillar-ve-egitim`, `osmanlinin-son-donemi`, `milli-mucadele`, `tbmm-kurulusu`, `cumhuriyetin-ilk-yillari`, `reformlar-ve-kurumsal-donusum`, `1930lu-yillar`, `ataturk-sonrasi-tarihi-miras`) çakışmasız ISO sınırlarıyla tanımlar.
   - **Kritik Düzeltme (Tarih Sınırı Ataması):** Kimi taslağındaki `recordYearBounds` üzerinden yalnız 4 haneli yıl kıyaslaması yapan mantık, 1919 (Samsun - 19 Mayıs 1919) ve 1923 (Cumhuriyet ilanı - 29 Ekim 1923) gibi yıl içi bölünmelerde kaydı yanlış döneme atıyordu. ISO gün hassasiyetiyle (`normalized >= period.start && (!period.end || normalized <= period.end)`) çalışan deterministik gün karşılaştırmasına geçirildi.
   - **Kritik Düzeltme (Bellek ve Çağrı Yığını Tavanı):** 10.000+ kayıtlık büyük koleksiyonlarda `Math.min(...years)` argüman patlaması (stack overflow) riskini önlemek için iteratif min/max döngüsüne geçildi.
   - `comparePeriods` fonksiyonunda nedensellik reddi bildirimi (`causalityNote`) nesnel sayım olarak korundu.

2. **Tip Köprüsü (`web/lib/historical-periods/core.d.ts`):**
   - `HistoricalPeriod`, `PeriodSummary`, `PeriodComparison` ve `parsePeriodParams` dönüş tipleri eksiksiz tanımlandı.
   - `moduleResolution: "bundler"` altında `.mjs` modülünün TypeScript derleyicisi tarafından sorunsuz çözümlenmesi sağlandı.

3. **Sunucu Adaptörü (`web/lib/historical-periods/index.ts`):**
   - `import "server-only"` ile sunucu katmanına kilitlendi; tarayıcı bundle'ına FS veya sunucu bağımlılığı sızdırılması engellendi.
   - `getPeriodOverview`, `getPeriodDetail` ve `getPeriodComparison` fonksiyonları saf motor üzerinden `getPublishedArchiveRecords()` verisini dönüştürür.

4. **Kullanıcı Arayüzü Bileşenleri (`web/components/periods/`):**
   - `PeriodStrip.tsx`: WAI-ARIA uyumlu tablist ve roving/tab gezinimi sağlayan yatay kaydırmalı dönem şeridi.
   - `PeriodRecordCard.tsx`: Arşiv detayına (`/arsiv/[slug]`) güvenli bağlantı, semantik tür rozeti ve dürüst inceleme durumu etiketi (`reviewLabel`).
   - `PeriodEmptyState.tsx`: Arşivde kaydı bulunmayan dönemler için uydurma içerik üretmeyen dürüst boş durum.
   - `PeriodComparePicker.tsx`: İstemci tarafında (`"use client"`) en fazla 2 dönemin seçilmesini sağlayan erişilebilir form ve yönlendirme.
   - `PeriodCompareTable.tsx`: İki dönemin tür, kategori, kurum, kişi, şehir ve yıl aralığı bazında nesnel sayım tablosu ve nedensellik uyarısı.

5. **Dönemler Sayfası (`web/app/donemler/page.tsx`):**
   - Next.js 15 `searchParams: Promise<SearchParams>` yapısına tam uyumlu.
   - `ContentPage` şablonuyla entegre.
   - "Kaynak denetimli · uzman onayı bekliyor" notuyla epistemik dürüstlük korundu.

6. **Stil Katmanı (`web/app/donemler/donemler.module.css`):**
   - MKA bordo (`#6e1423`), altın (`#c9a227`) ve siyah (`#14100f`) renk kimliği.
   - 320px–1536px responsive tasarım, CSS scroll-snap ve 320px ekranlar için özel tek sütun sarmalama kuralı.

---

## 2. Risk ve Durum Envanteri

| Durum Kodu | Sınıflandırma | Referans / Dosya | Kanıt ve Gerekçe |
|:---|:---|:---|:---|
| **CONFIRMED** | Epistemik Dürüstlük | `donemler/page.tsx` & `PeriodCompareTable.tsx` | Dönem karşılaştırması nesnel sayımla sınırlıdır; tarihsel nedensellik iddiası reddedilir (`causalityNote`). |
| **CONFIRMED** | Sıfır Yatay Taşma | `historical-periods.spec.ts` | 9 Viewportta (320px .. 1536px) `scrollWidth <= innerWidth + 2px` doğrulandı. |
| **CONFIRMED** | Gün Hassasiyeti | `core.mjs` | Samsun 19 Mayıs 1919 Millî Mücadele'ye, 29 Ekim 1923 Cumhuriyetin İlk Yılları'na doğru atanır. |
| **CONFIRMED** | 10.000 Kayıt Ölçeklenebilirliği | `historical-periods.test.mjs` `[20.005]` | İteratif min/max ile 10.000 sentetik kayıtta çağrı yığını patlaması yaşanmaz. |
| **FIXED** | Windows ESM URL Şeması | `historical-periods.test.mjs` | `pathToFileURL` kullanılarak `ERR_UNSUPPORTED_ESM_URL_SCHEME` hatası giderildi. |
| **FIXED** | TypeScript Modül Çözümleme | `index.ts` | `./core.mjs` yerine `./core` içe aktarımı ile `core.d.ts` bağlandı. |
| **FIXED** | Playwright Strict Mode | `historical-periods.spec.ts` | Çoklu `role="status"` ve `getByText` elemanları filtrelenerek strict mode ihlalleri çözüldü. |
| **NEEDS_REVIEW** | İnsan Tarihçi Onayı | Arşiv Koleksiyonu | 151 yayımlanmış kayıt insan uzman incelemesi beklemektedir; sistem bu engeli gizlemez. |

---

## 3. Test ve Doğrulama Metrikleri

1. **Playwright E2E Testleri (`web/playwright.periods-v08.config.ts`):**
   - **9 Viewport:** `desktop-1536x1024`, `desktop-1440x900`, `tablet-1024x768`, `tablet-768x1024`, `mobile-430x932`, `mobile-390x844`, `mobile-375x667`, `mobile-360x800`, `mobile-320x568`.
   - **Toplam:** **54 test çalıştırıldı, 54'ü başarılı geçti (0 hata)**.
   - Doğrulanan senaryolar: Sıfır yatay taşma (320px..1536px), 8 dönem şeridi, dönem detay kartları ve künyesi, iki dönem karşılaştırması ve nedensellik uyarısı, geçersiz parametre uyarıları, klavye ile gezinim.

2. **Birim Testleri (`npm test` in `web/`):**
   - **Toplam:** **99 test çalıştırıldı, 99'u başarılı geçti (0 hata)**.
   - Kimi'nin 11 temel testi + 12 yeni Task 20 sözleşme testi (`[20.001]`..`[20.012]`) başarıyla tamamlandı.

3. **Linter & Tip Denetimi (`npm run lint` & `npm run typecheck` in `web/`):**
   - ESLint: Sıfır hata, sıfır uyarı.
   - TypeScript: Sıfır hata (`tsc --noEmit`).

4. **Next.js Production Build (`npm run build` in `web/`):**
   - Turbopack derlemesi: Sıfır hata.
   - 165 rota başarıyla derlendi (`/donemler` dinamik server-rendered rota olarak hazır).

5. **Kök Dizin Arşiv Doğrulaması:**
   - `node scripts/archive/validate.mjs`: Başarılı.
   - `node --test "scripts/archive/tests/*.test.mjs"`: 74 test çalıştırıldı, 74'ü başarılı geçti.

---

## 4. Ekran Görüntüsü Arşivi

- `docs/screenshots/v08-periods-desktop-1536x1024.png`
- `docs/screenshots/v08-periods-desktop-1440x900.png`
- `docs/screenshots/v08-periods-tablet-1024x768.png`
- `docs/screenshots/v08-periods-tablet-768x1024.png`
- `docs/screenshots/v08-periods-mobile-430x932.png`
- `docs/screenshots/v08-periods-mobile-390x844.png`
- `docs/screenshots/v08-periods-mobile-375x667.png`
- `docs/screenshots/v08-periods-mobile-360x800.png`
- `docs/screenshots/v08-periods-mobile-320x568.png`
- `docs/screenshots/v08-periods-detail-desktop-1536x1024.png`
- `docs/screenshots/v08-periods-detail-mobile-320x568.png`
- `docs/screenshots/v08-periods-compare-desktop-1536x1024.png`
- `docs/screenshots/v08-periods-compare-mobile-320x568.png`

---

## 5. Geri Alma (Rollback) Planı

Olası bir geri alma durumunda:
```bash
git checkout feature/antigravity-v08-ataturk-life-experience
git branch -D feature/antigravity-v08-kimi-periods
```
Tüm değişiklikler `/donemler`, `historical-periods/` ve `components/periods/` altında izole edilmiş olup mevcut diğer rotaları etkilemez.
