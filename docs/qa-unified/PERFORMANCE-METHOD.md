# Performans ve ölçek yöntemi

## Tarayıcı ölçümü

`performance` yalnız production modunda `/arsiv` için üç ayrı navigasyon örneği alır: ilk örnek `cold`, sonraki örnekler aynı browser context içindeki `warm` olarak etiketlenir. Her örnekte response, `performance.now()` navigation süresi, Navigation Timing `DOMContentLoaded`, encoded body boyutu ve JS resource adedi kaydedilir. Üç süre için median ve IQR hesaplanır. Sonuç `qa/results/<run-id>/structured-report/performance-measurement.json` altındadır.

Bu, tek yerel makine/tek çalıştırmanın ölçümüdür; Lighthouse, LCP/CLS, kullanıcı deneyimi skoru veya başka commit/hardware'a göre regresyon kanıtı değildir. Development ölçümleri production ile kıyaslanmaz. Baseline karşılaştırmasında tam environment uyumu zorunludur; baseline otomatik yenilenmez.

## Sentetik ölçek

Seed'li üretici yalnızca açıkça test verisi olan alanlar yazar; tarihî kişi/olay/kaynak taklit etmez. Üst sınır 10.000 kayıttır. JSON byte boyutu, üretim süresi ve heap gözlemi ölçülür. Üretilen dosyalar benzersiz sistem temp dizinine alınır ve yalnız o dizin temizlenir. `data/archive/catalog`, `content/archive/records` ve yayın kayıtları salt okunurdur. Bu deney gerçek Next loader'ını, `MAX_RECORDS` sınırını veya üretim archive query performansını ölçmez.
