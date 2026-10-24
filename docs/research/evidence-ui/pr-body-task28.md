## MKA 28 — Perplexity Evidence Workbench 2.0 A–J Araştırma Laboratuvarı Güvenli Görsel Entegrasyon

### Amaç
Mustafa Kemal Atatürk odaklı bağımsız tarih ve kültür platformunda PR #24 ile hazırlanan Evidence Workbench staging verilerini ve araştırma panellerini (A–J sekmeleri), MKA koyu bordo-altın tasarım sistemi, katı production fail-closed güvenlik kapısı ve modüler bileşen yapısıyla entegre etmek.

### Yapılan Geliştirmeler
1. **Modüler Bileşen Mimarisi (`web/components/research-workbench/`):**
   - `DashboardSection.tsx` (A · Araştırma Paneli)
   - `CandidatesSection.tsx` (B · Kaynak Adayları)
   - `QueueSection.tsx` (C · İddia Kuyruğu & Revizyonlar)
   - `EvidenceSection.tsx` (D · Kanıt Detayları & Pasaj Alıntıları)
   - `SourceCompare.tsx` (E · Kaynak Karşılaştırma & Bağımsızlık Uyarısı)
   - `BibliographySection.tsx` (F · Akademik Kaynakça)
   - `GapSection.tsx` (G · 1881–1918 Boşluk Analizi)
   - `NotebookPanel.tsx` (H · Araştırma Notları Defteri)
   - `QualitySection.tsx` (I · 9 Boyutlu Veri Kalitesi)
   - `ExportSection.tsx` (J · Dışa Aktarım Merkezi)
   - `index.ts`
2. **Sunucu Tarafı Güvenlik ve Staging Okuyucu (`web/lib/research-evidence/workbench.ts`):**
   - 5MB azami dosya boyutu kontrolü, path traversal koruması ve BOM temizliği eklendi.
   - `NODE_ENV === "production"` durumunda fail-closed davranışı: staging verisi kesinlikle yüklenmez ve boş dizi döner.
   - CSV formül enjeksiyonu (`=`, `+`, `-`, `@`, `\t`, `\r` veya öndeki boşluklar) tek tırnak `'` ile öneklenerek etkisiz hale getirildi (`formatCsvCell`).
3. **Dışa Aktarım API'si (`web/app/api/arastirma-laboratuvari/export/route.ts`):**
   - HEAD metodu desteği, `cache-control: no-store, no-cache, must-revalidate` başlıkları ve geçersiz formatlara karşı 400 hatası eklendi.
4. **Sayfa Düzeni ve Erişilebilirlik (`web/app/arastirma-laboratuvari/`):**
   - `page.tsx` modüler bileşenleri tüketerek sadeleştirildi.
   - 320px–1536px arasında 0 yatay taşma (`scrollWidth <= innerWidth + 1`).

### Kalite Kapıları ve Test Kanıtları
- **Workbench Birim Testleri:** `node --test web/tests/research-workbench.test.mjs` (10/10 GEÇTİ).
- **Kanıt Araştırma Motoru Testleri:** `node --test tools/historical-research/evidence/*.test.mjs` (21/21 GEÇTİ).
- **Tüm Çalışma Alanı Testleri:** `npm test` (358/358 GEÇTİ, 0 hata).
- **Playwright E2E Testleri:** `npx playwright test --config=playwright.research-ui.config.ts` (18/18 GEÇTİ across 9 viewports, port 4446, 0 yatay taşma).
- **TypeScript & Lint:** `npm run typecheck` (0 hata), `npm run lint` (0 hata, 0 uyarı).
- **Next.js Derlemesi:** `npm run build` (170 statik/dinamik rota başarıyla derlendi).
- **Arşiv Doğrulaması:** `node scripts/archive/validate.mjs` (168 kayıt doğrulandı, 74 birim testi geçti).

### Ekran Görüntüleri (9 Viewport)
- `v08-research-dashboard-*` (1536x1024, 1440x900, 1024x768, 768x1024, 430x932, 390x844, 375x667, 360x800, 320x568)
- `v08-research-compare-*` (1536x1024, 1440x900, 1024x768, 768x1024, 430x932, 390x844, 375x667, 360x800, 320x568)
Kaydedilen dizin: `docs/screenshots/`
