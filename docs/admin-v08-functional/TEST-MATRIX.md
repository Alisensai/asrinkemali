# V0.8 kabul ve test matrisi

Bu liste 105 kabul kontrolünü izler; **105 otomatik test çalıştırıldığı anlamına gelmez**. PASS yalnızca aşağıda belirtilen çalıştırılmış test/rapor kanıtı içindir. BLOCKED, gerçek sağlayıcı/veri altyapısı olmadan doğrulanamayacağını; NOT IMPLEMENTED ise bu PR'da sunulmayan işlevi belirtir. Bu iki durum hiçbir koşulda PASS sayılmaz.

## Uygulama sözleşmeleri ve gerçek veri

| ID | Kabul kontrolü | Durum | Kanıt |
|---|---|---|---|
| T-001 | Rol ve bölüm listeleri açık ve benzersiz | PASS | `admin-v08.test.mjs`: role and section sets are explicit and unique |
| T-002 | Provider yokken erişim reddedilir | PASS | missing session provider denies access |
| T-003 | Yetkiler istemci principal'ından değil sunucu RBAC'ından türetilir | PASS | session permissions are derived from server RBAC |
| T-004 | Bozuk principal reddedilir | PASS | malformed principal is denied |
| T-005 | Tarihçi yayın onayı/kullanıcı yönetimi yapamaz | PASS | historian cannot approve publication or manage users |
| T-006 | Baş editör sistem rolü atayamaz | PASS | chief editor cannot assign system roles |
| T-007 | Bölüm görünürlüğü yazma izni vermez | PASS | section visibility does not imply write permission |
| T-008 | Sistem yöneticisi editoryal karar veremez | PASS | system administrator cannot perform editorial decisions |
| T-009 | Provider hatası ve bozuk claim fail-closed olur | PASS | provider exceptions and malformed principal data fail closed |
| T-010 | Arama Türkçe harfleri ve tüm sorgu terimlerini işler | PASS | archive search handles Turkish casing and all query tokens |
| T-011 | Arşiv tür/durum/kurum/hak filtreleri çalışır | PASS | archive filter applies type, status, institution and rights constraints |
| T-012 | Sayfalama geçerli sayfaya sınırlandırılır, yinelenen kayıt üretmez | PASS | archive paging clamps to a valid page |
| T-013 | Kaynak ve hak eksikleri kalite işareti üretir | PASS | archive quality flags recognize missing source and rights uncertainty |
| T-014 | Teknik durum insan onayı sayılmaz | PASS | archive summary never treats technical status as human approval |
| T-015 | Yalnız HTTPS kaynak adresi güvenli bağlantı olur | PASS | HTTPS allowed; script and non-HTTPS schemes rejected |
| T-016 | Ham medya URL riski landing page'den bağımsız raporlanır | PASS | raw media URLs are flagged independently |
| T-017 | Yeni editörlük formu onay bekler | PASS | a new editorial form stays pending |
| T-018 | Karar tam arşiv kaydı SHA-256 özetine bağlanır | PASS | review state binds every decision to canonical record hash |
| T-019 | Tarih değişen kayıt eski formu stale yapar | PASS | old review form is marked stale |
| T-020 | Submitted beyan doğrulanmış onay kabul edilmez | PASS | submitted form is only an unverified claim |
| T-021 | Bozuk form kuyruk işleyişini düşürmeden reddedilir | PASS | invalid review form is rejected |
| T-022 | Audit olay şekli ve eylem allowlist'i doğrulanır | PASS | audit validator checks required event shape and known actions |
| T-023 | İç içe token/parola alanları redakte edilir | PASS | audit redaction removes nested token and password values |
| T-024 | Audit deposu yokken yazma açıkça reddedilir | PASS | unavailable audit storage fails writes explicitly |
| T-025 | Eski revizyonla güncelleme reddedilir | PASS | optimistic concurrency rejects stale revisions |
| T-026 | Yayın adaptörü mevcut kayıtların salt-okunur anlık görüntüsünü verir | PASS | publication adapter exposes a read-only snapshot |
| T-027 | Mevcut arşiv ve form verisi yapısal/benzersiz eşleşme kontrolünden geçer | PASS | actual V0.6 archive and review-form data test |
| T-028 | Fortress izinleri yalnız kaynak/hedef kesişimi kadar aktarılır | PASS | Fortress-to-admin crosswalk test |
| T-029 | Süresi geçmiş/gelecek, bilinmeyen/çakışan claim ve provider hatası reddedilir | PASS | Fortress role adapter rejection test |
| T-030 | MFA, self-approval ve doğrulanmış grant kaynağı uygulanır | PASS | role mapping policy test |
| T-031 | Audit role tampering, yinelenen ID ve bozuk zinciri reddeder | PASS | audit events reject tampering and broken chains |
| T-032 | Editoryal karar farklı MFA aktörleri, aynı hash ve audit kanıtı ister | PASS | editorial decision readiness test |
| T-033 | Hazırlık sayımları dinamik, insan kapıları olmadan release hazır değil | PASS | readiness report computes dynamic counts |
| T-034 | Staging güvensiz alan, eski revizyon ve kalıcı depo yokluğunu reddeder | PASS | staging proposals reject unsafe inputs and missing storage |
| T-035 | Staging yazımı atomik revision-plus-audit sözleşmesi ister | PASS | staging writes require atomic transaction contract |

