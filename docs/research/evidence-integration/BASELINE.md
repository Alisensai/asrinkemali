# BASELINE — Görev 07 başlangıç gerçekliği (2026-10-24)

## Taban seçimi

| Kural (görev metni) | Gerçek durum | Sonuç |
|---|---|---|
| Prompt 06 Authority Registry Draft PR'ı varsa onun HEAD'i | GitHub'da ne dal ne PR var | Uygulanamaz |
| Yoksa Prompt 05'in doğrulanmış entegrasyon HEAD'i | Prompt 05 için Copilot PR'ı yok. OpenCode PR #20 (`890a24aa`) eski #14 tabanında ve V0.6'ya alınmamış. | Uygulanamaz |
| Hiçbiri yoksa PR #22 HEAD | `integration/asrinkemali-v06-release-candidate` @ `10cdbfd70e0d2c7d12ed1e71907273d9a1f92b7e` | **Seçildi** |

**Dal:** `feature/claude-v07-evidence-engine-integration`. Önerilen `feature/copilot-v07-evidence-engine-integration` uzakta yoktu. Yine de "orijinal etiketler yerine CLAUDE" kuralı gereği claude öneki kullanıldı.

## Kaynak PR'lar

| PR | Dal @ HEAD | Taban | Bu görevle ilişkisi |
|---|---|---|---|
| #19 Evidence Engine (Perplexity) | `feature/perplexity-v07-evidence-engine` @ `e7ed5f18` (görev metnindeki ilk görülen HEAD ile aynı) | #14 | **Kaynak.** V0.6'nın atası değil; merge-base `334a8d8`. |
| #24 Evidence Workbench (Perplexity) | `feature/perplexity-v07-evidence-workbench` @ `ba6ec603` | #19 | Dokunulmadı (Prompt 08). Yalnız sözleşme devri. |
| #20 Source Reliability (OpenCode) | @ `890a24aa` | #14 | Bu tabanda yok → isteğe bağlı port |
| #22 V0.6 | @ `10cdbfd7` | V0.5 | Taban |
| #25 / #28 (Claude) | hardening / Fortress | V0.6 / #25 | Bu tabanda yok. Güvenlik başlıklarına dokunulmadı. |
| #26 (Copilot) | Control Center | V0.6 | Dokunulmadı |

## Port yöntemi

#19'un 39 dosyası tamamen eklemeliydi; V0.6'da hiçbiri yoktu. Bu yüzden kaynak kökenini ve Perplexity yazarlığını korumak için commitler `git cherry-pick -x` ile taşındı:

| #19 commit | Yeni commit | Not |
|---|---|---|
| `220ec54` | `3d86fb6` | Motor, veri, testler |
| `43f9c37` | `22e161a` | Belge düzeltmesi |
| `326d1a6` | `42381a2` | Danışman düzeltmeleri |
| `ef1770b` | `34be124` | İkinci tur düzeltmeler |
| `e7ed5f1` | **alınmadı** | Yalnız `web/next-env.d.ts`'yi #14 tabanına göre "geri alıyordu". V0.6'ya uygulanınca üretilen dosyayı farklı bir sürüme çeviriyordu. |

Port sonrasında V0.6'dan farklılaşan dosyaların hepsi #19 yollarında: `tools/historical-research`, `data/research/candidates`, `docs/research/perplexity`, `web/app/arastirma-laboratuvari`, `web/lib/research-evidence`.

## Kaynak testleri: gerçek koşu

| Ortam | Komut | Sonuç |
|---|---|---|
| #19 kendi dalında, Windows / Node 24.19 | `node --test tests/*.test.mjs` | **99/100.** 1 hata: `draftExportPath` testi `/` bekliyor, Windows `\` üretiyor. |
| #19 kendi dalında | `npm test` (`node --test tests/`) | **Çalışmıyor.** Node 24 dizin argümanını modül sanıyor (`MODULE_NOT_FOUND`). PR açıklamasındaki "100/100" bu betikle üretilmiş olamaz. |
| Port sonrası V0.6 | `node --test tests/*.test.mjs` | 99/100 (aynı Windows hatası) |

Sonuç: PR açıklamasındaki 100/100 sorgusuz kabul edilmedi. Hata türü ortam/test kaynaklı; düzeltildi (bkz. TEST-MATRIX).

## Bilinen sapmalar ve onay engelleri

- Arşivde **insan uzman/editör onayı yok.** 151 teknik `published` etiketi onay sayılmaz. `release-quality` bu nedenle kırmızı kalır (302 kritik bulgu, PR #22 artefaktı).
- Aday havuzu: 32 aday, 0 insan incelemesi, 0 içe aktarmaya uygun.
- Ana dal, deploy, DNS, ücretli API: dokunulmadı.
