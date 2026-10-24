## Motivation & Amaç

Mustafa Kemal Atatürk odaklı bağımsız tarih ve kültür platformu **ASRIN KEMALİ** için, gerçek kurumsal kaynaklı arşiv kayıtları üzerinden çalışan, yapay zekâ kategorilendirme sinyallerini ve katalog çapraz referanslarını şeffaf gerekçelerle sunan müze sınıfı **Keşfet & Açıklanabilir Kaynaklı Öneriler** arayüzü (`/kesfet`) tamamlanmıştır.

GitHub üzerinde haricî bir `qwen`, `deepseek` veya `explore` backend API servisi bulunmadığı için, görev anayasasına tam uyum sağlanarak tanımsız haricî modeller uydurulmamış; gerçek arşiv verilerinden (`getPublishedArchiveRecords()`) beslenen %100 deterministik, tip-güvenli ve açıklanabilir bir öneri motoru (`DeterministicArchiveRecommendationService`) inşa edilmiştir. Gelecekte gelebilecek haricî modeller için genişletilebilir adaptör sözleşmesi (`QwenRecommendationServiceAdapter`) hazırlanmıştır.

---

## Mimari ve Temel Bileşenler

1. **Öneri ve Sıralama Katmanı (`web/lib/explore-ui/`)**:
   - `types.ts`: `ExploreRecordDTO`, `RecommendationReason`, `ExploreCluster` sözleşmeleri. İstemciye sızmaması gereken iç denetim ve ham araştırma alanları arındırılmıştır.
   - `recommendations.ts`: Çok kriterli deterministik öneri algoritması. Katalog çapraz referansı (`relatedId`: 40p), ortak şahsiyetler (25p), ortak mekânlar (20p), ortak tematik kategoriler (20p), aynı tarihsel dönem (15p), ortak etiketler (10p) ve benzer arşiv türü (5p) üzerinden skorlama yapar. Puan eşitliğinde `id` alfabetik artan sırayla deterministik tie-break uygulanır. 4 ana tarihsel dönem ve 6 tematik küme tanımlanmıştır.
   - `search.ts`: Türkçe karakter duyarlı metin katlama (`foldTurkish`), çok alanlı arama ve eşleşen alan rozetleri (`matchedFields`).
   - `adapter.ts`: `archiveRecordToExploreDTO` dönüştürücüsü, `DeterministicArchiveRecommendationService` varsayılan motoru ve Qwen adaptör fallback yapısı.
2. **Kullanıcı Deneyimi Bileşenleri (`web/components/explore/`)**:
   - `ExploreHero.tsx`: Başlık, sayaçlar, Türkçe arama kutusu ve açıklanabilirlik taahhüt bildirimi.
   - `ExploreFilterBar.tsx`: Tür sekmeleri (sayı rozetleriyle), dönem filtreleri, kategori çipleri, sıralama ve "Filtreleri Temizle" düğmesi.
   - `ExploreCard.tsx`: Müze sınıfı kart, kurum bilgisi, yayın rozeti ve her önerinin gerekçesini açıklayan **"Neden Önerildi?" Paneli**.
   - `RecommendationCluster.tsx`: Tematik kümeleme kartı ve küme içi kayıt önizlemeleri.
   - `ExploreEmptyState.tsx`: Sonuç bulunamadığında rehberlik eden boş durum.
3. **Sayfa ve Stil (`web/app/kesfet/`)**:
   - `page.tsx`: Server Component; kamuya açık kayıtları yükler, arama/filtreleme ve tohum kayıt öneri modlarını yönetir.
   - `kesfet.module.css`: `design/ONAYLANAN-TASARIM.webp` referans alınarak siyah, bordo, obsidyen ve altın paleti; 320px–1536px arasında 9 viewportta sıfır yatay taşma (`scrollWidth <= innerWidth + 1`); minimum 44px dokunma hedefleri ve reduced-motion desteği.
4. **Navigasyon Entegrasyonu (`web/lib/site-data.ts`)**:
   - `primaryNavigation` listesine `Keşfet` sekmesi eklenmiştir.
   - `searchItems` listesine `Keşfet & Öneriler` sayfası eklenmiştir.

---

## Değişen Dosyalar