## HTTP erişim sınırı ve görünüm

| ID | Kabul kontrolü | Durum | Kanıt |
|---|---|---|---|
| T-036 | `/yonetim` güvenilir provider yokken 404 döndürür | PASS | `admin-v08.spec.ts`, `admin-v08-production.spec.ts` |
| T-037 | `/yonetim/arsiv` korumalıdır | PASS | aynı route testleri |
| T-038 | `/yonetim/arsiv/1924-anayasasi` korumalıdır | PASS | aynı route testleri |
| T-039 | `/yonetim/incelemeler` korumalıdır | PASS | aynı route testleri |
| T-040 | `/yonetim/yayinlar` korumalıdır | PASS | aynı route testleri |
| T-041 | `/yonetim/makaleler` korumalıdır | PASS | aynı route testleri |
| T-042 | `/yonetim/takvim` korumalıdır | PASS | aynı route testleri |
| T-043 | `/yonetim/tarihte-bugun` korumalıdır | PASS | aynı route testleri |
| T-044 | `/yonetim/kaynaklar` korumalıdır | PASS | aynı route testleri |
| T-045 | `/yonetim/kullanicilar` korumalıdır | PASS | aynı route testleri |
| T-046 | `/yonetim/denetim` korumalıdır | PASS | aynı route testleri |
| T-047 | `/yonetim/sistem` korumalıdır | PASS | aynı route testleri |
| T-048 | `x-admin-role` yetki sağlamaz | PASS | production/dev E2E client-controlled identity testi |
| T-049 | Basic auth yetki sağlamaz | PASS | production E2E client-controlled identity testi |
| T-050 | localStorage rolü yetki sağlamaz | PASS | production/dev E2E client-controlled identity testi |
| T-051 | Query role/token parametreleri yetki sağlamaz | PASS | production E2E client-controlled identity testi |
| T-052 | 404 yanıtı arşiv içeriğini açığa çıkarmaz | PASS | production E2E body assertions |
| T-053 | Mobil/masaüstü hata görünümünde yatay taşma yok | PASS | `admin-v08.spec.ts`, 320–1536px viewport kontrolü |
| T-054 | Web testleri, lint ve TypeScript denetimi geçer | PASS | doğrulama raporu; komutlar README'de |
| T-055 | Production build başarıyla tamamlanır | PASS | doğrulama raporu |
| T-056 | Production `next start` üzerinde korumalı route testleri geçer | PASS | production Playwright: 2/2 |
| T-057 | Release checker ve arşiv testleri çalıştırılır | PASS | release raporu: release-checker-tests ve archive-engine-tests başarılı |
| T-058 | Bağımlılık denetimi çalışır | PASS | full ve production npm audit adımları başarılı |
| T-059 | Rapor otomatik test başarısı ile insan onayını karıştırmaz | PASS | release raporu: 272 test başarılı, release-ready=false |
| T-060 | Gerçek arşivde yayın engelleri görünür kalır | PASS | release raporu: 302 kritik bulgu, 168 uzman incelemesi |

