# GÖREV 02/30 — Birleşik QA koşum raporu

**Çalışma dalı:** `alisensai-copilot-v07-qa-unification`

**QA kod commit'i:** `bdb95b97cf87b9b7652eea48808773d4dff61c21`

**Stack base:** PR #33, `feature/claude-v07-integration-control-plane` @ `f3da6df8dcbfd4bfdd141d2d9d6063bb8ac18f0b`
**Rapor tarihi:** 2026-10-24

## Gerçek koşumlar

| Koşum | Sonuç | Kanıt |
|---|---|---|
| QA platform sözleşme testleri | 15 geçti / 0 başarısız | `node --test tools/qa-unified/tests/*.test.mjs` |
| Birleşik `unit` suite | 5 test grubu geçti / 0 başarısız: web (3 dosya), archive (9 dosya), QA (3 dosya), release-check Python ve editorial-review Python | `qa/results/qa-unit-post-commit/structured-report/report.json` |
| Web unit testleri | 34 geçti / 0 başarısız / 0 atlandı | `npm test` (`web/`) |
| Web lint, typecheck, production build | Üçü de geçti | `npm run lint`, `npm run typecheck`, `npm run build` (`web/`) |
| Chromium, Firefox, WebKit geliştirme smoke'u | 57 geçti / 0 başarısız / 0 atlandı; her motor için 19 route/viewport kontrolü | `qa/results/qa-cross-browser-dev-commit/structured-report/report.json` |
| Birleşik production suite | 38 geçti / 0 başarısız / 0 atlandı / 0 `NOT_RUN`; Chromium | `qa/results/qa-all-production-commit/structured-report/report.json` |
| Production performans ölçümü | `/arsiv` rotasında 3 gerçek navigasyon örneği; medyan 437,53 ms, IQR 225,67 ms | `qa/results/qa-all-production-commit/structured-report/performance-measurement.json` |
| Sentetik ölçek deneyi | Seed 42; 500, 2.000 ve 10.000 kayıt; yalnız sistem geçici dizini | Production koşumundaki `structured-report/synthetic-scale.json` |
| QA doctor | Node v24.19.0, Python 3.14.5 ve Chromium/Firefox/WebKit bulundu; gizli ortam değişkenlerinin yalnız ad sayısı uyarıldı, değerleri okunmadı/yazdırılmadı | `node tools/qa-unified/cli.mjs doctor` çıktısı |
| Son CI build düzeltmesi doğrulaması | `npm run build -- --webpack` geçti. Temsilî varsayılan-config E2E ilk denemede `/yayinlar` navigasyonunda 30 sn timeout verdi; aynı tek testin tekrarı 1 geçti (26,4 sn test süresi). İlk başarısızlık gizlenmedi; tam E2E yerine dar smoke kullanıldı. | `web/` çalışma dizininde yerel koşum; Playwright çıktıları `web/test-results/` altında |