- `web/lib/explore-ui/types.ts` [YENİ]
- `web/lib/explore-ui/recommendations.ts` [YENİ]
- `web/lib/explore-ui/search.ts` [YENİ]
- `web/lib/explore-ui/adapter.ts` [YENİ]
- `web/lib/explore-ui/index.ts` [YENİ]
- `web/components/explore/ExploreHero.tsx` [YENİ]
- `web/components/explore/ExploreFilterBar.tsx` [YENİ]
- `web/components/explore/ExploreCard.tsx` [YENİ]
- `web/components/explore/RecommendationCluster.tsx` [YENİ]
- `web/components/explore/ExploreEmptyState.tsx` [YENİ]
- `web/components/explore/index.ts` [YENİ]
- `web/app/kesfet/page.tsx` [YENİ]
- `web/app/kesfet/kesfet.module.css` [YENİ]
- `web/lib/site-data.ts` [GÜNCELLENDİ: Keşfet navigasyon ve arama kaydı eklendi]
- `web/tests/explore-ui.test.mjs` [YENİ: 20 kapsamlı birim testi]
- `web/playwright.explore-ui.config.ts` [YENİ: Port 4448 izole config]
- `web/e2e/explore-ui.spec.ts` [YENİ: 18 E2E testi, 9 viewport, 0 taşma]
- `docs/explore/README.md`, `ARCHITECTURE.md`, `SAFETY.md`, `ROLLBACK.md`, `HANDOFF.md`, `TESTS.md` [YENİ]
- `docs/antigravity-v08/GOREV-29-RAPOR.md` [YENİ]

---

## Doğrulama ve Test Sonuçları

1. **Birim Testleri (`npm test`)**:
   - `web/tests/explore-ui.test.mjs`: 20 / 20 PASS
   - Toplam Web Test Suiti: **378 / 378 PASS** (sıfır hata)
2. **TypeScript Tip Denetimi (`npm run typecheck`)**:
   - 0 hata (temiz)
3. **ESLint Kod Denetimi (`npm run lint`)**:
   - 0 hata, 0 uyarı (temiz)
4. **Next.js Production Build (`npm run build`)**:
   - `ƒ /kesfet` rotası başarıyla derlendi; 171 statik rota temiz optimize edildi.
5. **Arşiv Katalog Doğrulaması (`node scripts/archive/validate.mjs`)**:
   - 168 kayıt, 151 yayımlanmış, 0 hata (başarılı).
6. **Playwright İzole E2E Testi (`npx playwright test -c playwright.explore-ui.config.ts`)**:
   - Port **4448** üzerinde 18 / 18 PASS.
   - 9 Viewport genelinde sıfır yatay taşma tescil edildi (`scrollWidth <= innerWidth + 1`).
   - 18 adet kanıt ekran görüntüsü `docs/screenshots/` ve artifact dizinine kaydedildi.

---

## 9 Viewport Ekran Görüntüleri Kanıt Listesi

- `v08-explore-overview-desktop-1536x1024.png`
- `v08-explore-overview-desktop-1440x900.png`
- `v08-explore-overview-tablet-1024x768.png`
- `v08-explore-overview-tablet-768x1024.png`
- `v08-explore-overview-mobile-430x932.png`
- `v08-explore-overview-mobile-390x844.png`
- `v08-explore-overview-mobile-375x667.png`
- `v08-explore-overview-mobile-360x800.png`
- `v08-explore-overview-mobile-320x568.png`
- `v08-explore-search-desktop-1536x1024.png`
- `v08-explore-search-desktop-1440x900.png`
- `v08-explore-search-tablet-1024x768.png`
- `v08-explore-search-tablet-768x1024.png`
- `v08-explore-search-mobile-430x932.png`
- `v08-explore-search-mobile-390x844.png`
- `v08-explore-search-mobile-375x667.png`
- `v08-explore-search-mobile-360x800.png`
- `v08-explore-search-mobile-320x568.png`

---

## Güvenlik ve İnsan Onayı Beyanı

- Sahte tarihçi onayı veya hayalî akademik kurul ibaresi bulunmaz. Yayın durumu dürüstçe `reviewLabel("published")` ("Kaynak denetimli · uzman onayı bekliyor") olarak gösterilir.
- Canlıda Qwen servisi olmadığı için sistem deterministik baz motora güvenle fallback yapar.
- Canlı ortama izinsiz deploy yapılmamıştır; `main` dalına merge edilmemiştir.
