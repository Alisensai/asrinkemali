# REMAINING-WORK

| # | İş | Sahip | Neden yapılmadı | Bir sonraki en küçük güvenli adım |
|---|---|---|---|---|
| 1 | Pasaj/locator doğrulaması, claim v2 | Prompt 08 (PR #24) | Görev sınırı | #24'ü V0.6 + bu PR üzerine yeniden hedefle; `assessClaimEvidence` sözleşmesine uyum testi |
| 2 | Gerçek insan incelemesi kaydı | İnsan tarihçi/editör + Prompt 04 (PR #39) | Güvenilir kimlik yok | #39'un karar servisini aday→arşiv dönüşümüne bağlayan tasarım |
| 3 | Source Reliability (PR #20) entegrasyonu | OpenCode / Prompt 05 | #20 V0.6'da yok | #20'yi yeniden hedefle; `classifySource` arayüzünü doğrula |
| 4 | Authority Registry | Prompt 06 | Dal yok | Registry geldiğinde `createAuthorityResolver(registry)` |
| 5 | Çevrimiçi erişim denetimi (`--online`) | Görev 07 sonrası, ayrı güvenlik değerlendirmesi | Görev ağsız teslim istiyordu | Allowlist, gecikme, robots ve önbellek politikası belgesi; `checkUrlReachability` hazır |
| 6 | MAX_RECORDS (500) üzeri arşiv | OpenCode / arşiv sahibi | Sınır sessizce yükseltilmez | 168 kayıt bugün güvenli. 500'e yaklaşınca akışlı okuyucu ve göç planı. |
| 7 | Dedupe'de tek dev kova | Görev 07 bakım | Bugünkü veride yok | Kova içi token ters indeksi |
| 8 | Linux'ta symlink testleri (QA-094) | CI | Windows izni yok | `research-evidence.yml` CI koşusunda doğrula |
| 9 | Playwright tam e2e / Firefox / WebKit | Kilo QA / Prompt 02 | Arayüz değişikliği yok (N/A: No UI change) | Laboratuvar 404 testi production sunucu smoke testiyle yapıldı |
| 10 | #24 ile birleşik çakışma provası | Prompt 08 / Görev 15 | #24 başka zincirde | Görev 01 aracıyla `rehearse --execute-rehearsal` |