## Gerçek üretim kimliği, kalıcı saklama ve imzalı denetim

| ID | Kabul kontrolü | Durum | Kanıt |
|---|---|---|---|
| T-061 | Üretim OIDC sağlayıcısı issuer/audience doğrular | NOT IMPLEMENTED | Gerçek IdP kaydı yok |
| T-062 | Sunucu oturumu kısa ömürlü ve HttpOnly/Secure cookie ile taşınır | NOT IMPLEMENTED | Production session provider yok |
| T-063 | Oturum yenileme ve iptal (revocation) uygulanır | NOT IMPLEMENTED | Production session provider yok |
| T-064 | Üretim MFA sağlayıcısı assertion doğrular | NOT IMPLEMENTED | Gerçek MFA entegrasyonu yok |
| T-065 | Rol ataması güvenilir sunucu kaynağında saklanır | NOT IMPLEMENTED | Kalıcı kimlik/rol deposu yok |
| T-066 | Kaynak rol/izinleri canlı Fortress token'ından doğrulanır | BLOCKED | PR #28 entegrasyonu bu dalda yok |
| T-067 | CSRF token ve Origin doğrulaması mutasyonlarda zorunludur | NOT IMPLEMENTED | Mutasyon API'si yok |
| T-068 | Her mutasyonda resource-level server permission kontrolü yapılır | NOT IMPLEMENTED | Production mutasyon API'si yok |
| T-069 | Kimlik sağlayıcısı hata verince üretimde deny davranışı gözlenir | BLOCKED | Canlı provider yok; yalnız saf adapter testi var |
| T-070 | Kimlik oturumu role tampering'e karşı production E2E ile doğrulanır | BLOCKED | Üretim provider'ı bulunmuyor |
| T-071 | Yetki yükseltme ve rol değişikliği production audit'e yazılır | NOT IMPLEMENTED | Kalıcı audit deposu yok |
| T-072 | İnsan aktör subject'i güvenilir IdP'den gelir | NOT IMPLEMENTED | Gerçek insan kimliği bağlanmadı |
| T-073 | Tarih uzmanı kararının insan tarafından verildiği doğrulanır | BLOCKED | Uzman onay altyapısı yok |
| T-074 | Editör onayı ayrı ve yetkili insandan gelir | BLOCKED | Editör onay altyapısı yok |
| T-075 | Uzman ve editör farklı gerçek kişilerdir | BLOCKED | Güvenilir actor identity yok |
| T-076 | İnsan kararı güncel kayıt hash'ine atomik bağlanır | BLOCKED | Kalıcı veritabanı ve approval transaction yok |
| T-077 | Karar kanıtı ve açıklaması değişmez depoda korunur | NOT IMPLEMENTED | Production decision store yok |
| T-078 | Onay yazımı audit yazımı başarısızsa rollback olur | NOT IMPLEMENTED | DB transaction yok |
| T-079 | Audit kaydı append-only rol/trigger ile korunur | NOT IMPLEMENTED | SQL taslağı uygulanmadı |
| T-080 | Audit zinciri üretimde imza/anahtar ile doğrulanır | NOT IMPLEMENTED | Hash helper imza/anahtar sağlamaz |
| T-081 | Audit hash anahtarı rotasyonu ve kurtarma prosedürü vardır | NOT IMPLEMENTED | İmzalı ledger yok |
| T-082 | Audit saklama/PII retention politikası kurumsal olarak belirlenmiştir | BLOCKED | Saklama kararı alınmadı |
| T-083 | Audit yedekleme ve restore testi yapılır | NOT IMPLEMENTED | Kalıcı audit deposu yok |
| T-084 | DB rolü least-privilege ve production secret yönetimi ile kurulur | NOT IMPLEMENTED | DB entegrasyonu yok |
| T-085 | Idempotency kaydı gerçek transaction içinde kalıcıdır | NOT IMPLEMENTED | Kalıcı idempotency deposu yok |

