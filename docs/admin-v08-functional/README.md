# V0.8 Control Center — güvenli işlevselleştirme

Bu PR, mevcut PR #26 üzerine ayrı bir takip dalıdır. ASRIN KEMALİ bağımsız bir tarih-kültür projesidir; bu yönetim altyapısı gerçek kamu kurumu veya üretim kimlik sistemi değildir. Bu dalda kayıtlı gerçek bir kimlik sağlayıcısı, kalıcı veritabanı, audit deposu veya scheduler bulunmadığından `/yonetim/*` rotaları içerik sızdırmayan genel 404 ile fail-closed kalır.

## Eklenen gerçek davranış

- PR #28 Fortress rolleri/izinleri için ayrı bir adapter sözleşmesi eklendi. Rol eşlemesi Fortress kaynak izinleri ile hedef rolün izinlerinin kesişiminden oluşur; birden fazla rol, bilinmeyen rol, süresi geçmiş/gelecek/uzun ömürlü oturum ve sağlayıcı hatası reddedilir.
- Eylem kararlarında MFA ve kendi içeriğini inceleme/onaylama engeli uygulanır. `system_admin` kullanıcı/audit yönetimi alabilir; uzman veya editör onayı almaz. `historian` ile `chief_editor` kararları ayrı tutulur.
- Editörlük formları mevcut tüm arşiv kaydının kanonik JSON SHA-256 değeriyle karşılaştırılır. Kaydın yalnızca kaynak/kanıt/provenans alanı bile değişirse form `stale` olur. 200 sonucu, formdaki ad veya `actor_role` insan onayı sayılmaz.
- Staging önerileri alan allowlist'i, JSON derinlik/boyut sınırı, `__proto__`/constructor koruması ve revizyon kontrolü uygular. Depo yokken `not_configured` döner. Gelecekteki yazma adapterı tek atomik revision+audit transaction sözleşmesine bağlıdır; mevcut uygulamada route veya dosya yazımı yoktur.
- Audit sözleşmesi iç içe secret/PII redaction, aktör eşlemesi, event ID tekilliği ve doğrulanabilir hash-chain sağlar. Bunlar bellek içi saf yardımcılar; kalıcı veya imzalı defter garantisi değildir.
- Sağlık raporu sayımları gerçek yerel katalog/form verisinden üretilir. CI, IdP, DB ve audit bağlı değilse `unavailable`/`not_configured` görünür; release hazır değeri hiçbir zaman olumlu varsayılmaz.
- Ham JPEG `source.url` değerleri bağımsız risk olarak listelenir ve kaydın kurumsal landing page bağlantısı ayrıca gösterilir. Arşiv JSON dosyaları değiştirilmedi.
- Kimliksiz yönetim istekleri HTTP 404 döndürür; Basic auth, özel header, localStorage ve query parametresi yetki oluşturmaz. Layout'taki `notFound()` Next.js uygulama kökünün genel 404 sınırına yükseldiği için yönetim alanına özel metin gösterilmez.

## Değişen alanlar

- `web/lib/admin-v08/`: hash, permission adapter, editorial gate, staging ve readiness sözleşmeleri.
- `web/app/yonetim/`, `web/components/admin-v08/`: fail-closed 404 ve risk/sağlık raporu görünümü.
- `web/tests/admin-v08.test.mjs`, `web/e2e/admin-v08*.spec.ts`, `web/playwright.admin.prod.config.ts`: saf sözleşme ve üretim sunucusu regresyon testleri.
- `docs/admin-v08-functional/`: şema taslağı, güvenlik/rollback, test matrisi ve gerçek doğrulama raporu.

## Doğrulama

`web/` içinde `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` ve `npx playwright test --config=playwright.admin.prod.config.ts` kullanılmalıdır. Üretim Playwright koşusu önceden `next build` alır ve gerçek `next start` üzerinde, ayrı portta çalışır. Bu dalda yayın kalite kapısı çalıştırıldığında tüm otomatik testler geçse bile gerçek arşivde eksik editör onayları ve uzman incelemeleri release'i engeller; özet `VALIDATION-REPORT.md` içindedir.

## Bilinçli bloklar

- Production `REGISTERED_PROVIDER` ve admin session provider `null` kalır. Test provider'ları yalnız birim testlerinde enjekte edilir.
- SQL şeması taslaktır, herhangi bir veritabanına uygulanmamıştır. Staging ve audit için production adapter yoktur.
- 105 güvenlik/kabul maddesinin her biri `TEST-MATRIX.md` içinde PASS, BLOCKED veya NOT IMPLEMENTED olarak izlenir. `BLOCKED`/`NOT IMPLEMENTED` maddeler PASS sayılmaz.
- PR #28 Fortress kodu bu dala alınmadı. PR #28’in önizleme proxy, CSP, readiness ve security-suite kontrolleri bu dalda bulunmadığından, bu PR kendi başına o kontrollerin entegrasyon kanıtını vermez.

## Kimlik sağlayıcısı için sonraki sprint kabul listesi

1. Yetkili OIDC sağlayıcısı, doğrulanmış issuer/audience, MFA ve server-side role allowlist.
2. İmzalı/şifreli, kısa ömürlü, Secure/HttpOnly/SameSite=Strict oturum çerezi; rotation ve revocation.
3. CSRF token + origin doğrulaması ve tüm mutasyonlarda server-side resource permission check.
4. İki farklı trusted subject ile uzman incelemesi ve editör onayı; aynı kayıt hash'ine transaction içinde bağlama.
5. Append-only audit + DB transaction + hash zinciri; append başarısızsa mutasyonu rollback/deny.
6. Negatif production E2E, role tampering, concurrency, restore ve uzman incelemesi.

Provider secrets, demo kullanıcı, gerçek insan kimliği veya deployment ayarı bu PR'a eklenmedi.
