# Yayın motoru güvenlik sözleşmesi (MKA FORTRESS Phase 1)

Gerçek otomatik yayın **etkin değildir**. Planlayıcı yalnız dry-run çalışır, depoya yazmaz. Bu belge gelecekteki gerçek zamanlayıcının uyması gereken kuralları ve bugünkü test kanıtlarını tanımlar.

## Değişmezler

| # | Kural | Uygulama | Test |
|---|---|---|---|
| 1 | Yalnız `status: scheduled`, geçerli şema, kaynakça ve **insan** onayı olan yazı planlanır | `planScheduledPublications`, `validatePublication` | `security-publishing.test.mjs`, `publishing-platform.test.mjs` |
| 2 | Onay gelecekte veya yayın zamanından sonra tarihli olamaz | planlayıcı | `publishing-hardening.test.mjs` |
| 3 | Aynı yazı iki kez yayımlanamaz (kimlik ve idempotency anahtarı) | planlayıcı + `recordPublication` | çift yayın, yeniden zamanlama testleri |
| 4 | Eşzamanlı iki çalışmadan yalnız biri deftere yazar | `recordPublication` karşılaştır-ve-yaz | eşzamanlılık testi |
| 5 | Çökme sonrası yeniden deneme aynı planı üretir; defterde kayıt varsa reddedilir | saf planlayıcı | yeniden deneme testi |
| 6 | Silinmiş veya yayından çekilmiş arşiv kaydına bağlı yazı planlanmaz | `withArchiveReferenceGate` (dry-run'da etkin) | referans testi |
| 7 | Bozuk JSON çökme değil, doğrulama hatası üretir | yapı denetimi, dosya bazında atlama | bozuk girdi testleri |
| 8 | Taslaktan doğrudan yayına geçiş yoktur | `canTransition` | durum geçişi testi |
| 9 | Onay, onaylanan içeriğin özetine bağlı olmalıdır | `verifyApprovalBinding` (sözleşme) | `security-access.test.mjs` |
| 10 | Onaylayan, yazarla aynı kişi olamaz; editör rolü ve MFA gerekir | `authorize` (sözleşme) | RBAC testleri |

## Gerçek zamanlayıcı devreye alınmadan önce zorunlu adımlar

1. **Kimlik doğrulama:** Gerçek bir `AuthenticationProvider` kaydedilmeli. `approvedBy` serbest metin olmaktan çıkmalı ve doğrulanmış oturum öznesinden gelmeli.
2. **Onay–içerik bağı:** Yayın kaydına `approval.recordSha256` alanı eklenmeli (şema değişikliği). Editoryal defter olayına `record_sha256` eklenmeli.
3. **Tek yazıcı kilidi:** Deftere yazma atomik olmalı (geçici dosya + rename veya veritabanı işlemi). Zamanlayıcı tek örnek çalışmalı.
4. **Denetim kaydı:** Her yayın kararı `appendAuditEvent` zincirine yazılmalı. Zincir başı depo dışında saklanmalı.
5. **Geri alma:** Yayından kaldırma yolu ve defterde iptal kaydı tanımlanmalı.
6. **Saat:** Zamanlayıcı UTC kullanmalı; saat sapması için tolerans tanımlanmalı.

Bu adımlar tamamlanmadan `planScheduledPublications` çıktısı hiçbir sistemde gerçek yayına bağlanmamalıdır.
