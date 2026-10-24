# Kilo PR #7 / #13 envanteri

Kaynak PR'lar GitHub'dan açık ve SHA'ları teyit edilerek incelendi: [#7](https://github.com/Alisensai/asrinkemali/pull/7) (`e91db725a8abd9c69a8f7194a4a2fdf4cf0696fb`) ve [#13](https://github.com/Alisensai/asrinkemali/pull/13) (`38b4010da38d747b49d2c59af3a0a0442aa4f38e`). Bu dalın başlangıcı V0.6'da #13'ün uygun testleri zaten birleştiren PR #22 tabanı değil, Prompt 01 stack PR #33'ün HEAD'i `f3da6df8dcbfd4bfdd141d2d9d6063bb8ac18f0b`'dir; #33 de V0.6 tabanını içerir. GitHub'ın PR changed-files listeleri, güncel checkout ve kaynak dallar aynı dosya envanteriyle karşılaştırılmıştır. Makine-okunur karşılığı `tools/qa-unified/manifest.json:kiloInventory`.

| Kaynak | Dosya(lar) | Durum | Gerekçe / güncel kullanım |
|---|---|---|---|
| #7 | `docs/qa/kilo/HATA-TABLOSU.md`, `TEST-PLANI.md`, `TEST-SONUCLARI.md`, `qa/kilo/README.md` | mevcut | Tarihsel belge ve sayıların kanıtı; eski sonuçlar güncel koşum kabul edilmez. |
| #7 | `qa/kilo/scripts/a11y-smoke.mjs`, `gen.mjs`, `responsive-regression.mjs`, `web/e2e/kilo-qa.spec.ts` | mevcut, legacy | Kök `playwright` bağımlılığı eski scriptleri sağlar; fixed result/screenshot adları ve homepage-only, sleep tabanlı testler yeni runner tarafından seçilmez. |
| #7 | `package.json` | uyarlanmış | Eski komutlar korunmuştur; `qa:*` birleşik girişleri eklendi. |
| #13 | `docs/qa/kilo/RAPOR-V06-ULTIMATE.md` | mevcut, tarihsel | V0.5/V0.6 snapshot sayıları ve geçmiş ölçümler yeni baseline'a aktarılmaz. |
| #13 | `qa/kilo/scripts/gen-synthetic.mjs` | mevcut, legacy | Repo içi sentetik fixture dizinine yazar; yeni scale testinde kullanılmaz. |
| #13 | `qa/kilo/scripts/isolated-server.mjs` | uyarlanmış | Shell ve sabit `cwd` kullanan başlatıcı, ortak Node child lifecycle/loopback server adapter'ı oldu. |
| #13 | `qa/kilo/scripts/run-all.mjs` | uyarlanmış | Alt script yokluğu/hatası ve gerçek exit code artık yukarı taşınır; shell kullanılmaz. |
| #13 | `qa/kilo/scripts/perf-measure.mjs` | mevcut, legacy | Tek örnek ve ortak sabit screenshot adları; tekrarlı production ölçümü için yeni spec kullanılır. |
| #13 | `qa/kilo/synthetic/synthetic-{500,2000,10000}.json` | bilinçli yok | Büyük statik fixture'lar taşınmadı; seed'li üretici yalnız system temp kullanır. |
| #13 | `web/e2e/kilo-v06/archive-scale.spec.ts` | mevcut, legacy | Sahte ölçek simülasyonu ve kaynak dizinindeki ortak rapor yolu; gerçek loader ölçeği kanıtlamaz. |
| #13 | `comprehensive.spec.ts` | mevcut, uyarlanmadı | `kayıt bağlı`, rol adı ve tür option değerleri güncel erişilebilir HTML ile karşılaştırılmadan güvenilir değildir; sabit içerik beklentileri taşınmadı. |
| #13 | `cross-browser.spec.ts`, `mobile-quality.spec.ts` | mevcut, kopya/legacy | Route × viewport × browser kombinasyonu ve sabit beklemeler tekrar ediyor; Chromium'un 9 genişliği yeni suite'te tek kez sınanır. |

Eski 68/62, 168 veya başka katalog sayıları test beklentisi olarak eklenmedi. Arşiv Node ve release-check testleri mevcut, dinamik doğrulama için aynen çalıştırılır; yeni QA smoke veri içeriğini uydurmaz. Kilo'nun arşiv detay, filtre, arama modalı ve menü testleri gerçek erişilebilir isimleri denetlenmeden yeniden adlandırılmadı; ayrı kapsam durumu [50 senaryo tablosunda](TEST-MATRIX.md) görülebilir.
