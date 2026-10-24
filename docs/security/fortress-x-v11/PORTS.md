# PROJECT BLACKOUT: port sözleşmeleri ve gereken harici hizmetler

- **Kod:** `web/lib/security/blackout/ports.ts`
- **Adaptörler:** `web/lib/security/blackout/adapters/`
- **Uygunluk kontrolleri:** `adapters/conformance.ts`

Her port bir `descriptor` taşır: `kind`, `persistence`, `productionEligible`. `describePorts()` her portu üç durumdan biriyle raporlar:

| Durum | Anlamı |
|---|---|
| `connected` | Uzak ve kalıcı gerçek entegrasyon |
| `test_double` | Bellek içi veya tanımlayıcısız |
| `requires_infrastructure` | Port yok |

`productionReady()` yalnız tüm portlar `connected` ise `true` döner. **Bugün `false`.**

| Port | Sözleşme | Gereken harici hizmet | Güvenli bağlantı | Bugün |
|---|---|---|---|---|
| `BlackoutStateStore` | `read()`; `compareAndSet(expectedVersion, next)`. Koşulsuz yazma yok. | Sürüm/ETag destekli kalıcı KV veya küçük kontrol API'si. Tüm örnekler ve edge aynı kaydı okur. | HTTPS, kısa ömürlü belirteç (`Authorization: Bearer`), yazma yetkisi yalnız denetleyicide, edge'de salt-okuma, yönlendirme izlenmez, ≤250 ms zaman aşımı, kayıt imzası (KMS) | `HttpBlackoutStateStore` yazıldı ve bağımsız test edildi (BI-15, BI-16); **bağlı değil** (`REGISTERED_STATE_STORE = null`). Bellek ikizi `MemoryStateStore`. |
| `SessionRevoker` | `revoke(scope)` → **gerçek** iptal sayısı (`suspicious` / `privileged` / `all`) | Sunucu tarafı oturum deposu veya OIDC sağlayıcısının oturum/belirteç iptal API'si | mTLS veya OAuth istemci kimlik bilgisi; yalnız iptal kapsamlı yetki | **Yok.** Uygulamada oturum sistemi yok. Bellek ikizi gerçek sayım yapar ama yalnız kendi bellek kümesini. |
| `CriticalApiGate` | `setEnabled(bool)` | Paylaşılan durum deposu üzerinden proxy kararı. Pratikte RESTRICTED rota etkisi bu işi görür. | Durum deposuyla aynı | Rota etkisi `routes.ts` + proxy'de **uygulanıyor**; ancak depo kayıtlı olmadığından etkin düzey hep NORMAL. Ayrı port yok. |
| `WriteGuard` | `setFrozen(bool)` | Veritabanı yazma kilidi (salt-okunur rol / bağlantı havuzu bayrağı) | Veritabanı yönetim bağlantısı, ayrı yetkili rol | **Uygulanamaz:** uygulamada veritabanı ve yazma uç noktası yok. Veritabanı kilitlemesi iddia edilmez. |
| `SafeModeSwitch` | `setReadOnly(bool)` | Paylaşılan durum (LOCKDOWN rota etkisi) | Durum deposuyla aynı | Rota etkisi uygulanıyor, depo yok. |
| `ResponderNotifier` | `notify({ incidentId, level, summary })` | Nöbet/çağrı hizmeti, e-posta veya sohbet webhook'u | HTTPS webhook, imzalı istek (HMAC), sırrı kasada; özet redakte | **Yok.** |
| `EvidenceSink` | Yalnız `append`; zincir sürekliliği, idempotent yeniden gönderim; silme yok | Nesne kilitli (WORM, compliance mode) depolama, saklama süresi tanımlı | Yalnız `PutObject` yetkili ayrı kimlik; silme ve saklama kısaltma yetkisi yok; sunucu tarafı şifreleme | **Yok.** Bellek ikizi zinciri doğrular ama **WORM değildir.** |
| `ApprovalVerifier` (onay) | `verify(record, now)` → kişi, rol, MFA, süre | OIDC + MFA/FIDO2, imzalı onay belirteci | Sağlayıcının JWKS'i ile imza doğrulama, `aud`/`iss`/`exp` denetimi | **Yok** (`REGISTERED_APPROVAL_VERIFIER = null`). RESTRICTED/LOCKDOWN uygulanamaz. |
| `StateRecordVerifier` | `verify(record)` | KMS/HSM imza anahtarı | KMS `Verify` API; anahtar dışarı çıkmaz | **Yok.** |

## Uygunluk kontrolleri (gerçek adaptör bağlanmadan önce geçmeli)

- **`checkStateStoreConformance(store)`:**
  - koşulsuz `setLevel` yok,
  - eski sürümle yazım reddedilir,
  - doğru sürümle yazım kabul edilir,
  - aynı sürüme ikinci yazım reddedilir,
  - yazılan kayıt okunur.
- **`checkEvidenceSinkConformance(sink)`:**
  - silme, değiştirme veya kırpma yöntemi yok,
  - aynı kaydın yeniden gönderimi idempotent,
  - kopuk zincir reddedilir,
  - var olan kaydın değiştirilmesi reddedilir.

Bellek ikizleri ve `HttpBlackoutStateStore` bu kontrolleri geçer (BI-14, BI-15). Koşulsuz `setLevel`'li bir depo kalır.
