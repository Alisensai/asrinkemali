# CI planı

`.github/workflows/qa-unified.yml` bağımsız, read-only izinli, 15 dakikalık Chromium geliştirme smoke job'ıdır. Sadece QA runner/spec, uygulama ve package dosyaları değişince PR'da çalışır; manuel `workflow_dispatch` de vardır. Web lockfile kuralları ile `npm ci`, resmi Playwright Chromium kurulumu, QA kontrat testleri ve izolasyonlu smoke koşar. Raporlar başarısız koşuda da 7 gün artifact olarak yüklenir.

Mevcut `.github/workflows/ci.yml`, `nextjs-ci.yml` ve `release-quality.yml` değiştirilmedi. Böylece release/editoryal gate yeni QA workflow'uyla yeşile çevrilemez. Next.js CI production build/E2E kapsamını taşır; QA smoke bunu çoğaltıp tüm tarayıcı/viewport kombinasyonlarına yaymaz. Firefox/WebKit, nightly schedule, deployment, pull-request write permissions veya yeni ücretli servis eklenmedi. GitHub run status PR #33 base kontrolünden sonra bu PR tetiklendiğinde doğrulanmalıdır; yerel PASS, CI PASS değildir.
