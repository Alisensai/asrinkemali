## 1. AMAÇ VE BAĞLAM
Bu PR, **Görev 23: MISTRAL — KAYNAKLI BELGE KARŞILAŞTIRMA MERKEZİ** gereksinimlerini eksiksiz olarak Next.js 16 / React 19 ortamına entegre eder.

Mistral'in teslim metninde (`mistralal.txt`) iddia edilen `1640fea` commit'i ve `feature/mistral-v07-document-comparison` dalı reponun geçmişinde fiilen mevcut olmadığı gibi, önerilen `DocumentType`, `VerificationStatus`, `sensitivityLevel`, `physicalStatus` ve 10 adet yapay `demoRecords` mock kaydı projenin gerçek veri sözleşmesiyle (`schemas/archive-record.types.ts`) çelişmekteydi.

Bu PR ile:
1. `MISTRAL-SOURCE-AUDIT.md` denetim raporu hazırlanmış ve çelişkiler belgelenmiştir.
2. Sahte mock veriler yerine canlı `getPublishedArchiveRecords()` (151 yayımlanmış kayıt) veri kaynağına dayalı, tip güvenli ve sıfır taşmalı bir karşılaştırma motoru geliştirilmiştir.
3. İki belge seçildiğinde ortak mekânlar, kişiler, kategoriler ve zaman dilimi örtüşmesi (`dateOverlap`) nesnel algoritmalarla hesaplanmaktadır.
4. Hiçbir şekilde sübjektif "güvenilirlik puanı", "doğrulama derecesi" veya sahte insan onay damgası üretilmez; kaynak kurum ve künye doğrudan gösterilir.

---

## 2. ETKİLENEN DOSYALAR

### Kaynak Kod ve Sayfalar
- `web/app/karsilastir/page.tsx`: `/karsilastir` rotası sunucu bileşeni (SSR / metadata / RSC güvenliği)
- `web/lib/document-comparison/dates.ts`: Zaman dilimi güvenli tarih aralığı ve çakışma çözümleme motoru
- `web/lib/document-comparison/model.ts`: Tip güvenli DTO'lar, karşılaştırma mantığı, XSS ve URL doğrulama, arama filtreleri
- `web/components/document-comparison/comparison.module.css`: MKA tasarım sistemi tokenları ve 320px–1536px responsive kuralları
- `web/components/document-comparison/DocumentComparisonView.tsx`: İstemci karşılaştırma orkestratörü (URL senkronizasyonu)
- `web/components/document-comparison/ComparisonHeader.tsx`: A ve B belge kartları ve belge seçimi kontrolleri
- `web/components/document-comparison/ComparisonTable.tsx`: Yan yana detaylı karşılaştırma tablosu (fark vurgulama ile)
- `web/components/document-comparison/CommonElements.tsx`: Ortak kişiler, mekânlar, etiketler ve tarih çakışma rozeti
- `web/components/document-comparison/DocumentSelectionModal.tsx`: Erişilebilir modal penceresi (klavye tuzaklaması, ESC ile kapatma, çift seçim engeli)
- `web/components/document-comparison/ShareComparison.tsx`: Paylaşılabilir URL kopyalama ve erişilebilir bildirim
- `web/components/document-comparison/PrintComparison.tsx`: Yazdırma eylemi ve `@media print` stilleri
- `web/components/document-comparison/index.ts`: Modül dışa aktarımları

### Testler ve Yapılandırma
- `web/tests/document-comparison.test.mjs`: 25 adet kapsamlı birim testi (Node.js `--test`)
- `web/playwright.comparison-v08.config.ts`: Port 4436 üzerinde izole E2E yapılandırması
- `web/e2e/document-comparison.spec.ts`: 9 viewportta çalışan 81 senaryoluk E2E test paketi ve ekran görüntüsü alımı

### Dokümantasyon
- `docs/comparison/MISTRAL-SOURCE-AUDIT.md`: Mistral teslimi denetim raporu
- `docs/antigravity-v08/GOREV-23-RAPOR.md`: Görev 23 kapsamlı uygulama ve test raporu
- `docs/screenshots/v08-comparison-*.png`: 9 farklı cihaz genişliğinde kanıt ekran görüntüleri

---

## 3. ÇALIŞTIRILAN KOMUTLAR VE TEST SONUÇLARI

### 3.1 Birim Testleri
```powershell
npm test
# tests 205 | pass 205 | fail 0 (Tüm proje birim testleri)
# web/tests/document-comparison.test.mjs: 25 testin tamamı geçti
```

### 3.2 E2E Playwright Testleri (Port 4436)
```powershell
npx playwright test --config=playwright.comparison-v08.config.ts
# 81 passed (9 viewport x 9 test senaryosu)
# 9 viewportta sıfır yatay taşma (scrollWidth <= innerWidth + 1) doğrulandı
```

### 3.3 Statik Tip ve Lint Denetimi
```powershell
npm run typecheck
# 0 hata

npm run lint
# 0 hata, 0 uyarı
```

### 3.4 Üretim Derlemesi
```powershell
npm run build
# 167 sayfa başarıyla derlendi (ƒ /karsilastir eklendi)
```

---

## 4. EKRAN GÖRÜNTÜLERİ VE DUYARLI DAVRANIŞ

| Görünüm | Çözünürlük | Durum | Ekran Görüntüsü |
| :--- | :--- | :--- | :--- |
| Mobile XS | 320x568 | Sıfır taşma | `docs/screenshots/v08-comparison-mobile-320x568.png` |
| Mobile SM | 360x800 | Sıfır taşma | `docs/screenshots/v08-comparison-mobile-360x800.png` |
| Mobile iPhone SE | 375x667 | Sıfır taşma | `docs/screenshots/v08-comparison-mobile-375x667.png` |
| Mobile iPhone 12/14 | 390x844 | Sıfır taşma | `docs/screenshots/v08-comparison-mobile-390x844.png` |
| Mobile Pro Max | 430x932 | Sıfır taşma | `docs/screenshots/v08-comparison-mobile-430x932.png` |
| Tablet Portrait | 768x1024 | Sıfır taşma | `docs/screenshots/v08-comparison-tablet-768x1024.png` |
| Tablet Landscape | 1024x768 | Sıfır taşma | `docs/screenshots/v08-comparison-tablet-1024x768.png` |
| Desktop HD | 1440x900 | Sıfır taşma | `docs/screenshots/v08-comparison-desktop-1440x900.png` |
| Desktop Large | 1536x1024 | Sıfır taşma | `docs/screenshots/v08-comparison-desktop-1536x1024.png` |

---

## 5. ETİK VE TARİHSEL GÜVENLİK
- AGENTS.md anayasası uyarınca `published` durumu yalnızca katalog durumu olarak açıklanır, sahte "uzman tarihçi onayladı" izlenimi verilmez.
- Belgeler arası üstünlük, doğruluk veya kanıt gücü derecelendirmesi yapılmaz.
- Tüm dış kaynak bağlantıları `rel="noopener noreferrer external"` ile doğrudan resmî arşiv ve kütüphanelere açılır.
