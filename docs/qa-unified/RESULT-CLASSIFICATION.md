# Sonuç sınıfları ve gate ayrımı

| Durum | Anlam | CI etkisi |
|---|---|---|
| `PASS` | Test gerçekten çalıştı ve geçti | Yeşil |
| `FAIL_APP` | E2E assertion/uygulama davranışı hatası | Kırmızı |
| `FAIL_TEST` | Unit/validator/test kodu hatası | Kırmızı |
| `FAIL_INFRA` | Child başlatma, timeout, server readiness veya bağımlılık hatası | Kırmızı |
| `BLOCKED_EDITORIAL` | Gerçek insan editör/tarihçi onayı eksik | Teknik sonuçlardan ayrı; release-ready değildir |
| `WARN_DATA` | Kaynak/künye/hak belirsizliği | Uyarı ayrı sayılır |
| `SKIPPED_CONDITIONAL` | Koda bağlı, gerekçeli atlama | Başarıya sayılmaz |
| `NOT_APPLICABLE` / `NOT_INTEGRATED` | Bu dalda olmayan özellik | Test PASS değildir |
| `NOT_RUN` | Test çalışmadı (ör. browser binary yok) | Orchestrator exit 1 |
| `FLAKY` | Tekrarlarda durum değişti | Başarısızlık sayılır; retry gizleme değildir |

Ölçülen test sonucu child exit code'unu raporlar; timeout `124` olarak kayıt edilir. `BLOCKED_EDITORIAL` teknik PASS'ı gizlemez, ancak release onayı da vermez. 151 teknik published/302 onay eksikliği, 168 kayıt, 150 pending/18 stale gibi geçmiş snapshot sayıları sabit değildir. Yayın gate'i orijinal release checker'ın kodu ve raporuyla ayrı tutulur.

Rapor JSON'u `schemaVersion`, run-id, branch/commit/dirty files, OS/Node/mode/browser, sayımlar, sınıflandırma, test sonuçları, artifact'lar ve exit code taşır. Sayımlar her detay sonucu için runtime doğrulamasından geçer. `report` komutu bu JSON'dan Markdown üretir. Baseline compare test kimlik/durumlarını kıyaslar; bir baseline dosyasını overwrite etmez.