Production route smoke'u manifestteki 10 gerçek public route'u (`/`, `/ataturk`, `/kronoloji`, `/arsiv`, `/yayinlar`, `/tarihte-bugun`, `/hakkimizda`, entegrasyon health API'si, `robots.txt`, `sitemap.xml`) ve 320, 360, 375, 390, 430, 768, 1024, 1440, 1536 px responsive matrisini kapsar. Dev ve production sunucuları ayrı, loopback ve koşuya özel portlarda açılıp kapatıldı. Her rapor commit, branch, mod, browser, run-id ve dirty-file bilgisi taşır; Markdown aynı doğrulanmış JSON'dan üretilir.

Desktop ve mobile ekran görüntüleri:

- Production desktop: `qa/results/qa-all-production-commit/screenshots/home-route-smoke-chromium-1440px.png`
- Production mobile: `qa/results/qa-all-production-commit/screenshots/home-route-smoke-chromium-360px.png`
- Browser matrisinin desktop/mobile görüntüleri aynı koşumun `home-routes-<browser>-<browser>-{1440,360}px.png` dosyalarıdır.
- Playwright trace ayarı hata halinde trace saklar. Son başarılı koşumlarda hata oluşmadığı için `traces/` boş; trace kanıtı varmış gibi gösterilmemiştir.

Önceki production raporuyla ortam eşit baseline karşılaştırması: 20 test kimliği eklendi, 3 eski toplu kimlik ayrıntılı test sonuçlarına ayrıldığı için kaldırıldı; 0 regression ve 0 durum gerilemesi. Karşılaştırma dosyası `qa/results/qa-all-production-commit/baseline-comparison.json`; baseline raporu `qa/results/qa-all-production/structured-report/report.json`. Baseline dosyası değiştirilmedi.

## Açıkça başarısız veya uygulanamayanlar

- İlk geliştirme smoke denemesi Windows mutlak test yolu yüzünden Playwright'ta **“No tests found”** ile başarısız oldu. Bu uygulama hatası değildi: dosya seçimi config'in `testMatch` girdisine taşındı. Sonraki smoke ve commit sonrası üç motorlu koşum geçti. `test.skip` eklenmedi.
- Release quality runner 237 test geçti, 0 test başarısız oldu; ancak aynı rapor **302 critical bulgu, 11 warning ve 168 expert review** saydı, `Release-ready: False` ve komut exit code 1 verdi. Bunlar bu raporun oluşturulduğu andaki bulgulardır, test beklentisi veya sabit katalog sayısı değildir. Editoryal/uzman onayı ve yayın kapısı kapalı kalır; teknik QA geçişi yayın onayı değildir. Rapor: `qa/results/release-quality-post-commit/release-quality.md` ve `.json`.
- `accessibility`: **NOT_INTEGRATED** — web workspace'inde axe entegrasyonu ve manuel ekran okuyucu kanıtı yok (`qa-accessibility-post-commit`).
- `network`: **NOT_INTEGRATED** — PR #25'in dar RSC-prefetch helper'ı bu stack base'inde yok; kopya filtre yazılmadı (`qa-network-post-commit`).
- `security`: **NOT_RUN** — bu iş sızma testi iddiasında bulunmaz; mevcut offline archive/release kontrolleri ayrı çalıştı (`qa-security-post-commit`).
- 50 senaryo manifest sınıflandırması: 31 `implemented`, 6 `existing`, 9 `not-run`, 3 `not-integrated`, 1 `not-applicable`. Senaryo başına kanıt ve gerekçe `tools/qa-unified/manifest.json` içindeki `scenarioCoverage` alanındadır.

## 50 senaryodan ayrı teslim/kabul listesi

| Kabul maddesi | Durum / kanıt |
|---|---|
| Dinamik manifest, suite seçen çalışan Node ESM CLI, `doctor`, `inventory`, `plan`, `run`, `report`, `compare`, `synthetic` | Tamamlandı; `tools/qa-unified/` |
| Güvenli alt süreç argv/exit/timeout ve koşuya özel dev/prod server yaşam döngüsü | Tamamlandı; test edildi, `shell:false`, loopback ve owned-process cleanup |
| Sürümlü JSON, JSON'dan Markdown, sınıflandırma, run-id/commit/artifact ve baseline karşılaştırması | Tamamlandı; post-commit raporları ve parity testleri |
| Deterministik geçici dizin sentetik deneyleri ve modül QA kontratı | Tamamlandı; fixture veya kaynak katalog yazımı yok |
| Bağımsız, düşük maliyetli QA CI | Tamamlandı; `qa-unified.yml` manifest-selected unit ve Chromium dev smoke'u çalıştırıp `qa/results/` artifact'larını `always()` ile 7 gün yükler. Test adımları `continue-on-error` kullanmaz; başarısız/`NOT_RUN` exit kodu job'u başarısız kılar. |
| PR CI sonucu | `qa-smoke`, `Asrin Kemali CI` ve önceki `Next.js CI` koşumları geçti. Commit `5045651` üzerindeki eşzamanlı Next.js CI koşumları ayrıştı: run `40054307821` build'de Turbopack font-modül hatasıyla durdu; run `40054303232` aynı commit'te build'i geçti ve E2E'ye ilerledi. Bu bulgu üzerine yalnız Next.js CI build komutu desteklenen `--webpack` seçeneğine sabitlendi; bu değişikliğin workflow doğrulaması bekleniyor. Release Quality E2E'de önce 5 QA test keşif, sonra 1 Turbopack server-startup hatası görüldü; ikisi test-only config değişiklikleriyle giderildi. CI workflow'u release/editoryal gate'in yerine geçmez veya onu gevşetmez. |
| Kaynak arşiv/form/yayın kayıtları, insan onayları, deployment/DNS veya üçüncü taraf ağ testi | Değiştirilmedi / yapılmadı |
| PR #33 baseline | 23 integration-control testinden 22 geçti, 1 mevcut başarısız: `tools/integration-control/tests/git.test.mjs` aynı patch-id için `ancestor_included` döndürüyor, test `content_equivalent_likely` bekliyor. Bu #33 taban bulgusudur; #33 dosyaları değiştirilmedi. |

Kapsam dışındaki UI etkileşimleri (menü/modal klavye akışı, arşiv filtreleri, tarih hata durumları), axe, PR #25 network filtresi ve entegre olmayan modüller mevcut ürüne göre sahipleri tarafından tamamlanmalıdır. Modül envanteri ve devirler: [Kilo PR #7/#13 envanteri](KILO-PR07-PR13-INVENTORY.md), [üst akış devri](UPSTREAM-HANDOFF.md), [sonraki görev sözleşmesi](NEXT-PROMPTS-INTEGRATION.md).

## PR CI'da bulunan Playwright izolasyon sorunları

PR'ın ilk GitHub koşumunda `Next.js CI` ve `Release quality` içindeki genel `npm run test:e2e` komutu yeni `web/e2e/qa-unified/performance.spec.ts` dosyasını varsayılan `web/playwright.config.ts` altında da keşfetti. Bu genel koşu `ASRIN_QA_MODE` sağlamadığı için dosyanın beş viewport projesinin tamamı `Expected: "production", Received: undefined` ile başarısız oldu; E2E toplamı 413 geçti / 5 başarısızdı. Bu QA test izolasyonu regresyonuydu, yayın kapısı bulgularından ayrı tutuldu.

Varsayılan config'e `testIgnore: ["**/qa-unified/**"]` eklendi. Unified CLI'nin `playwright.qa-unified.config.ts` config'i bu dışlamayı kullanmaz; doğrudan production performans suite'i 1/1 geçti ve genel `npx playwright test --list` çıktısı QA-only dosyaları içermedi. Sonraki PR koşumunda `Next.js CI` ve `qa-smoke` geçti, ancak Release Quality E2E'de 237 test geçti / 1 başarısız oldu.

Tek başarısız testin nedeni `next/font/google` içindeki Cormorant Garamond font modülünü Next dev'in varsayılan Turbopack server'ında çözememesiydi (`@vercel/turbopack-next/internal/font/google/font`). Bu bir test sunucusu başlangıç/derleme hatasıdır; route assertion veya yayın kapısı hatası değildir. Varsayılan Playwright `webServer.command` test-only olarak `next dev --webpack` kullanacak şekilde değiştirildi; uygulama layout/font/kaynakları değiştirilmedi. Doğrudan doğrulama `npx playwright test e2e/site.spec.ts --project=desktop-1536x1024 --grep "rotalar dürüst boş durum"`: 1 geçti. `npm run typecheck` ve ayrı unified production performance suite'i de geçti. Tam yerel `quality_runner.py --e2e` turu 15 dakikadan uzun sürdüğü için durduruldu; bu yerel denemeye başarı/başarısızlık sonucu atanmamıştır. Yeni commit sonrası GitHub E2E rerun sonucu beklemededir.

## Next.js CI production-build kararsızlığı

Commit `5045651` üzerindeki Next.js CI run `40054307821`, `npm run build` sırasında Turbopack'in `next/font/google` için `@vercel/turbopack-next/internal/font/google/font` modülünü çözememesi ve `NextFontGoogleFontFileReplacer` hatalarıyla başarısız oldu. Aynı commit'teki run `40054303232` build adımını geçti; dolayısıyla bu sonuç aynı kod için tutarlı bir uygulama regresyonu göstermiyor, CI/Turbopack kararsızlığına işaret ediyor. `next build --help` içinde `--webpack` seçeneği doğrulandı. Yalnız `.github/workflows/nextjs-ci.yml` içindeki build komutu `npm run build -- --webpack` olarak sabitlendi; app/layout, font kaynakları, ürün kodu ve varsayılan yerel build komutu değiştirilmedi. Yerelde aynı Webpack build komutu geçti; dar E2E smoke'u ilkinde 30 sn timeout verdi, tekrarda 1/1 geçti. Bu workflow-only düzeltmenin GitHub CI sonucu henüz yoktur. Release Quality kendi runner'ındaki build'i ayrıca yürüttüğünden, o workflow'un sonucu ayrı izlenmelidir.

Release Quality raporları aynı anda yayın kapısını da gösterdi: ilk koşumda 650 test geçti / 5 başarısız ve 303 critical, 11 warning, 168 expert review; sonraki koşumda 237 geçti / 1 başarısız. Her ikisinde `Release-ready: False`. E2E yapılandırma hataları ile editoryal/uzman review engelleri ayrı sınıflardır. Bu anlık sayılar yalnız gözlenen rapor çıktılarıdır, sabit test beklentileri değildir; yayın gate'i değiştirilmedi.
