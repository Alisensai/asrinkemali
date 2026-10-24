# MKA Atlas 2.0 — Mimari ve veri sözleşmesi

## Sunucu → istemci sınırı
`/atlas` Server Component `getPublishedArchiveRecords()` çağırır. `model.ts` saf TS fonksiyonu `toAtlasDataset` ile yalnız gerekli alanları çıkarır. Next.js istemci bileşenleri hiçbir zaman `lib/archive.ts` / `server-only` modülü import etmez. İkinci JSON veri deposu, uzaktan geokodlama, ücretli harita SDK'sı yoktur.

## Veri eşleme
- `id,slug,title,summary,type`: aynen katalog; slug geçersizse kayıt harita görünümüne alınmaz; kaynak kataloğu değiştirilmez.
- `date.start,end,precision,certainty,display`: katalog tarihinin bağlamı `type` alanına göre olay, yer, yayın veya belge şeklinde etiketlenir. Ayrı bir `eventDate` alanı kaynaksız türetilmez.
- `locations[]`: doğrulanmış **katalogda beyan edilen şehir**, kesin adres/koordinat değildir. Adres ve enlem-boylam uydurulmaz. Katalogda şehir yoksa boş durum.
- `people[]`: katalog alanı, kişilerin biyografik olayları veya bir yerde bulunma kanıtı değildir.
- `source.*`, `provenance.*`: yalnız bilgi ve güvenli HTTP(S) URL'leri; `javascript:` ve URL kimlik bilgileri reddedilir.
- `rights.status`, `verification.status`: haklar yayın politikasını değiştirmez. Sunucu yalnız `published` kayıt üretir. "published" insan uzman incelemesi demek değildir.
- `relatedIds`: yalnız hedefi yayıma açık mevcut kayıt varsa graf kenarı çıkar; kaynak kanıt etiketi `record.relatedIds`.

## Bilinen tarihî belirsizlikler
Bir `place` kaydı 1843–1856 gibi mekânın geçmişini açıklayabilir. Bu yıllar Mustafa Kemal Atatürk'ün hayatında gerçekleştirdiği bir ziyaret olarak gösterilmez. 2024 yılına ait bir yayın, incelediği 1919 olaylarının tarihini değil yayın yılını temsil eder. Tahmini yıl, bilinmeyen tarih ve çok yıllı aralık filtrelenirken `start/end` alanları kullanılır; gün hassasiyeti olmayan bir tarihe yapay gün atanmaz.

## Yer ilişkileri ve coğrafya
Türkçe şehir adı sözlüğü, `locations.name` alanı ancak tam olarak o şehrin adıysa şehir düzeyinde okunur. `tags[]`, `title` ve `summary` içerdiği şehirlere göre konum çıkarımı yapılmaz. Mevcut kaynak şemasında koordinat olmadığı için `coordinate:null` kalır. SVG gerçek ölçekli, sınırları onaylı bir Türkiye poligonu değildir: yalnız coğrafi yerleşimi andıran **şematik şehir keşif aracı**dır.

## Komşu ürün entegrasyonları
- Claude Atatürk: sadece onaylı `/ataturk` kök rotasına bağlantı; bilinmeyen `/ataturk/[donem]` derin rotası yazılmaz.
- Kronoloji: `/kronoloji`, güvenli yıl varsa `/kronoloji?yil=...`.
- Arşiv: `/arsiv/[slug]`; eski `/archive` bağlantısı kullanılmaz.
- Perplexity/OpenCode: `AtlasEvidenceAdapter`; AI kontrolü insan onayı olarak sunulmaz.
- DeepSeek: `AtlasSearchAdapter`; mevcut arama motoru yeniden yazılmaz.
- Diğer ajan dosyaları ile CSS globale müdahale yok.

## Önemli sınırlamalar
Büyüyen veri için `queryAtlas` O(n) filtreleme ve sıralama yapar. 10.000 sentetik kayıtta Node üzerinde fonksiyon doğrulanmıştır; mobil bellek, tarayıcı ölçümü, SSR yükü ve gerçek veride çok uluslu koordinat doğrulaması halen eksiktir. Açık ilişki ağında en çok 12 kenar aynı anda çizilir.
