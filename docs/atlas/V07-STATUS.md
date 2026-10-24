# MKA Atlas 2.0 — V0.7 geliştirme durumu

## Kaynak / sürüm
- Depo: `Alisensai/asrinkemali`
- Okunan temel: `integration/asrinkemali-v06-release-candidate`, GitHub PR #22; incelendiği anda HEAD `10cdbfd70e0d2c7d12ed1e71907273d9a1f92b7e`.
- Hedef çalışma dalı: `feature/gemini-v07-atlas-2`.
- **Dal oluşturulmadı**: GitHub bağlantısının `create_branch` çağrısı 403 `Resource not accessible by integration` döndürdü. GitHub'a commit/push/PR yapılmadı.
- Önceki `asrinkemali-v07-history-atlas-paket` ZIP dosyası bu sohbette sağlanmadı ve dosya kitaplığında bulunamadı; önceki pakete erişilmiş gibi davranılmadı.
- **Tam depo yerel ortamda yok**: `git ls-remote` DNS hatası verdi. Bu nedenle Next.js/npm/Playwright gerçek entegrasyon testi yapılmadı.

## Gerçekte yazılan modüller
- `web/app/atlas/page.tsx`: `/atlas` Server Component; mevcut arşivden **published** kayıtları alır ve istemciye DTO verir.
- `web/lib/atlas/model.ts`: katalog adaptörü; yalnız kaynak alanından şehir; ülke ayrımı; ilgili kişi/kurum; tarih türü, kesinlik ve tarih aralığı; güvenli dış URL; gerçek `relatedIds` grafı; arama, çoklu filtre, sayfalama, şehir kıyaslama.
- `web/lib/atlas/adapters.ts`: Atatürk/kronoloji/arşiv rotaları, typed ilişki metadata'sı, Evidence Engine/Source Reliability/Türkçe Search V2 için sözleşmeler; var olmayan rotaları üretmez.
- `web/components/atlas/AtlasMap.tsx`: klavye erişimli, SVG üzerinde Türkiye şeması; 7 seçilmiş şehir düğmesi, şehir düzeyinde etiket.
- `web/components/atlas/AtlasExplorer.tsx`: premium bordo-altın arayüz, arama/filtreler, liste, özgün kaynak, ilişkiler, kıyas, uluslararası yerler.
- `web/components/atlas/AtlasTimeline.tsx`: kayıt başlangıç yılları dağılımı; türlerden olay zamanları uydurmaz.
- `web/components/atlas/atlas.module.css`: yalnız atlas kapsamlı tema; responsive, az hareket desteği.
- `web/tests/atlas.test.mjs`: çevrimdışı gerçek Node testi; **31/31 geçti**.
- `web/e2e/atlas.spec.ts`: Playwright senaryoları ve 320/360/390/430/768/1024/1440/1536px çekim komutları; **çalıştırılmadı**.

## Veri dürüstlüğü
- `schemas/archive-record.types.ts` üzerinden V0.6 şema alanları tek tek okundu; gerçek örnekler `i-tbmm-binasi`, `ayk-ankara-ziraat-mektebi`, `atam-samsundan-erzuruma-mustafa-kemal-2024`, `ayk-ataturk-ve-dolmabahce-sarayi` kontrol edildi.
- `locations.city` veya `locations.name` yalnız tam şehir adıysa yerleştirilir. Başlıktaki “Samsun'dan Erzurum'a” **yayının iki şehirde geçen olay olduğu anlamına gelmez**; örnek yayının kayıt yeri Ankara'dır.
- Şemada enlem-boylam bulunmadığından **kesin konum işareti üretilmedi**. Harita coğrafi kesinlik taşımayan şehir seçim şemasıdır; gerçek poligon/jeodezik harita değildir.
- `place` için kuruluş/bina tarihi, `publication` için yayım yılı ile `event` için olay tarihi ayrı tür etiketi taşır.
- `published` yalnız katalog statüsüdür, tarih uzmanı onayı değildir.
- Yalnız açık `relatedIds` görünür kayıtlarla eşleştirilir; ad/tarih benzerliğinden olay ilişkisi çıkmaz.
- Katalog veri dosyaları, görseller ve üçüncü taraf modüller değiştirilmedi.

## Test sınırları
| Kontrol | Sonuç |
|---|---|
| Node saf veri testleri | 31/31 geçti (Node 22.16.0, `node --test`) |
| Strict TypeScript: `model.ts` ve `adapters.ts` | Geçti; yerel geçici şema tanımı gerçek V0.6 alanlarıyla eşlenmiştir, tam repo typecheck **değildir** |
| TypeScript TS/TSX sözdizimi denetimi | 7 dosyada hata yok |
| CSS PostCSS söz dizimi | Hata yok |
| `npm ci` | Gerçekleştirilmedi |
| `npm run lint` | Gerçekleştirilmedi |
| `npm run typecheck` (tam web) | Gerçekleştirilmedi |
| `npm run build` | Gerçekleştirilmedi |
| `npx playwright test e2e/atlas.spec.ts` | Gerçekleştirilmedi |
| Gerçek 168 kaydın uçtan uca doğrulaması | Gerçekleştirilmedi; adaptör `getPublishedArchiveRecords()` ile dinamik olarak gerçek katalogdan okur |
| 2.000 ve 10.000 sentetik kayıt | Birim testleri geçti; bu sonuç tarayıcı performans ölçümü değildir |
| Masaüstü/mobil ekran görüntüleri | Oluşmadı; E2E çalışınca üretilir |
| GitHub commit, dal, Draft PR | Yetki 403; oluşmadı |

## Kalan işler
1. Tüm dosyaları güncel V0.6 checkout'a overlay et; **başka dosyaları değiştirme**.
2. Gerçek repoda `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` çalıştır.
3. E2E üzerinden tarayıcı etkileşimi ve sekiz viewport ekran görüntüsünü al; başarısız senaryoları düzelt.
4. 168 kayıt içinde kent/durum sayımlarını gerçek çalışan UI üzerinde karşılaştır, kötü veri kaynaklarını ayrı kalite raporla.
5. Mevcut V0.6 dalı değiştiyse uyumu kontrol et; kendi dalına commit/push ve **Draft** PR aç.
6. Doğrulanmış gerçek coğrafya poligonlarını lisans ve provenansıyla ekle; bugünkü SVG'nin şematik sınırını kaldırmadan önce kaynak doğrulaması yap.
7. Mevcut platform tarafından talep edildiğinde DeepSeek V2, Perplexity/OpenCode ve Claude entegrasyon sözleşmelerini geliştir.

## Kesinlikle yapılmayan işlemler
`main` merge yok; V0.6 tabana push yok; canlı dağıtım yok; API anahtarı yok; ücretli servis yok; tarihi kayıt değiştirme/silme yok; profesyonel insan onayı taklidi yok.
