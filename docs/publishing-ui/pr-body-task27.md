## MKA 27 — Yayınlar ve Tarihte Bugün Deneyimi

### Amaç
Mustafa Kemal Atatürk odaklı bağımsız tarih ve kültür platformunda `/yayinlar`, `/yayinlar/[slug]` ve `/tarihte-bugun` kullanıcı deneyiminin, onaylı tasarım sistemi ve katı editoryal yayın kapısı ile güçlendirilmesi.

### Yapılan Geliştirmeler
1. **Modüler Bileşen Mimarisi (`web/components/publication-experience/`):**
   - `PublicationFilters.tsx`: Kategori ve tür GET parametre süzgeçleri, temizleme aksiyonu.
   - `PublicationCard.tsx`: Tipografik okuma kartı, kategori/tür etiketleri, kaynak referansları.
   - `PublicationEmptyState.tsx`: Doğrulanmış insan onayı bulunmadığında yapay içerik uydurmadan dijital arşive (`/arsiv`) yönlendiren dürüst müze boş durumu.
   - `TodayDateSelector.tsx`: Takvim günü ve ayı seçimi, "Bugüne Dön" butonu, erişilebilir form etiketleri.
   - `TodayEventCard.tsx`: Olay özeti, birincil `/arsiv/[slug]` bağlantısı, kurum atıfları.
   - `SourceCitation.tsx`: Güvenli harici HTTPS bağlantıları (`rel="noopener noreferrer external"`).
2. **Takvim ve Artık Yıl Doğrulaması (`web/lib/publishing/today.ts`):**
   - `isValidMonthDay(month, day)` fonksiyonu 2024 leap year referansıyla eklendi; 31 Şubat ve 31 Nisan gibi geçersiz günler engellendi, 29 Şubat kabul edildi.
   - Hatalı tarih parametrelerinde Europe/Istanbul güncel tarihine dönülerek `role="alert"` ile erişilebilir geri bildirim sunuldu.
   - Tarihte Bugün seçkisine yalnızca gün hassasiyetli (`precision === "day"`) ve published arşiv kayıtları dahil edildi.
3. **Arşiv ID ve Slug Çözümlemesi (`web/app/yayinlar/[slug]/page.tsx`):**
   - `relatedArchiveIds` dizi elemanları `getPublishedArchiveRecordById(id) || getPublishedArchiveRecord(id)` ile çözümlenerek doğru kanonik `/arsiv/[slug]` bağlantıları oluşturuldu.
4. **Stil ve Erişilebilirlik (`web/app/publishing.module.css`):**
   - Boş durum butonları (`.emptyPrimaryBtn`, `.emptySecondaryBtn`), baskı stilleri (`@media print`), `prefers-reduced-motion` ve `forced-colors` stilleri eklendi.

### Kalite Kapıları ve Test Kanıtları
- **Birim Testleri:** `node --test web/tests/publication-experience.test.mjs` (19/19 GEÇTİ).
- **Tüm Çalışma Alanı Testleri:** `npm test` (348/348 GEÇTİ, 0 hata).
- **Playwright E2E Testleri:** `npx playwright test --config=playwright.publishing-v08.config.ts` (18/18 GEÇTİ across 9 viewports, port 4444, 0 yatay taşma).
- **TypeScript & Lint:** `npm run typecheck` (0 hata), `npm run lint` (0 hata, 0 uyarı).
- **Next.js Derlemesi:** `npm run build` (170/170 statik/dinamik rota başarıyla derlendi).
- **Arşiv Doğrulaması:** `node scripts/archive/validate.mjs` (168 kayıt doğrulandı, 74 birim testi geçti).

### Ekran Görüntüleri (9 Viewport)
- `v08-publishing-directory-*` (1536x1024, 1440x900, 1024x768, 768x1024, 430x932, 390x844, 375x667, 360x800, 320x568)
- `v08-publishing-today-*` (1536x1024, 1440x900, 1024x768, 768x1024, 430x932, 390x844, 375x667, 360x800, 320x568)
Kaydedilen dizin: `docs/screenshots/`
