# Güvenlik notları — integration-control

| Konu | Uygulama | Test |
|---|---|---|
| Kabuk enjeksiyonu | `spawnSync` argüman dizisiyle çağrılır; kabuk yalnız Windows `.cmd` (npm/npx) için ve yalnız sabit argümanlarla açılır; izin verilen komut listesi `git, gh, npm, npx, node, python` | `run("rm")` reddedilir |
| Girdi doğrulama | PR numarası (kanonik tam sayı), git ref (`-` önek, `..`, boşluk, `.lock` yasak), SHA (40 hex), prova komutu (`e2e:e2e/…spec.ts` deseni) | core testleri |
| GitHub | Yalnız `gh api -X GET`; mutasyon çağrısı yok. 403/401 → `forbidden`, 429 → `rate_limited` + çevrimdışı öneri | core testleri |
| Gizli bilgi | Token desenleri (`ghp_`, `gho_`, `github_pat_`, `Bearer`, `?token=`) ve kullanıcı ev dizinleri her yazılı çıktıda redakte edilir; kayıt yolları depo-göreli yapılır | core testleri |
| Güvenilmeyen metin | PR başlık/açıklamaları Markdown'da kaçışlanır (HTML, bağlantı, tablo kırılması); CSV'de formül enjeksiyonu engellenir | core testleri |
| Dosya yazımı | Yalnız `docs/integration-control/reports/` ve işletim sistemi geçici dizini. `content/archive` vb. reddedilir | core testleri |
| Depo kimliği | Her komut önce `origin`'in `Alisensai/asrinkemali` olduğunu doğrular | `assertExpectedRepo` |
| Prova izolasyonu | Ayrık worktree, geçici dizin + sahiplik işareti. Push yok. Ana deponun HEAD, durum ve ref parmak izi önce/sonra karşılaştırılır. Silme yalnız işaretli ve temiz dizinde | git testleri + gerçek provalar |
| Zaman aşımı | Her alt süreçte; zaman aşımı `blocked` olarak raporlanır | git testleri |

**Bilinen sınırlar:**
- `gh` oturumunun kapsamı araç tarafından daraltılamaz. CI'da yalnız `contents: read` token'ı kullanılmalıdır.
- patch-id eşitliği tam semantik içerilmeyi kanıtlamaz.
- `mergeable: true` semantik uyumluluk kanıtı değildir.
