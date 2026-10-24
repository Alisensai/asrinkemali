# TEST-MATRIX — gerçek koşular

**Ortam:** Windows 11, Node v24.19.0, Python 3, 6 çekirdek. **Dal:** `feature/claude-v07-evidence-engine-integration`. **Tarih:** 2026-10-24.

## Komutlar

| Komut | Sonuç |
|---|---|
| `cd tools/historical-research && npm test` | **181 test: 180 PASS, 0 FAIL, 1 SKIP** (QA-094 symlink: Windows izni yok) |
| Yalnız #19'un 100 testi (port sonrası) | **100/100**. Port öncesi Windows'ta 99/100'dü; yol ayırıcısı testi düzeltildi. |
| `node tools/historical-research/cli.mjs evidence-report --generated-at … --format json\|md\|csv` | 0. Raporlar `reports/` altında. |
| `node tools/historical-research/cli.mjs gap-report --from 1881 --to 1918 --format json` | 0 |
| `node tools/historical-research/cli.mjs pool-status --format json` | 0 (32 aday) |
| `node tools/historical-research/cli.mjs dry-run --all` | 0 (32 engelli, 0 hazır) |
| `node tools/historical-research/cli.mjs claims` | 0 (10 `unverified`; #19 ve Görev 07 değerlendirmeleri yan yana) |
| `node tools/historical-research/cli.mjs validate --strict` | 0 (32 aday, 0 bulgu) |
| `node scripts/archive/validate.mjs` | Başarılı (uyarılarla) |
| `node --test scripts/archive/tests/*.test.mjs` | 74/74 |
| `cd web && npm run lint` / `npm run typecheck` | 0 / 0 |
| `cd web && npm test` | 37/37 (yeni `research-evidence-gate.test.mjs` dahil) |
| `cd web && npm run build` | Başarılı. `.next/static` içinde aday verisi izi 0. |
| Production sunucu (`next start`, port 49647, `MKA_RESEARCH_LAB=1`) | `/` 200; `/arastirma-laboratuvari` **404**; yanıtta aday verisi yok |
| Dev sunucu (`next dev`, port 49648, `MKA_RESEARCH_LAB=1`) | `/arastirma-laboratuvari` 200, yalnız gerçek 32 aday, `noindex` var. Yalnız kendi süreçlerim kapatıldı; `next-env.d.ts` geri yüklendi. |
| `python -m unittest discover -s tools/release-check/tests` | 129/129 |
| `python tools/release-check/quality_runner.py --web-root web --output-dir <tmp>` | **çıkış 1.** 240 teknik test geçti; 302 kritik insan-onayı bulgusu, 168 uzman incelemesi; `Release-ready: False`. Beklenen kırmızı. |
| `git diff --check` | Temiz |
| Playwright e2e | **NOT_RUN.** UI değişikliği yok (N/A: No UI change). Laboratuvar 404 davranışı production sunucu smoke testiyle doğrulandı. |
| Firefox / WebKit | NOT_RUN (UI değişikliği yok) |

## QA senaryoları

PASS = otomatik assertion koştu ve geçti.

| QA | Test dosyası | Durum |
|---|---|---|
| 001–010 | `integration-archive.test.mjs` | PASS |
| 011–038 | `integration-candidates.test.mjs` | PASS |
| 039–047, 049–057 | `integration-evidence.test.mjs` | PASS |
| 048, 109–112 | `integration-scale.test.mjs` (500 / 1.000 / 2.000 / 10.000 tam giriş) | PASS |
| 058–078 | `integration-archive.test.mjs` | PASS |
| 079–093, 095–098 | `integration-security.test.mjs` | PASS |
| 094 | `integration-security.test.mjs` | **SKIP** (Windows symlink izni); Linux CI'da koşar |
| 099–102 | `web/tests/research-evidence-gate.test.mjs` + production/dev sunucu smoke testi | PASS |
| 103 | — | **N/A**: PR #24 export API'si bu tabanda yok |
| 104 | `npm run build` | PASS |
| 105 | `quality_runner.py` | PASS (beklenen kırmızı korunuyor; yanlış yeşil yok) |
| 106–107 | `integration-adapters.test.mjs` | PASS |
| 108 | `.github/workflows/research-evidence.yml` yalnız kendi modülünü koşar; release-ready yazmaz | PASS (statik). CI sonucu PR'da doğrulanacak. |
| 113, 116 | `integration-archive.test.mjs` | PASS |
| 114–115 | `integration-adapters.test.mjs` | PASS |

## Ölçüm: dedupe (aynı makine, 3 tekrar, medyan)

| Aday | #19 `findDuplicates` | Görev 07 `classifyDuplicates` |
|---|---|---|
| 500 | 709 ms | 8 ms |
| 2.000 | 16.703 ms | 113 ms |
| 5.000 | 144.472 ms | 1.162 ms |
| 10.000 | NOT_RUN (karesel; 10 dakikayı aştığı için durduruldu) | yaklaşık 2,2 sn (QA-048/112 tek koşu) |

Komut: `node tools/historical-research/scripts/bench-dedupe.mjs 500 2000 5000`. Makine diğer ajanların süreçleriyle paylaşılıyor; süreler göreli karşılaştırma içindir.

## Testlerin yakaladığı veya kanıtladığı #19 hataları

1. QA-056: pasajsız iki künye desteği `corroborated` sayılıyordu.
2. QA-035: `new → import_ready` gibi izinsiz geçişler serbestti.
3. QA-091/092/095: CLI `--out` katalog dışındaki keyfî yollara yazabiliyordu.
4. QA-024: CSV formül enjeksiyonu açıktı.
5. QA-021: JSON içe aktarma hak, erişim ve onay iddialarını koruyordu.
6. QA-023: BOM yüzünden geçerli CSV reddediliyordu.
7. QA-029: sağlayıcı kaydı sessizce eziliyordu.
8. QA-079/081/086: SSRF boşlukları vardı.
9. QA-076: dry-run belirlenimci değildi.
10. QA-098: Windows yol ayırıcısı test hatası.
11. `npm test` betiği Node 24'te hiç çalışmıyordu.
