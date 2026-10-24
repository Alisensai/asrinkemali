# ASRIN KEMALİ — MKA Immersive Museum Hardening (Görev 26)

Bu doküman, Görev 26 kapsamında MKA Immersive Museum platformuna (`/sergiler` ve `/sergiler/[slug]`) uygulanan güvenlik kapısı, veri izolasyonu ve editoryal şeffaflık iyileştirmelerini açıklar.

---

## 1. Tespit Edilen Güvenlik ve Şeffaflık Zafiyetleri (PR #27 Tabanı)

1. **Staging Sızıntısı (Production Staging Leak):**
   - PR #27 tabanında `repository.ts` içinde `allowStaging = Boolean(process.env.ALLOW_STAGING_EXHIBITIONS || !isProd || filters?.includeStaging)` mantığı işletiliyordu.
   - Public `/sergiler/page.tsx` rotası `getExhibitions({ includeStaging: true })` çağırıyordu. Bu sayede üretim ortamında henüz bağımsız insan tarihçi onayı almamış staging sergileri kamuya açık listeleniyordu.
2. **Slug Gölgelemesi ve Üzerine Yazma (Slug Shadowing):**
   - `fetchAllRawExhibitions()` fonksiyonunda `publishedDir` önce, `stagingDir` sonra taranıyordu. `Map.set(item.slug, item)` çağrısı, aynı slug'a sahip bir taslak kaydın yayındaki doğrulanmış kaydın üzerine sessizce yazmasına sebep olabiliyordu.
3. **Koşulsuz ve Yanıltıcı Kaynak Rozetleri (SourceInspector):**
   - `SourceInspector.tsx` bileşeninde `isVerified` bayrağı dikkate alınmaksızın sabit "BİRİNCİL TARİHÎ KAYNAK" ve "DOĞRULANMIŞ KAYNAK" etiketleri basılıyordu. Bu durum, incelenmemiş veya temsili görsel içeren kayıtlarda sahte resmî teyit izlenimi veriyordu.
4. **Klavye Erişilebilirliği ve Focus Trap Eksikliği:**
   - Kaynak inceleme paneli (`SourceInspector`) açıldığında klavye odağı hapsedilmiyor, Escape tuşuna basıldığında tetikleyici butona odak iadesi yapılmıyordu.

---

## 2. Uygulanan Güvenlik Kapısı ve Sertleştirmeler

### A. Üretim Staging Kapısı (Fail-Closed Gate)
- `web/lib/exhibitions/workflow.ts` içine `canExposePublicExhibition(record)` fonksiyonu eklendi:
  - Şema doğrulaması (`validateExhibitionRecord`).
  - `editorialReview.isSyntheticPreview` kesinlikle `false` olmalı.
  - `editorialReview.status` mutlaka `"published"` olmalı.
  - Bağımsız onaylayan uzman (`editorialReview.reviewedBy`) dolu olmalı.
- `web/lib/exhibitions/repository.ts`:
  - `allowStaging` üretimde (`NODE_ENV === "production"`) koşulsuz `false` yapıldı. Hiçbir çevre değişkeni (`ALLOW_STAGING_EXHIBITIONS=1`) veya parametre (`includeStaging: true`) üretimde staging içeriğini ifşa edemez.
  - `fetchAllRawExhibitions()` içerisinde Fail-Closed Karantina uygulandı: Staging koleksiyonundaki bir slug yayındaki sergiyle çakışırsa, yayındaki sergi korunur ve staging kaydı karantinaya alınarak uyarı loglanır.
  - `getExhibitionBySlug`, `getExhibitionThemes`, `getRelatedExhibitions` fonksiyonları üretimde staging filtrelemesini zorunlu tutar.

### B. Dürüst Künye ve Kaynak Denetçisi Rozetleri
- `SourceInspector.tsx`:
  - Koşulsuz "BİRİNCİL TARİHÎ KAYNAK" rozeti kaldırıldı.
  - Tarafsız `KATALOG KAYDI` başlık rozeti yerleştirildi.
  - Doğrulama rozeti dinamik hale getirildi: `source.isVerified` varsa `DOĞRULANMIŞ KAYNAK`, yoksa `İNCELEME BEKLİYOR`.
  - Temsilî görseller için `TEMSİLÎ GÖRSEL` rozeti eklendi.
  - `role="dialog"`, `aria-modal="true"`, `Tab` / `Shift+Tab` focus trap ve `Escape` ile tetikleyici elemana odak restorasyonu sağlandı.

### C. Geliştirme Ortamı Önizleme ve Taslak Uyarısı
- Geliştirme ve editoryal önizleme ortamında taslak sergiler incelenirken (`isStagingDraft: true`), `ExhibitionView.tsx` tepesinde belirgin:
  `TASLAK — İNSAN İNCELEMESİ YOK: Bu sergi henüz bağımsız insan tarihçi ve editör onayından geçmemiştir.` uyarısı görüntülenir.
- `/sergiler/[slug]` rotasında taslak veya sentetik sergiler `robots: { index: false, follow: false }` ile arama motorlarına kapatılır.

### D. Kamuya Açık Güvenli Boş Durum (Empty State)
- `/sergiler/page.tsx` rotasında henüz doğrulanmış yayın bulunmayan ortamlarda kullanıcıya açık ve rehberlik eden boş durum kartı (`exhibitions-empty-state`) gösterilir; kullanıcı `/arsiv` ve `/donemler` rotalarına yönlendirilir.

---

## 3. Doğrulama ve Test Sonuçları

- **Birim Testleri (`web/tests/exhibitions.test.mjs`):** 15/15 test geçti.
- **AnyCoder Denetim Testleri (`web/tests/anycoder-prototype.test.mjs`):** 70/70 test geçti.
- **Çalışma Alanı Birim Testleri (`npm test`):** 329/329 test geçti.
- **Playwright E2E (`playwright.museum-v08.config.ts` — Port 4442):**
  - 9 Viewport (320px, 360px, 375px, 390px, 430px, 768px, 1024px, 1440px, 1536px) üzerinde 18/18 test geçti.
  - Tüm ekranlarda yatay taşma sıfır (`scrollWidth <= innerWidth + 1`).
- **TypeScript & Lint:** Sıfır hata, sıfır uyarı (`tsc --noEmit`, `eslint`).
- **Next.js Production Build:** 170 statik rota başarıyla üretildi.
