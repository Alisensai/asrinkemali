## MKA GÖREV DEVİR FORMU — GÖREV 19

- **GÖREV:** MKA-ANTIGRAVITY-19-ATATURK-YASAM-DENEYIMI
- **GITHUB REPO:** https://github.com/Alisensai/asrinkemali
- **BRANCH:** `feature/antigravity-v08-ataturk-life-experience`
- **BASE:** `feature/antigravity-v08-premium-archive` (PR #38, commit `e00bf32`)
- **DURUM:** DRAFT PR (v0.8 Hazırlık)

---

### 1. Amaç ve Kapsam

Bu PR, **ASRIN KEMALİ** platformunun Atatürk yaşam yolculuğu sayfasını (`/ataturk`), onaylı tasarım kimliğine ve token mimarisine tam sadakatle **Kaynaklı Dijital Yolculuk ve Müze Düzeyi Erişilebilir Etkileşim** seviyesine ulaştırır.
Tarihî gerçeklikten ve arşiv belgelerinden ayrılmayan (epistemik dürüstlük), sahte onay checkmark'ları üretmeyen, mekân kuruluşu ile yaşam olaylarını ayıran ve 9 viewportta sıfır taşma sağlayan bir deneyim sunar.

---

### 2. Uygulanan Modüller

1. **Semantik İkon Eşlemesi (`web/components/ataturk-experience/TypeBadge.tsx`):**
   - Konuşma (`speech`) kayıt türünün kitap yerine doğrudan semantik `Icon name="speech"` ile eşlenmesi sağlandı.
   - 6 kayıt türünün tümü tutarlı ve doğru semantik ikonlarla zenginleştirildi.

2. **Etkileşim Güvenliği (`web/components/ataturk-experience/ataturk-experience.module.css`):**
   - Hero bölümü dekoratif görsel ve gölge katmanlarına (`.heroArt`, `.heroShade`) `pointer-events: none` eklenerek buton ve link tıklama hassasiyeti güvenceye alındı.

3. **Birim ve Sözleşme Testleri (`web/tests/ataturk-experience.test.mjs`):**
   - `[19.001]` ila `[19.010]` resmi sözleşme testleri eklendi:
     - `published` olmayan kayıtların filtrelenmesi,
     - İnsan uzman onayı rozetine dönüştürülmeme güvencesi,
     - 1881–1918 erken dönemine doğru filtreleme,
     - Tarihsiz kayıtlara uydurma yıl atanmaması,
     - Tahmini tarih uyarısının dürüstçe sunumu,
     - Mekân inşa yılı ile ziyaret yılı ayrımı,
     - Çocukluk-öğrenim temasında bina ile belgenin ayrımı,
     - Kurumsal alıntı ve HTTPS doğrulaması,
     - İstemci katmanına sunucu sırrı veya `node:fs` sızdırılmaması,
     - `TypeBadge` semantik ikon eşlemesi.

4. **Playwright E2E Test Paketi (`web/playwright.ataturk-v08.config.ts`, `web/e2e/ataturk-v08.spec.ts`):**
   - İzole port `4430` üzerinde 9 farklı viewportta (`320x568` .. `1536x1024`) test koşumu yapıldı.
   - Sıfır yatay taşma (`scrollWidth <= innerWidth + 2px`), hero temsili etiketleri, roving tabindex klavye gezinimi, modal ESC/odak iadesi ve sergi filtreleri tam olarak doğrulandı.

---

### 3. Test ve Doğrulama Sonuçları

- **Playwright E2E:** 36/36 test başarılı (9 viewport: 320px–1536px, sıfır yatay taşma, hero, rail, modal, filter).
- **Unit Testler:** 76/76 test başarılı (`web/tests/*.test.mjs`, 10 yeni test).
- **Next.js Turbopack Build:** 164 sayfanın tamamı statik olarak başarıyla derlendi.
- **Arşiv Doğrulaması:** 168 kayıt geçerli, 74/74 test başarılı.
- **ESLint:** 0 hata, 0 uyarı.
- **TypeScript:** 0 hata.

---

### 4. Ekran Görüntüleri

Tüm ekran görüntüleri `docs/screenshots/` dizininde arşivlenmiştir:
- `v08-ataturk-desktop-1536x1024.png`
- `v08-ataturk-desktop-1440x900.png`
- `v08-ataturk-tablet-1024x768.png`
- `v08-ataturk-tablet-768x1024.png`
- `v08-ataturk-mobile-430x932.png`
- `v08-ataturk-mobile-390x844.png`
- `v08-ataturk-mobile-375x667.png`
- `v08-ataturk-mobile-360x800.png`
- `v08-ataturk-mobile-320x568.png`
- `v08-ataturk-rail-1536x1024.png`
- `v08-ataturk-exhibit-1536x1024.png`
- `v08-ataturk-mobile-320x568-detail.png`

---

### 5. Geri Alma (Rollback)

Gerektiğinde branch silinerek temiz duruma dönülebilir:
```bash
git checkout feature/antigravity-v08-premium-archive
git branch -D feature/antigravity-v08-ataturk-life-experience
```
