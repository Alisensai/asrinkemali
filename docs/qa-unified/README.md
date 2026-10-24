# Birleşik QA

`tools/qa-unified/manifest.json`, suite seçimi, modül envanteri ve 50 senaryo kapsamı için tek kaynaktır. CLI Node ESM ile çalışır; komutları `shell: false` ve sabit argv listeleriyle başlatır. Ürün kaynaklarını, yayın kayıtlarını veya insan onayı alanlarını değiştirmez.

## Kurulum ve hızlı başlangıç

Web bağımlılıkları yoksa repo kökünden `npm ci --prefix web --no-audit --no-fund` çalıştırın. Tarayıcı binary'si yoksa `npm exec --prefix web -- playwright install chromium` ile yalnız Chromium'u kurun. QA araçları kurulum veya ağ erişimi başlatmaz.

```powershell
node tools/qa-unified/cli.mjs doctor
node tools/qa-unified/cli.mjs inventory
node tools/qa-unified/cli.mjs plan --target=v06 --suite=smoke --mode=dev
node tools/qa-unified/cli.mjs run --suite=unit --mode=unit
node tools/qa-unified/cli.mjs run --suite=smoke --mode=dev
node tools/qa-unified/cli.mjs run --suite=cross-browser --mode=dev --browser=all
```

Production smoke/performance için önce `npm run build --prefix web`, sonra `--mode=production` kullanılır. Birleştirilmiş koşu `node tools/qa-unified/cli.mjs run --suite=all --mode=production`; Chromium ve production build yoksa sonuç PASS değil, `NOT_RUN`/altyapı hatasıdır. `cross-browser` suite'i Chromium, Firefox ve WebKit'i sıralı çalıştırır; eksik browser `NOT_RUN` olarak raporlanır.

`run` sonuçları çakışmasız `qa/results/<run-id>/` altında `screenshots/`, `traces/`, `raw-logs/`, `structured-report/` ve `playwright/` alt dizinlerine yazılır. Rapor yolları `qa/results/` dışına çıkamaz, dosyalar üzerine yazılmaz. JSON raporu şema/sayım doğrulamasından geçer; Markdown yalnız JSON'dan türetilir. Her iki rapor run-id, branch/commit, dirty dosyalar, mod, browser, test bazlı sonuç ve artifact yollarını içerir:

```powershell
node tools/qa-unified/cli.mjs report --input=qa/results/<run-id>/structured-report/report.json --format=md
node tools/qa-unified/cli.mjs compare --baseline=qa/results/<base>/structured-report/report.json --current=qa/results/<head>/structured-report/report.json
```

Baseline'lar otomatik güncellenmez. Compare sabit test kimliklerini ve durum geçişlerini karşılaştırır; ortam eşit değilse `environmentComparable: false` verir. Sentetik scale komutu seed ile 500/2.000/10.000 kayıt üretir, en çok 10.000 ile sınırlar ve yalnız işletim sistemi geçici dizinine yazar.

## Modlar ve hata anlamı

- `dev`: Her koşu kendi worktree'sinde `127.0.0.1` üzerinde boş port seçer, Next dev child sürecinin readiness'ini bekler ve yalnız kendi child process tree'sini kapatır.
- `production`: `web/.next/BUILD_ID` yoksa sunucu başlatmaz; var olan worktree build'ini ayrı portta çalıştırır. Başka worktree/ajan sunucusuna bağlanmayı denemez.
- `unit`: Birim testlerini browser olmadan çalıştırır.

`FAIL_APP`, `FAIL_TEST`, `FAIL_INFRA`, `BLOCKED_EDITORIAL`, `WARN_DATA`, `SKIPPED_CONDITIONAL`, `NOT_APPLICABLE`, `NOT_INTEGRATED`, `NOT_RUN` ve `FLAKY` birbirinin yerine kullanılmaz. Editorial blocker teknik PASS'ı iptal etmez; release-ready anlamına da gelmez. Chromium yokluğu gerçek bir PASS üretemez.

## Sınırlar

Otomatik axe/WCAG değerlendirmesi, elle ekran okuyucu denetimi, Firefox/WebKit, Claude PR #25'in dar RSC-prefetch helper'ı ve yayımlanmamış modüller bu tabanda entegre değildir. Envanter bunları NOT_INTEGRATED/NOT_RUN olarak gösterir. Dış servis/üçüncü taraf test trafiği, deployment, DNS değişikliği, sahte yayın/onay ve katalog yazımı yoktur. Ayrıntı: [test matrisi](TEST-MATRIX.md), [Kilo envanteri](KILO-PR07-PR13-INVENTORY.md), [sonuç sınıfları](RESULT-CLASSIFICATION.md).
