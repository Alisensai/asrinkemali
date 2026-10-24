## Görev 07: Evidence Engine (PR #19) V0.6 entegrasyonu (Claude)

**Taban:** `integration/asrinkemali-v06-release-candidate` (PR #22) @ `10cdbfd70e`. Prompt 05/06 dalı yok, bu yüzden kural gereği PR #22.

**Kaynak:** PR #19 `feature/perplexity-v07-evidence-engine` @ `e7ed5f183a58a430e5fcc51c69821381af07f633`.

## Ne yapıldı

1. **Köken korunarak port.** #19'un 4 commit'i `cherry-pick -x` ile taşındı; Perplexity yazarlığı korundu. Beşinci commit (`e7ed5f1`) alınmadı: yalnız `web/next-env.d.ts`'yi #14 tabanına göre değiştiriyordu.
2. **#19 modüllerinde dar güvenlik/sağlamlık düzeltmeleri** (ayrıntı `SECURITY.md`):
   - CLI `--out` katalog dışındaki keyfî yollara (repo dışı, `.git`, `web/`) da yazabiliyordu. Artık izin listesi + realpath + atomik yazım var; ihlalde çıkış 3.
   - Aday durum makinesi her geçişe izin veriyordu. Artık açık matris var; ret durumunda girdi değişmiyor.
   - İçe aktarma hak, erişim ve onay iddialarını koruyordu. Artık temizleniyor; boyut, derinlik ve prototip anahtarı sınırları eklendi; BOM düzeltildi.
   - CSV formül enjeksiyonu, sağlayıcı kaydının sessizce ezilmesi ve SSRF boşlukları kapatıldı. SSRF: sonda noktalı localhost, multicast, NAT64, yön karakterleri.
   - Dry-run belirlenimci hâle getirildi; Windows yol testi düzeltildi.
   - `npm test` betiği Node 24'te çalışmıyordu; düzeltildi.
3. **Entegrasyon katmanı** (`tools/historical-research/lib/integration/`):
   - Tek arşiv bağlamı (`loadArchiveContext`): OpenCode okuyucusu, id/slug çakışması, MAX_RECORDS aşım bayrağı, SHA.
   - İndeksli üç kademeli tekrar sınıflandırması.
   - Pasaj ayrımlı provenans: künye desteği tam destek değildir; eksik aday `unresolved`; ayna/aynı belge tek kök; en yüksek durum `provisional_support`.
   - Enjeksiyonlu erişim denetimi: varsayılan ağsız; 200 yalnız `reachable` anlamına gelir.
   - Source Reliability / Authority Registry için isteğe bağlı portlar (güvenli degrade).
   - Girdi hash'li, belirlenimci, salt-okunur rapor.
4. **CLI:** `--root`, `evidence-report`, `integrity`, `validate`; çıkış kodları 0/1/2/3.
5. **CI:** `research-evidence.yml`. Yalnız bu modül; bütünlük özeti öncesi/sonrası `diff`; SHA-pinned; `contents: read`.
6. **Belgeler:** `docs/research/evidence-integration/` altında 11 belge + gerçek JSON/MD/CSV raporlar.

## Gerçek anlık görüntü (2026-10-24)

| Ölçüm | Değer |
|---|---|
| Arşiv kaydı | 168 (151 published / 16 reviewed / 1 draft teknik etiket); **insan onaylı: 0** |
| Kaynak adayı | 32; kanonik URL kökü 32; kesin/olası tekrar 0/0 |
| Tarihî iddia | 10. Hepsi `unverified`: kanıtların tamamı künye düzeyinde, pasajlı destek 0. |
| Kanıt kenarı | 75 (7 çözümsüz: kurum arşiv kimliği yok) |
| Dry-run | 32 engelli / 0 hazır; **içe aktarmaya uygun: 0** |
| 1881–1918 arşiv kapsamı | 4 kayıt (3 mekân: kuruluş tarihi; 1 yayın); doğrudan olay/belge kaydı 0 |
| Gözlemlenen URL durumu | 32 `reachable` (#19'un 2026-10-23 gözlemi; bu PR ağa çıkmadı) |
| Salt-okunur bütünlük | Değişiklik yok |

## Testler (gerçek koşular)

| Paket | Sonuç |
|---|---|
| `tools/historical-research` `npm test` | **181: 180 PASS, 1 SKIP** (QA-094 symlink, Windows izni yok). #19'un 100 testi 100/100. |
| Web lint / typecheck / `npm test` / build | 0 / 0 / 37/37 / başarılı |
| Production sunucu, `MKA_RESEARCH_LAB=1` | `/arastirma-laboratuvari` **404** |
| Dev sunucu, bayraklı | 200, gerçek 32 aday, noindex |
| Arşiv motoru / release-check | 74/74, 129/129 |
| `quality_runner.py` | **çıkış 1**: 240 teknik test geçti, 302 kritik insan-onayı bulgusu, `release_ready=false`. Beklenen kırmızı; gizlenmedi. |
| Playwright / Firefox / WebKit | NOT_RUN (UI değişikliği yok) |

Dedupe ölçümü (5.000 aday, medyan): #19 `findDuplicates` 144 sn → `classifyDuplicates` 1,2 sn.

QA-001…116 durumu: `TEST-MATRIX.md`. QA-103 uygulanamaz (PR #24 export API bu tabanda yok).

## Sınırlar ve devir

- PR #24 Workbench'e dokunulmadı. Prompt 08 sözleşmesi `INTEGRATION-HANDOFF.md` içinde. #24 bu PR'dan sonra yeniden hedeflenmeli; `candidates.mjs`, `importers.mjs` ve `cli.mjs` için çakışma provası gerekir.
- Ağ, ücretli API, OpenAI/Anthropic bağımlılığı yok.
- `main` merge, deploy, DNS yok. Katalog, aday ve iddia dosyaları değişmedi. Sahte insan onayı yok.
- `release-quality.yml`, `security.yml`, `nextjs.yml`, admin, yayın ve CSS dosyalarına dokunulmadı.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
