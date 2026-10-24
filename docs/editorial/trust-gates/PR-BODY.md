## Görev 04 — İnsan onayı güven modeli ve sürümlü yayın kalite kapıları (Claude)

Bu PR **insan onayı vermez**. Gerçek insan kararları yokken yayını engelleyen, kararlar geldiğinde onları güvenilir biçimde kaydetmeye hazır bir çekirdek ekler. Mevcut hiçbir dosya değiştirilmedi; yalnız ekleme yapıldı.

**Taban:** PR #29 `feature/codex-v07-publishing-integration` @ `296da528eb`. Bu Prompt 03 dalıdır: teknik CI yeşil, `HANDOFF-PROMPT-04.md` içeriyor. Zincir: V0.6 → #25 → #28 → #29.

## Eklenen yollar

| Yol | İçerik |
|---|---|
| `web/lib/editorial-trust/` | Tek kaynak. Model, kanonik snapshot, katı zaman, fail-closed kimlik çözücü, audit zinciri, karar servisi, politika motoru, PR #15 form sınıflandırma, DTO, Prompt 03 köprüsü, `server.ts` (server-only). |
| `tools/editorial-trust/` | Salt-okunur CLI, gerçek katalog raporu, A–F testleri, ölçek denemesi. Test yardımcıları yalnız `tests/helpers`. |
| `web/tests/editorial-trust.test.mjs` | Web sözleşme testleri |
| `.github/workflows/editorial-trust.yml` | Ayrı, çevrimdışı, salt-okunur iş akışı |
| `docs/editorial/trust-gates/` | 11 belge + gerçek rapor çıktısı |

## Kullanılan mevcut sözleşmeler (değiştirilmeden)

| PR | Sözleşme |
|---|---|
| #12 | Kapı ve çıkış semantiği aynı. Uyum eşlemesi var; sayımlar testle birebir karşılaştırılıyor. |
| #15 | Form şeması 1.0.0. Node kanonik hash'i 168/168 formla bayt düzeyinde eşleşiyor. Formlar ve ledger doğrulayıcısı dokunulmadı. |
| #21 / #25 | Yayın ekseni yeniden tanımlanmadı. İnceleme ekseni ayrı. |
| #26 | Aynı rol dizgileri. Admin dosyalarına dokunulmadı; `getCurrentAdminSession() → null` korunuyor. |
| #29 | Makale revizyonu `computePublicationRevision` (tek otorite). `hasVerifiedHumanApproval(readiness)` preflight'a köprü. |

## Güven sınırı

- Aktör yalnız sunucu tarafındaki `TrustedIdentityProvider` üzerinden çözülür. Başlık, sorgu, localStorage ve gövdedeki rol/aktör alanları reddedilir.
- JSON'dan kurulmuş "kanıt" kabul edilmez; çözülen kanıt modül içi WeakSet ile işaretlenir.
- İki ayrı karar: `historian_review` ve `publication_editor`.
  - Görev ayrılığı ve çıkar çatışması uygulanır.
  - `system_admin` otomatik uzman değildir.
  - Revizyon belirteci zorunlu; CAS ve idempotency var.
- **Repoda kayıtlı sağlayıcı ve etkin politika yok.** Bütün yazma yolları `not_configured` / `policy_unconfigured` (503) döner.

## Yayın kalite kapısı sonucu (gerçek repo)

| Katman | Sonuç |
|---|---|
| A. Mühendislik | Aşağıdaki testlerin tamamı geçti |
| B. İnsan editoryal | **ENGELLİ**. `gate-check` çıkışı 1: 168/168 kayıt engelli, 0 doğrulanmış uzman incelemesi, 0 doğrulanmış editör kararı, 151 teknik `published` etiketi insan onayı sayılmadı, 2 kayıtta hak durumu `unknown`. |

`release-quality.yml` değiştirilmedi; insan onayı eksikliği orada kırmızı kalmaya devam eder. Bu doğru davranıştır.

## Testler (gerçek koşular, Windows / Node 24.19)

| Paket | Sonuç |
|---|---|
| `node --test tools/editorial-trust/tests/*.test.mjs` | **59: 58 geçti, 1 atlandı** (E67 symlink: Windows izni yok; Linux CI'da koşar) |
| `web`: `npm test` | **76/76** |
| `web`: `npm run typecheck` / `npm run lint` / `npm run build` | 0 / 0 / başarılı |
| Python release-check | 129/129 |
| Python editorial-review | 45 OK (1 mevcut atlama) |
| Arşiv motoru / Fortress araçları | 74/74, 15/15 |
| `git diff --check` | temiz |

Testler geliştirme sırasında 4 gerçek hata yakaladı:
- DTO'nun yanlış sonraki adım önermesi;
- tarihi bilinmeyen draft kaydın hatalı `schema_invalid` sayılması;
- gerçek kararlarla bile hiç açılamayan kapı;
- geri çekme tekrarında çift audit olayı.

Ayrıntı: `09-TEST-REPORT.md`.

## Ölçek (sentetik, yalnız geçici dizin)

| Kayıt | Analiz | Ham G/Ç tabanı | Tepe RSS |
|---|---|---|---|
| 500 | 1,5 sn | 0,9 sn | 98 MB |
| 2.000 | 16,2 sn | 16,6 sn | 190 MB |
| 10.000 | 73,5 sn | 75,2 sn | 576 MB |

Darboğaz disk G/Ç'si, değerlendirme mantığı değil. 10k'da rapor bellekte tutuluyor; daha büyük ölçek için akışlı çıktı önerildi.

## Güvenlik bulguları ve sınırlar

- Hash zinciri yalnız **tamper-evident**'tır. Zincirin tamamen yeniden yazılması ancak harici çapa ile yakalanır; repoda harici çapa yok. Sahte imza üretilmedi.
- Audit yazılıp karar yazılamazsa `partial_write_requires_reconciliation` döner. Üretimde tek transaksiyon (outbox) gerekir.
- Sunucu saati güvenilir varsayılıyor (harici zaman damgası yok).

## Bağımlılık ve çakışma

- #26 × #28: `/yonetim` proxy kararı açık (Görev 01 bulgusu). Bu PR admin dosyalarına dokunmuyor.
- PR #33'teki görev manifesti Görev 04 yollarını `tools/approval-gates/` olarak tahmin etmişti; gerçek yollar `11-INTEGRATION-HANDOFF.md` içinde.

## İnsan gereksinimleri / production engelleri

Kimlik sağlayıcı (MFA), aktör doğrulaması, rol eşleme, atama politikası, değişmez audit deposu, onay geçerlilik süresi, telif sınırları: `10-DEPLOYMENT-PREREQUISITES.md`. Hiçbiri kullanıcı adına oluşturulmadı.

## Yapılmayanlar

- `main` merge
- Deploy, DNS, ücretli API
- Gerçek veri mutasyonu
- Form üzerine yazma
- Sahte insan onayı

🤖 Generated with [Claude Code](https://claude.com/claude-code)
