# Entegrasyon matrisi

| Kaynak | Kullanım | Yazma yetkisi | Risk |
| --- | --- | --- | --- |
| `scripts/archive/lib/security.mjs` | URL, metin ve prototype-pollution kontrolleri | Yok | Düşük; salt-okunur import |
| `scripts/archive/lib/text.mjs` | Türkçe fold/slug karşılaştırması | Yok | Düşük; özgün başlık korunur |
| `data/archive/catalog/` | ID/slug/kaynak URL çakışma indeksi | Yok | Orta; snapshot her çalışmada tekrar hesaplanır |
| `schemas/archive-record.schema.json` | Tam kayıt gereksinimlerinin referansı | Yok | Düşük |
| `tools/editorial-review/`, yayın defteri | Kullanılmaz | Yok | Kritik; insan kararına müdahale yasak |
| PR #25/#28 Fortress | Korunur; değişiklik yapılmaz | Yok | Kritik |
