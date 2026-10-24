# Arşiv içe aktarma (staging-only)

Bu araç, yerel CSV/JSON adaylarını **yalnızca** insan incelemesi için staging paketi hâline getirir. Ağ isteği yapmaz; `data/archive/`, `content/archive/`, yayın defteri ve editörlük kararlarını yazmaz. `published`, `approved` veya benzeri giriş alanları güvenilmeyen iddia olarak değerlendirilir.

## Çalıştırma

```powershell
cd tools/archive-ingest
npm test
npm run ingest -- preview --input=tests/fixtures/valid-tr.csv --profile=generic-catalog-v1 --generated-at=2026-10-24T00:00:00.000Z
npm run ingest -- stage --input=tests/fixtures/valid-tr.csv --profile=generic-catalog-v1 --generated-at=2026-10-24T00:00:00.000Z --write-staging --out=data/ingest-staging/local-example
```

`stage` yalnız izinli staging kökü altında üç rapor oluşturur: `ingest-run.json`, `ingest-run.md` ve formül-enjeksiyonundan korunmuş `ingest-issues.csv`. Aynı sabit girdinin aynı hedefe tekrar yazılması no-op olur; farklı içerik çakışma hatası verir. `--commit`, `--publish`, insan onayı bayrakları ve katalog hedefleri reddedilir.

## Girdi sözleşmesi

Desteklenen profil `generic-catalog-v1`'dir. CSV (UTF-8/BOM, RFC4180 tırnakları) veya JSON nesnesi/dizisi/`records` zarfı kullanılabilir. Her satır aday kimliği, başlık, kurum, kurumsal HTTPS kaynak URL'si ve takvim geçerli bir tarih taşımalıdır. `type`, `license`, `source_title`, `summary`, `category` eksikse kayıt ancak insanın tamamlayacağı aday olarak kalır; hiçbir aday yayın uygun değildir.

Bu sürüm şema-uyumlu tam `ArchiveRecord` üretmez ve gerçek kataloğa aktarım yapmaz. Gerçek şema ve iş kuralı sınırları `schemas/archive-record.schema.json` ile `scripts/archive/lib/validate.mjs` kaynaklıdır; araç URL ve metin güvenliği için mevcut yardımcıları salt-okunur tüketir.
