# PR çakışma matrisi

**Kapsam:** V0.6'ya henüz alınmamış açık PR'lar: #2, #3, #19, #20, #23, #24, #25, #26, #27, #28. V0.6'da zaten bulunan PR'lar matrisin dışında tutuldu (`ALREADY-INCLUDED.md`).

**Yöntem:**
- Ortak dosyalar GitHub'dan alındı.
- Ortak kod dosyası olan çiftler için `git merge-tree --write-tree` ile metin çakışması denetlendi.
- Semantik kurallar `src/conflicts.mjs` içinde.
- Makine okunur çıktı: `reports/conflicts.json`.

| Risk | Çift | Ortak kod dosyaları | Metin | Gerekçe |
|---|---|---|---|---|
| **high** | #26 × #28 | — (ortak dosya yok) | — | **Semantik: `admin-route-intercepted-by-proxy`.** Provada doğrulandı: birlikte #26'nın e2e testi 2/2 başarısız (`REHEARSAL-PLAN.md`) |
| high | #25 × #28 | `scripts/publishing/dry-run.mjs`, `web/lib/publishing/scheduler.ts`, `web/next.config.ts`, `web/playwright.prod.config.ts` | temiz | Kritik alan (yayın motoru, yapılandırma). #28 doğrudan #25 üzerine dizili; beklenen ve sıralı |
| medium | #19 × #24 | `tools/historical-research/package.json`, `…/tests/scale.test.mjs`, `web/app/arastirma-laboratuvari/{page.tsx, laboratuvar.module.css}` | temiz | Zincir (#24 → #19) |
| medium | #23 × #25 | `web/app/arsiv/[slug]/page.tsx` | temiz | Provada iki sıra da aynı ağacı verdi |
| medium | #23 × #27 | `web/app/hakkimizda/page.tsx` | temiz | Zincir (#27 → #23) |
| low | 9 çift | — | — | Yalnız aynı dizin |

**Ders:** Dosya kesişimi tek başına risk göstergesi değildir. En ciddi gerçek çakışma (#26 × #28) ortak dosyası olmayan çifttedir.

## Semantik sözleşme bulguları (PR bazında)

| Kural | PR | Not / sahip |
|---|---|---|
| `admin-vs-failclosed-proxy` | #26 | Yönetim rotası; Görev 14 + Claude |
| `proxy-or-middleware` | #28 | İstek katmanı; tek dosya |
| `next-config-headers` | #25, #28 | Güvenlik başlıkları ve CSP aynı dosyada; #28, #25'in üstünde |
| `lockfile` | #24 | Kilit dosyası değişiyor; Görev 15'te tek kilit yeniden üretilmeli |
| `screenshots` | #23 | Çok sayıda ekran görüntüsü commitleniyor; testler bunları yeniden üretir |

## Önerilen güvenli doğrulama sırası

1. **#25** (hardening) → **#28** (Fortress), sıralı zincir.
2. **#23** (görsel) → **#27** (müze). #23 ile #25'in sırası önemsiz.
3. **#26**, ancak `/yonetim` proxy kararı verildikten sonra.
4. **#19 → #24** ve **#20**: önce V0.6'ya yeniden hedefleme; #24'teki lint hatası giderilmeli.
5. #2 ve #3: kullanıcı kararı (eski veya eşdeğer içerik).
