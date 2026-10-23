# V0.7 modül entegrasyon sözleşmeleri

Bu belge yalnızca V0.7 adaylarının V0.6 uygulamasına sonradan ve kontrollü biçimde bağlanması için sınırları tanımlar. Modüllerin hiçbiri V0.6'da çalışan özellik veya yayınlanmaya hazır içerik olarak sunulmaz.

## Ortak sınır

- Tek arşiv kaynağı `data/archive/base/` ve `data/archive/catalog/` üzerinden çalışan mevcut sunucu veri katmanıdır.
- Modüller arşivi salt okunur tüketir; ikinci katalog, örnek gerçekmiş gibi gösterilen veri veya otomatik `published` yazımı oluşturamaz.
- Ayrıntı bağlantıları `/arsiv/[slug]` biçimindedir. Paketlerde geçen `/archive/[slug]` varsayımı doğrudan kopyalanmaz.
- `published`, `reviewed` ve `draft` teknik iş akışı etiketleridir; insan tarih uzmanı onayı değildir.
- Dış paketlerin demo/fallback/mock kayıtları üretim korpusuna alınmaz.
- İstemci bileşenlerine yalnızca serileştirilebilir DTO aktarılır; arşiv dosya sistemi okuyucusu Server Component sınırında kalır.
- Her modül bağımsız özellik bayrağı, birim testi, E2E testi, erişilebilir boş durum ve geri alma planıyla ayrı PR olarak değerlendirilir.

TypeScript sınırı `schemas/v07-module-contracts.types.ts` içindedir. `ArchiveModuleContext.humanExpertReviewComplete` ve `V07ModuleResult.publicationEligible` değerleri bilerek `false` literalidir; V0.7 modülü insan onayı üretemez.

## Adaylar ve mevcut durum

| Aday | Kaynak | V0.6 kararı | Entegrasyon ön koşulu |
| --- | --- | --- | --- |
| Tarih atlası | Gemini ZIP paketi | Dahil edilmedi | Gerçek `ArchiveRecord` adaptörü, `/arsiv` rotası, koordinat provenansı ve fallback verinin kaldırılması |
| Okuma listeleri | Meta AI ZIP paketi | Dahil edilmedi | Mock arşiv kaldırılması, gerçek kayıt snapshot'ı, localStorage gizlilik/limit incelemesi |
| Türkçe arama V2 | DeepSeek metin teslimi | Dahil edilmedi | Mevcut arama API'siyle karşılaştırmalı benchmark ve güvenli vurgu testi |
| Tarihî dönem keşfi | Kimi metin teslimi | Dahil edilmedi | Kurum kuruluş tarihleri ile Atatürk yaşam olaylarının ayrımını koruyan veri eşleme |
| Belge karşılaştırma | Mistral metin teslimi | Dahil edilmedi | Telif, alıntı uzunluğu ve kaynak alanı kapıları |
| Arşiv içe aktarma | Google AI Studio metin teslimi | Dahil edilmedi | Mevcut şema/CLI ile uyum, staging-only dry-run, yeni bağımlılık incelemesi |
| Arama değerlendirme | Cohere metin teslimi | Dahil edilmedi | Sentetik ve gerçek sorgu kümelerinin ayrımı; kişisel veri içermeyen ölçüm seti |
| Kanıt motoru | PR #19 | V0.7 için bekletildi | Hedef dalındaki OpenCode değişiklikleriyle birlikte güvenlik ve yayın kapısı incelemesi |
| Kaynak güvenilirliği | PR #20 | V0.7 için bekletildi | Güvenilirlik puanının tarihî gerçeklik/onay iddiasına dönüşmemesi |

## Paket inceleme notları

Gemini atlas paketi depo ve gerçek şema erişimi olmadan hazırlanmış esnek bir adaptör ve fallback kayıtlar içeriyor. Meta AI okuma listesi paketi mock kayıtlarla ve `/archive` yolu varsayımıyla geliyor. Bu nedenle iki ZIP de uygulama dosyalarının üzerine açılmadı; yalnızca sözleşme ve entegrasyon riskleri değerlendirildi.

PR #19 ve #20, `feature/opencode-v06-archive-expansion` hedefli V0.7 çalışmalarıdır. V0.6 geçmişine merge veya cherry-pick edilmemiştir.
