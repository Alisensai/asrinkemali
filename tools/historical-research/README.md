# MKA EVIDENCE ENGINE V0.7

Asrın Kemali için tarihî kaynak keşfi, arşiv boşluk analizi, provenans ve aday
havuzu sistemi. Node ≥ 20, bağımlılıksız, ESM.

## İlkeler

- Hiçbir başlık, URL, künye, tarih uydurulmaz; eksik alan boş kalır.
- HTTP 200, tarihî doğruluk kanıtı değildir; yalnızca erişilebilirlik göstergesidir.
- Yapay zekâ incelemesi insan uzman onayı değildir.
- Aynı özgün belgeden türeyen sayfalar bağımsız iki kanıt sayılmaz.
- Aday havuzu yayımlanmış arşiv değildir; hiçbir aday insan onayı olmadan arşive girmez.
- `published` durumu bu yazılımla üretilemez (kod düzeyinde engellidir).

## Yapı

```
tools/historical-research/
  lib/
    types.mjs           veri sözleşmesi (aday, iddia, boşluk raporu) + katalog yazma koruması
    archive-reader.mjs  OpenCode'un load.mjs okuyucusunu yeniden kullanır
    gap-analysis.mjs    yıl/tema dağılımı, eksik dönem tespiti
    candidates.mjs      aday havuzu: doğrulama, durum makinesi, disk G/Ç (korumalı)
    dedupe.mjs          URL normalizasyonu, arşiv kimliği, aynı-kök türetme
    provenance.mjs      iddia-kanıt ağı, bağımsızlık, çelişki işaretleme
    convert-dryrun.mjs  aday → ArchiveRecord v1.1.0 TASLAK dönüşümü
    url-security.mjs    SSRF önleyici yapısal URL denetimi
    report.mjs          Markdown/JSON/CSV raporlar
  cli.mjs               komut satırı
  scripts/              havuz oluşturucu, rapor yazarı
  tests/                75 otomatik test (node:test)
```

## Kullanım

```bash
node cli.mjs gap-report [--from 1881 --to 1918] [--format md|json] [--out DOSYA]
node cli.mjs pool-status [--format md|json|csv] [--out DOSYA]
node cli.mjs dry-run [--id src-2026-NNNN | --all]
node cli.mjs claims
node cli.mjs verify-url URL
npm test
```

## Durum Makinesi (aday)

`new → investigating → (insufficient_info | awaiting_human_review) → import_ready → (ayrı süreçte insan onayıyla katalog PR'ı)`

Hiçbir geçiş otomatik olarak insan onayı üretmez. `import_ready` yalnızca dry-run
dönüşüm hazırlığını ifade eder.

## Güvenlik

- Ağ getirmesi yapılmaz; URL denetimi yapılsaldır (şema, port, özel IP, meta host, userinfo).
- `assertNoCatalogWrite` ile `data/archive/catalog/`, `content/archive/records/`, `schemas/`
  yollarına yazma reddedilir.
- Dry-run çıktısı yalnızca `data/research/candidates/exports/` altına yazılabilir.

## Ayrıntılı Dokümanlar

- `docs/research/perplexity/DEPO-ANALIZI.md`
- `docs/research/perplexity/BOSLUK-RAPORU-2026-10-23.md`
- `docs/research/perplexity/KAYNAK-ADAYLARI-RAPORU.md`
- `docs/research/perplexity/TEST-RAPORU.md`
- `docs/research/perplexity/INTEGRASYON.md`
- `docs/research/perplexity/ILERLEME.md`
