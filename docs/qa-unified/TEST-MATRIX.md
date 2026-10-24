# QA kapsam matrisi

Manifest: `tools/qa-unified/manifest.json`. Koşucu manifestte kayıtlı suite'i çözer; route testleri yalnız manifestte kayıtlı ve kaynak dosyası mevcut olan gerçek Next.js rotalarını açar. `/arsiv/[slug]` ve `/yayinlar/[slug]` gibi dinamik rotalar için sentetik/public kayıt yaratılmaz.

| Suite | Gerçek kapsam | Şu anki durum |
|---|---|---|
| `smoke` | `/`, `/ataturk`, `/kronoloji`, `/arsiv`, `/yayinlar`, `/tarihte-bugun`, `/hakkimizda`, `/api/health-integration`, `robots.txt`, `sitemap.xml`; browser/page hatası; API insan onay alanı; Chromium | Kod mevcut, dev/prod koşumu ayrı |
| `responsive` | Ana sayfa 320, 360, 375, 390, 430, 768, 1024, 1440, 1536 px; gerçek taşan element adayları; desktop 1440 ve mobile 360 screenshot | Smoke spec içinden seçilir; route × browser patlaması yok |
| `unit` | `web/tests`, `scripts/archive/tests`, `tools/release-check/tests`, `tools/editorial-review/tests` ve QA kontrat testleri | Gerçek kurulumdan sonra raporlanır |
| `archive` | Archive Node validator/search/today/security testleri | Gerçek mevcut test dosyaları |
| `publishing` | `web/tests/*publishing*` | İnsan onayı test edilmez/üretilmez |
| `editorial` | `tools/editorial-review/tests` | Onay kayıtlarını değiştirmez |
| `scale` | Seed'li sentetik 500/2.000/10.000 kayıt; byte ve heap gözlemi; system temp | Uygulama loader'ı yüklenmiyor; loader kapasitesi iddia edilmez |
| `performance` | `/arsiv` production navigasyonunda 3 örnek (ilk/sonraki sıcak örnek), median/IQR, NavigationTiming, encoded body ve JS kaynak sayısı | Bir makine/tek koşu; Lighthouse veya karşılaştırmalı baseline değildir |
| `accessibility` | Axe serious/critical ve manuel ekran okuyucu | `NOT_INTEGRATED` / manuel borç; axe web dependency'si yok |
| `cross-browser` | Chromium, Firefox ve WebKit üzerinde aynı route/viewport smoke | Dev koşumu 57/57 geçti; production koşumu ayrı raporlanır |
| `network` | Dar RSC prefetch exception, negatif iptal/404/500 kontrolleri | `NOT_INTEGRATED`; PR #25 helper bu base'de yok, ikinci filtre yazılmadı |
| `security` | Güvenli offline regressions | Ayrı archive/release check'ler mevcut; bu suite `NOT_RUN`, sızma testi değildir |

Sabit bir `2px` tolerans dışında tüm elementler için taşma kaynağı ilk 10 aday olarak hata bağlamına eklenir. Sadece tanımlı rota/genişlikler raporlanır. Dokunmatik hedef, form hatası ilişkisi, klavye menüsü/modal focus trap, 404 görünürlüğü, hatalı tarih ve detay hak metni bu teslimde otomatik sınanmıyor (`NOT_RUN`); mevcut uygulama davranışına bakmadan test eklemek stale selector/sahte geçiş üretirdi.

50 senaryonun madde bazlı `implemented` / `existing` / `not-run` / `not-integrated` dökümü bu dosyanın [makine-okunur manifestindeki `scenarioCoverage`](../../tools/qa-unified/manifest.json) alanındadır. Bir modülün rota kaynağı yoksa envanter `NOT_INTEGRATED`; hiç koşturulmayan test `NOT_RUN` verir.
