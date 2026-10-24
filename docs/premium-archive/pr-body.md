## MKA GÖREV DEVİR FORMU — GÖREV 18

- **GÖREV:** MKA-ANTIGRAVITY-18-PREMIUM-ARCHIVE
- **GITHUB REPO:** https://github.com/Alisensai/asrinkemali
- **BRANCH:** `feature/antigravity-v08-premium-archive`
- **BASE:** `feature/antigravity-v08-home-shell` (PR #34, commit `20f4512`)
- **DURUM:** DRAFT PR (v0.8 Hazırlık)

---

### 1. Amaç ve Kapsam

Bu PR, **ASRIN KEMALİ** platformunun dijital arşiv arayüzünü (`/arsiv` ve `/arsiv/[slug]`), onaylı tasarıma ve MKA token mimarisine tam sadakatle **Premium Müze Vitrini ve Katalog Deneyimi** seviyesine ulaştırır.
Kayıtların insan tarihçi incelemesi beklediğini gizlemeden (epistemik dürüstlük), sahte onay checkmark'ları üretmeden, medyasız kayıtlarda sahte placeholder üretmeyen `MuseumPlaque` primitifini devreye alarak 9 viewportta sıfır taşma sağlar.

---

### 2. Uygulanan Modüller

1. **Arşiv Kataloğu (`web/app/arsiv/page.tsx`):**
   - Altı kayıt türü (`photograph`, `document`, `speech`, `event`, `publication`, `place`) için semantik ikonlar ve renklendirilmiş sol kenar temaları (`[data-record-type]`).
   - Sahte onay iması oluşturan yeşil checkmark ikonu yerine dürüst belge ikonu (`Icon name="document"`).
   - Tahmini tarihli kayıtlarda `(tahmini)` etiketinin kart metadatasına yansıtılması.
   - Tekil kart `<Link>` sarmalayıcısı (sıfır nested anchor).
   - Tam GET parametre sözleşmesi (`q`, `tur`, `kategori`, `kaynak`, `sehir`, `baslangic`, `bitis`, `sayfa`) ve sayfalama sürekliliği (`archiveQueryString`).
   - Boş arama sonuçlarında bilgilendirici `EmptyState` ve filtre sıfırlama butonu.

2. **Kayıt Detay Sayfası (`web/app/arsiv/[slug]/page.tsx`):**
   - Medyası olmayan kayıtlar için tipografik müze künyesi (`MuseumPlaque`).
   - Gömülü medyalı kayıtlarda `embedded_allowed` denetimi ve AI temsili rozeti (`"Yapay Zekâ Temsili Görsel"` / `"Orijinal Arşiv Belgesi"`).
   - `relatedIds` üzerinden yayınlanmış kayıtları çözümleyen gerçek "İlişkili Arşiv Kayıtları" bölümü.
   - Detay künyesinde (`dossierCard`) `dl/dt/dd` ile semantik arşiv verisi, kurumsal dış bağlantı (`rel="noopener noreferrer external"`) ve indirme servisi bulunmadığına dair dürüst bilgilendirme.

3. **Veri ve Servis Katmanı (`web/lib/archive.ts`):**
   - `getPublishedArchiveRecordById(id: string)` yardımcı fonksiyonu eklendi.

4. **Stil Katmanı (`web/app/content-platform.module.css`):**
   - Altı kayıt türü için `data-record-type` stilleri.
   - İlişkili kayıtlar grid ve kart stilleri (`.relatedSection`, `.relatedGrid`, `.relatedCard`).

---

### 3. Test ve Doğrulama Sonuçları

- **Playwright E2E:** 36/36 test başarılı (9 viewport: 320px–1536px, sıfır yatay taşma, arama, filtreleme, empty state, detay künyesi, MuseumPlaque).
- **Unit Testler:** 66/66 test başarılı (`web/tests/*.test.mjs`, 10 yeni test).
- **Next.js Turbopack Build:** 164 sayfanın tamamı statik olarak başarıyla derlendi.
- **Arşiv Doğrulaması:** 168 kayıt geçerli, 74/74 test başarılı.
- **ESLint:** 0 hata, 0 uyarı.

---

### 4. Ekran Görüntüleri

Tüm ekran görüntüleri `docs/screenshots/` dizininde arşivlenmiştir:
- `v08-archive-desktop-1536x1024.png`
- `v08-archive-desktop-1440x900.png`
- `v08-archive-tablet-1024x768.png`
- `v08-archive-tablet-768x1024.png`
- `v08-archive-mobile-430x932.png`
- `v08-archive-mobile-390x844.png`
- `v08-archive-mobile-375x667.png`
- `v08-archive-mobile-360x800.png`
- `v08-archive-mobile-320x568.png`
- `v08-archive-detail-1536x1024.png`
- `v08-archive-detail-mobile-390x844.png`
- `v08-archive-plaque-1536x1024.png`
- `v08-archive-empty-state-1536x1024.png`