## Staging, yayın ve operasyonel entegrasyon

| ID | Kabul kontrolü | Durum | Kanıt |
|---|---|---|---|
| T-086 | Editör taslağı mevcut arşiv JSON'una yazmadan staging'de tutulur | BLOCKED | Staging storage `not_configured` |
| T-087 | Öneri alan allowlist'i production API'de zorunludur | BLOCKED | Saf validator var; production API yok |
| T-088 | JSON derinlik/boyut sınırı production request'te uygulanır | BLOCKED | Saf validator var; production API yok |
| T-089 | Staging revision compare-and-swap kalıcı depoda atomiktir | NOT IMPLEMENTED | Kalıcı repository yok |
| T-090 | Çakışan editör değişikliği production akışında görünür | BLOCKED | Gerçek yazma/depo altyapısı yok |
| T-091 | Staging'den yayın adayına geçiş yalnız izinli state transition ile olur | BLOCKED | Production workflow endpoint yok |
| T-092 | Yayın API'si tarih uzmanı incelemesini zorunlu kılar | BLOCKED | Gerçek onay API'si yok |
| T-093 | Yayın API'si ayrı editör onayını zorunlu kılar | BLOCKED | Gerçek onay API'si yok |
| T-094 | Aynı aktör uzman ve editör kararını veremez | BLOCKED | Gerçek actor store yok |
| T-095 | Eksik/stale/yanlış hash onayı yayını engeller | BLOCKED | Saf readiness testi var; production API yok |
| T-096 | Release gate'in CI branch protection'a bağlandığı doğrulanır | BLOCKED | Repository branch protection bu PR kapsamı dışında |
| T-097 | PR #28 proxy/CSP/readiness kontrolleri birlikte çalıştırılır | BLOCKED | PR #28 bağımsız; bu dala alınmadı |
| T-098 | Gerçek audit geçmişi ve pagination admin ekranında gösterilir | NOT IMPLEMENTED | Kalıcı audit deposu yok |
| T-099 | Gerçek scheduler iş durumu ve retry operasyonu yönetilir | NOT IMPLEMENTED | Scheduler entegrasyonu yok |
| T-100 | Canlı sistem sağlık/DB/IdP kontrolleri doğrulanır | BLOCKED | Gerçek servisler bağlanmadı |
| T-101 | Uyarı/incident kaydı ve on-call eskalasyonu vardır | NOT IMPLEMENTED | Operasyonel izleme entegrasyonu yok |
| T-102 | Erişim loglarında secret/PII sızıntısı için production taraması yapılır | BLOCKED | Üretim kimlik/audit trafiği yok |
| T-103 | Gerçek kimlik sağlayıcısı ile olumlu yetkili kullanıcı akışı E2E test edilir | BLOCKED | Güvenli test tenant'ı ve provider yok |
| T-104 | Gerçek MFA ve iki-insanlı yayın akışı E2E test edilir | BLOCKED | İnsan onay entegrasyonu yok |
| T-105 | Deployment/rollback/backup restore üretim benzeri ortamda denenir | BLOCKED | Bu PR deploy yapmaz; production ortamı yok |

## Koşu özeti

- `npm test`: 69 geçti, 0 başarısız.
- `npm run lint`, `npm run typecheck`, `npm run build`: başarılı.
- Release quality runner: 272 otomatik test geçti, 0 başarısız; CI release gate başarısız (302 kritik bulgu, 11 uyarı, 168 insan uzman incelemesi).
- Production route E2E: 2 geçti.
- Python editoryal testleri: 45 geçti, 1 harici arşiv entegrasyon testi yapılandırılmadığı için atlandı.
- Üretim kimliği, kalıcı DB/audit ve gerçek insan kararları bu PR'da yoktur; T-061–T-105 PASS değildir.
