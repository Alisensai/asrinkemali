## SCOPE
MKA Atlas 2.0 — Gerçek Next.js Uygulama Entegrasyonu (Görev 22 / 30).
Görev 21'deki kapsamlı denetim ve `ACCEPT_NEW` kararı doğrultusunda, `MKA_ATLAS_V07_GITHUB.patch` temiz bir şekilde entegre edilmiş, tüm birim ve E2E testleri 9 viewportta doğrulanmıştır.

## SOURCES AND HASHES
- `MKA_ATLAS_V07_GITHUB.patch` | SHA256: `552796ad2d49333dc329d4de6198a1ee19067467113aad4bccf38a8613026053`
- `MKA_ATLAS_V07_KAYNAK_KOD.zip` | SHA256: `b31b6d8162ce7dd12e85cd622ebf9921ccff3f5f0b485df2045f4e1b19dca454`
- `asrinkemali-v07-history-atlas-paket gemini.zip` | SHA256: `fcf6d6e7ce62d0798eee332ce84e211cd164458313b6282d314a93484ffbcef7`

## COMPATIBILITY & BOUNDARIES
- Server Component (`/atlas`): `getPublishedArchiveRecords()` çağırır ve DTO'ya dönüştürür.
- İstemciye server-only veya raw arşiv JSON'u sızdırılmaz.
- `coordinate: null` korunur; enlem-boylam veya sahte harita sınırları üretilmez.
- Şematik harita uyarısı açıkça sunulur.
- Rotalar: `/arsiv/[slug]`, `/kronoloji`, `/ataturk` mevcut rotalarla tam uyumludur.
- MKA Tasarım Sistemi CSS tokenları (`--gold`, `--black`, `--red-masthead`, `--cream`) kullanılmıştır.

## IMPLEMENTED
1. **Server Route (`web/app/atlas/page.tsx`)**: URL parametrelerini (`parseAtlasParams`) ayrıştırır, `toAtlasDataset` ile güvenli DTO üretir.
2. **Atlas Explorer (`web/components/atlas/AtlasExplorer.tsx`)**: Şehir, tür, kurum, tarih aralığı, tarih kesinliği ve serbest metin arama filtreleri; şehir karşılaştırma motoru; belge ilişkileri grafı.
3. **Şematik Harita (`web/components/atlas/AtlasMap.tsx`)**: 7 odak şehir (Ankara, İstanbul, İzmir, Samsun, Sivas, Erzurum, Çanakkale) ve uluslararası keşif (Selanik); şematik uyarı etiketi.
4. **Zaman Çizelgesi (`web/components/atlas/AtlasTimeline.tsx`)**: Başlangıç yıllarına göre histogram ve yıl filtreleme.
5. **Modüler Stil (`web/components/atlas/atlas.module.css`)**: Sıfır taşmalı (zero horizontal overflow) 320px–1536px responsive tasarım.
6. **Adaptörler (`web/lib/atlas/adapters.ts`)**: Tip güvenli rota ve ilişki sağlayıcıları.

## HUMAN APPROVAL / RIGHTS BLOCKERS
- `published` teknik katalog statüsüdür; hiçbir arayüz öğesinde "tarihçi uzman onayladı" şeklinde yanıltıcı iddia üretilmemiştir.
- Dış kurumsal kaynak bağlantıları `rel="noopener noreferrer external"` ile doğrudan resmi kaynağa yönlendirir; telifsiz medya barındırılmaz.

## TESTS & EVIDENCE
- `node scripts/archive/validate.mjs` -> **0 hata, 7 beklenen uyarı**
- `node --test scripts/archive/tests/*.test.mjs` -> **74/74 PASS**
- `node --test tests/atlas.test.mjs` -> **31/31 PASS**
- `node --test tests/atlas-review.test.mjs` -> **50/50 PASS**
- `npm test` -> **180/180 PASS**
- `npm run lint` -> **0 hata, 0 uyarı**
- `npm run typecheck` -> **0 hata**
- `npm run build` -> **166 sayfa derlendi (/atlas dinamik/statik)**
- `npx playwright test --config=playwright.atlas-v08.config.ts` -> **127 PASS, 0 FAIL, 8 SKIP (9 viewport)**

## SCREENSHOTS (9 Viewports)
- `docs/screenshots/v08-atlas-desktop-1536x1024.png`
- `docs/screenshots/v08-atlas-desktop-1440x900.png`
- `docs/screenshots/v08-atlas-tablet-1024x768.png`
- `docs/screenshots/v08-atlas-tablet-768x1024.png`
- `docs/screenshots/v08-atlas-mobile-430x932.png`
- `docs/screenshots/v08-atlas-mobile-390x844.png`
- `docs/screenshots/v08-atlas-mobile-375x667.png`
- `docs/screenshots/v08-atlas-mobile-360x800.png`
- `docs/screenshots/v08-atlas-mobile-320x568.png`

## ROLLBACK
`git revert <commit-sha>` ile temiz geri alma prosedürü uygulanabilir.

## NEXT HANDOFF
- Görev 23: Mistral Belge Karşılaştırma Entegrasyonu.
