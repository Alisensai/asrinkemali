# 09 — Test raporu (gerçek koşular)

**Ortam:** Windows 11, Node v24.19.0, Python 3 (yerel), 6 çekirdek. **Taban:** PR #29 @ `296da528eb`. **Tarih:** 2026-10-24.

## Komutlar ve sonuçlar

| Katman | Komut | Sonuç |
|---|---|---|
| Güven aracı (A–F + ölçek) | `node --test tools/editorial-trust/tests/*.test.mjs` | **59 test: 58 geçti, 0 başarısız, 1 atlandı**. E67 symlink testi: Windows'ta symlink izni yok; Linux CI'da koşar. |
| Web güven sözleşmesi | `cd web && node --test tests/editorial-trust.test.mjs` | **4/4** |
| Web birim (tamamı) | `cd web && npm test` | **76/76** (taban 72 + yeni 4) |
| Web typecheck | `cd web && npm run typecheck` | **0 hata** (`tsc --listFilesOnly`: 14 editorial-trust dosyası kapsamda) |
| Web lint | `cd web && npm run lint` | **0 hata/uyarı** |
| Web production build | `cd web && npm run build` | **başarılı** (Next.js 16). `.next/static` ve `.next/server` içinde güven modülü izi yok: hiçbir route içe aktarmıyor. |
| Release checker (PR #12, Python) | `python -m unittest discover -s tools/release-check/tests` | **129/129** |
| Editorial review (PR #15, Python) | `python -m unittest discover -s tools/editorial-review/tests` | **45 test, OK** (1 atlandı; mevcut testin kendi atlaması) |
| Arşiv motoru | `node --test scripts/archive/tests/*.test.mjs` | **74/74** |
| Fortress araçları | `node --test tools/mka-fortress/tests/*.test.mjs` | **15/15** |
| `git diff --check` (yeni dosyalar dahil, staged) | | temiz |
| Gerçek repo kapı denetimi | `node tools/editorial-trust/cli.mjs gate-check --root .` | **çıkış 1**, `release_ready=false`. Beklenen editoryal engel. |

## Gerçek sayımlar (dinamik)

| Ölçüm | Değer |
|---|---|
| Katalog kaydı / form | 168 / 168 |
| Eksik form / yetim form / yinelenen kimlik / geçersiz form / okunamayan dosya | 0 / 0 / 0 / 0 / 0 |
| pending / stale / doğrulanmamış iddia | 168 / 0 / 0 |
| Kimliği doğrulanmış gerçek uzman incelemesi | **0** |
| Doğrulanmış gerçek editör kararı | **0** |
| Teknik `published` etiketi | 151 |
| Hak engelli (`unknown`) | 2 |
| Eksik kaynak konumu | 0 |
| **Yayına hazır** | **0** |

## Testlerin yakaladığı gerçek hatalar (geliştirme sırasında)

1. **DTO yanlış sonraki adım:** Kimlik/politika yokken "Tarih uzmanı incelemesi" diyordu, çünkü kritik bulgular `not_configured` sonucunu gölgeliyordu. Web testi yakaladı; DTO'ya yapılandırma açıkça verildi.
2. **Tarihi bilinmeyen draft kayıt hatalı `schema_invalid` sayılıyordu:** Arşiv şeması `precision: "unknown"` + `start: null` değerine izin verir. Bu artık yapısal hata değil, tarih kanıt kontrolünde `fail`.
3. **Kapı hiç açılamaz durumdaydı:** Eski form yoksa `review_form_missing` hata seviyesindeydi; doğrulanmış iki karar olsa bile `allow` üretilemiyordu. Önem seviyesi `warning` yapıldı. A12 testi kapının gerçek kararlarla açıldığını, herhangi bir bayrak düşünce kapandığını kanıtlar.
4. **Geri çekme tekrarında çift olay:** `revokeDecision` idempotent değildi. C45'e tekrar senaryosu eklendi ve düzeltildi.

## 96 senaryo kapsam matrisi

| Aralık | Durum |
|---|---|
| A01–A16 | Hepsi otomatik (`model-identity.test.mjs`; A09: C45 içinde) |
| B17–B32 | Hepsi otomatik |
| C33–C48 | Hepsi otomatik (`time-revision-audit.test.mjs`) + yarım yazım (C-partial) + audit yapısal (C-audit) |
| D49–D64 | Hepsi otomatik (`source-input.test.mjs`, D61: C45, D63/D64: `time-revision-audit`) |
| E65–E80 | Otomatik. **E67 Windows'ta atlandı** (symlink izni); Linux CI'da koşar. |
| F81–F88, F96 | Otomatik, gerçek repo (`real-repo.test.mjs`) |
| F89 (#21 scheduler dry-run atlaması) | Yeni test yazılmadı. Mevcut `web/tests/publishing-platform.test.mjs` ve `publishing-integration-preflight.test.mjs` kapsıyor; dosyalara dokunulmadı, regresyonda koşuldu. |
| F90 (#25 yeniden yayın güvenliği) | Mevcut `publishing-hardening.test.mjs` ve `security-publishing.test.mjs` (regresyon) |
| F91 (`/yonetim` kapalı) | #28 bu tabanda. Mevcut `security-access.test.mjs` proxy davranışını sınar. #26 bu tabanda **yok**; #26 × #28 çakışması Görev 01 raporunda. |
| F92 (#27 sergi görünürlüğü) | **Uygulanamaz**: #27 bu tabanda yok. Yalnız `evaluateExhibitionReviewReadiness` sözleşme testi (A12). |
| F93 | Web typecheck/lint/build (yukarıda) |
| F94 | `git diff --check` temiz |
| F95 | Ekran görüntüsü commitlenmedi (`git show --stat` ile kontrol edildi) |

## Ölçek (sentetik, `node tools/editorial-trust/bench/scale.mjs 500 2000 10000`)

| Kayıt | Analiz (ms) | Ham G/Ç tabanı (ms) | Dışa aktarma (ms) | JSON | Tepe RSS | Eşleşen / eksik / stale / hak engelli / hazır |
|---|---|---|---|---|---|---|
| 500 | 1.528 | 854 | 74 | 1,9 MB | 98 MB | 495 / 5 / 20 / 10 / 0 |
| 2.000 | 16.161 | 16.576 | 244 | 7,6 MB | 190 MB | 1.980 / 20 / 80 / 40 / 0 |
| 10.000 | 73.466 | 75.218 | 1.088 | 37,9 MB | 576 MB | 9.900 / 100 / 400 / 200 / 0 |

**Yorum:**
- Analiz süresi, aynı dosyaları yalnız okuyup ayrıştırma süresiyle (ham G/Ç tabanı) hemen hemen aynıdır. Darboğaz bu makinedeki dosya G/Ç'sidir: Windows'ta geçici dizindeki yeni dosyalar taranıyor. Değerlendirme mantığı değildir.
- Gerçek repoda 168 kayıt + 168 form ≈ 0,7–1 sn.
- İlk denemede dosya başına iki `realpath` vardı; dizin başına bire indirildi. Güvenlik denetimi korundu: dizin realpath + dosya lstat.
- **Bilinen sınır:** 10k'da rapor nesnesi bellekte tutulur (576 MB RSS, 38 MB JSON). Daha büyük kataloglar için akışlı (NDJSON) satır çıktısı önerilir; bu görevde yapılmadı.
- Sayılar 6 çekirdekli, başka ajanların süreçleriyle paylaşılan bir makinededir. Linux CI'da farklı olacaktır.
