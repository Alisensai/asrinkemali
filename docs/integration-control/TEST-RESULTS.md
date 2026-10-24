# Test sonuçları — Görev 01

**Ortam:** Windows 11, Node v24.19.0, npm 11.17.0, git 2.55.0, gh 2.97.0. Taban V0.6 @ `10cdbfd`. Tarih: 2026-10-24.

| Katman | Komut | Sonuç |
|---|---|---|
| Araç birim + gerçek git testleri | `node --test tools/integration-control/tests/*.test.mjs` | **23/23 geçti** |
| Arşiv motoru (V0.6) | `node --test scripts/archive/tests/*.test.mjs` | **74/74** |
| Web birim (V0.6) | `cd web && node --test "tests/**/*.test.mjs"` | **34/34** |
| Release checker (Python) | `python -m unittest discover -s tools/release-check/tests` | **129/129** |
| Canlı GitHub toplama | `cli.mjs collect` | 28 PR, 77 sn, kesik dosya listesi yok |
| Envanter / grafik / çakışma | `cli.mjs inventory/graph/conflicts` | 0 çıkış kodu, stale yok, döngü yok |
| Kapı sınıflandırması | `cli.mjs gates` (PR #22 gerçek artefakt) | TECHNICAL_READY_FOR_REVIEW + EDITORIAL_BLOCKED (151 + 151) |
| İzole provalar (yalnız merge) | `rehearse --execute-rehearsal` × 4 | 4 temiz birleşme; ana depo değişmedi |
| İzole provalar (npm ci + e2e) | `--commands=install,e2e:e2e/admin-v08.spec.ts` | #26: 2/2 geçti; #25 + #28 + #26: 2 başarısız (gerçek semantik çakışma) |

**Testlerin kapsadığı senaryolar** (görev listesindeki harflerle):

| Harf | Senaryo |
|---|---|
| A | Sayfalama |
| B | 403 ve 429 |
| C | Ref yok |
| D, AA | Stale anlık görüntü |
| E, F, G | Ata, eşdeğer ve kısmi içerilme (gerçek git) |
| H, I | Aynı dosya, farklı satır ve gerçek satır çakışması (gerçek git) |
| J | Ortak dosyası olmayan semantik şema riski |
| K, L, M, N | Yanlış taban, yanlış sıra, eksik ön koşul, döngü |
| O | 250 PR performansı |
| P | Çevrimdışı mod |
| Q | Token redaksiyonu |
| R | Bozuk ref ve PR girdileri, yol geçişi |
| S, AD | Beyaz liste dışına yazma |
| T, U | Prova uzak dalı ve ana depoyu değiştirmez |
| V | Bulunamayan komut → `not_run` |
| W | CI yeşil ama editoryal engelli |
| X | 400/403/429 durumları |
| Z | Markdown/CSV kaçışlama |
| AB | Zaman aşımı → `blocked` |
| AE | Dinamik PR numaraları |

**NOT_RUN / sınırlar:**
- Tam production build + tüm e2e paketiyle birleşik prova
- Firefox ve WebKit
- #19/#24 zincirinin yeniden hedeflenmiş provası
- Y senaryosu: provada ortaya çıkan gerçek örnek var (#26 + #28, `mergeable: true` ama e2e başarısız), ama ayrı bir otomatik birim testi yok
- AC (Windows ve Linux yol ayırıcıları): yalnız Windows'ta koşuldu
