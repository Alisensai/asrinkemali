## Görev 01 — PR denetimi ve entegrasyon kontrol düzlemi (Claude)

Bu PR **hiçbir birleştirme yapmaz**. Mevcut 28 PR'ı güvenli biçimde anlamak ve entegrasyonlarını sınamak için salt-okunur, test edilmiş bir araç ve belgeler ekler.

**Değişen alanlar (yalnız):**
- `tools/integration-control/`
- `docs/integration-control/`
- `.github/workflows/integration-control.yml` (salt-okunur, çevrimdışı)

**Taban:** `integration/asrinkemali-v06-release-candidate` @ `10cdbfd`

## Araç (bağımlılıksız Node ESM CLI)

| Komut | İşlev |
|---|---|
| `collect` | Sayfalı, yalnız GET canlı toplama; 403/429 sınıflandırma; çevrimdışı anlık görüntü (TTL/stale) |
| `inventory` | PR manifesti; `merge-base --is-ancestor` + kararlı patch-id ile V0.6'ya içerilme |
| `graph` | Dal tabanlı DAG, topolojik sıra, döngü ve eksik ön koşul tespiti (Mermaid) |
| `conflicts` | PR×PR ortak dosya matrisi, `merge-tree` metin çakışması, 12 semantik sözleşme kuralı, gerekçeli risk |
| `gates` | Release-quality raporundan teknik / editoryal / hak / dış kaynak / güvenlik / dağıtım ayrımı (`RELEASE_READY` yalnız gerçek koşullarla) |
| `plan` / `rehearse` | Varsayılan yalnız plan; `--execute-rehearsal` ile geçici, sahiplik işaretli ayrık worktree'de birleştirme + `npm ci`/test. Push yok. Ana deponun HEAD, durum ve ref değişmezliği doğrulanır. |
| `tasks` | 30 görevlik manifest, durum modeli, yol sahipliği çakışma denetimi |

**Güvenlik:**
- Kabuk yok; ref, PR ve SHA doğrulama.
- Token ve ev dizini redaksiyonu.
- Markdown/CSV enjeksiyon koruması.
- Beyaz listeli çıktı; depo kimliği doğrulaması.

## Gerçek bulgular

1. **V0.6 içerilmesi doğrulandı:** #11–#18 ve #21 V0.6 geçmişinde ata olarak var (ayrıca #1, #4–#10, #22). Bunlar yeniden birleştirilmemeli. #3 içerik olarak eşdeğer (farklı SHA). #2 hiçbir yere alınmamış.
2. **Gerçek semantik çakışma (provada kanıtlandı):**
   - V0.6 + **#26** → admin e2e **2/2 geçti**.
   - V0.6 + #25 + **#28** + #26 → aynı testler **2 başarısız**.
   - Neden: #28'in kapalı-başarısız proxy'si `/yonetim`'i, #26'nın kendi erişim reddi sayfasına ulaşmadan 404 ile yanıtlıyor.
   - Metin düzeyinde çakışma yok; ortak dosya yok.
   - Karar Görev 14 ve Claude Fortress'e ait.
3. **CI kök nedenleri:**
   - **#19**: tabandan miras. `archive-platform.spec` "68/62" sabiti #14'ün 168 kayıtlık verisiyle çakışıyor; #19 bu dosyaya dokunmuyor; V0.6'da düzeltilmiş.
   - **#24**: kendi diff'i. `arastirma-laboratuvari/page.tsx` içinde 5 ESLint hatası.
4. **Release quality (PR #22 gerçek artefakt):**
   - Teknik: 0 başarısız kontrol, 555 test.
   - Editoryal: 302 kritik bulgu = 151 insan uzman incelemesi + 151 ayrı editör onayı eksik.
   - Gerçek insan onayı olmadan kapanamaz. Kapı gevşetilmedi.
5. **Sıra:**
   - #25 ile #23'ün iki uygulama sırası aynı birleşik ağacı veriyor.
   - #27 #23 olmadan, #24 #19 olmadan uygulanamaz (plan BLOCKED).
6. **Araç geliştirmesi sırasında dürüstlük kaydı:** İlk iki prova ortam nedeniyle geçersizdi. Biri başka ajanın (Copilot) 49173 portundaki sunucusundan kaynaklandı; o sunucu kapatılmadı. Araç düzeltildi (`blocked`, ayrı port, üretilen dosya geri alma) ve provalar yeniden koşuldu.

## Testler

| Paket | Sonuç |
|---|---|
| `node --test tools/integration-control/tests/*.test.mjs` | **23/23** (gerçek geçici git depolarıyla) |
| Arşiv motoru | 74/74 |
| Web birim | 34/34 |
| Release checker | 129/129 |
| İzole provalar | 4 birleştirme + 2 e2e provası (ayrıntı: `docs/integration-control/REHEARSAL-PLAN.md`) |

**NOT_RUN:**
- Tam production build + tüm e2e ile birleşik prova
- Firefox ve WebKit
- #19/#24 yeniden hedeflenmiş provası

## Sınırlar

- `main`, V0.6 dalı ve başka ajanların dalları değiştirilmedi.
- Dağıtım, DNS, ücretli servis yok; insan onayı taklidi yok.
- Atlas ZIP/patch dosyaları bu ortamda yok: **MISSING_ARTIFACT**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
