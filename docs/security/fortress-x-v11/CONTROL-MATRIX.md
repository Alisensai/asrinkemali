# MKA FORTRESS X V1.1 — 99 güvenlik kontrolü matrisi

- **Taban:** `integration/asrinkemali-v11-fortress-x` @ `005842d`.
- **Tarih:** 2026-10-24.
- **Kaynak:** 99 kontrol, görevdeki 12 alan başlığından türetildi. Görevde ayrıntılı bir liste verilmediği için her alan, sektörde ayrı ayrı denetlenen kontrollere bölündü. Benzer kontroller aynı grupta tutuldu ve gerekçeleri ortak.

**Durum tanımları**

| Durum | Anlamı |
|---|---|
| `IMPLEMENTED` | Kodda veya CI'da çalışıyor ve testle doğrulanıyor |
| `PARTIAL` | Kontrolün bir kısmı var. Eksik kısım satırda yazıyor. |
| `MISSING` | Bu repoda yapılabilir ama yok |
| `NOT_APPLICABLE` | Bugünkü mimaride karşılığı yok. Gerekçesi satırda yazıyor. |
| `REQUIRES_INFRASTRUCTURE` | Barındırma, ağ, kimlik sağlayıcısı veya ücretli hizmet gerektiriyor. Repo içinden sağlanamaz. |

**Mimari gerçeği** (durumların çoğunun nedeni):
- ASRIN KEMALİ salt-okunur bir Next.js sitesi.
- Veritabanı ve durum değiştiren (POST/PUT/DELETE) uç nokta yok.
- Kimlik sağlayıcısı yok; yönetim yüzeyi fail-closed (404).
- Repoda dağıtım altyapısı yok: Docker, Kubernetes, IaC, CDN veya WAF yapılandırması bulunmuyor.
- Hiçbir koruma, uygulanmadığı halde uygulanmış gibi işaretlenmedi.

## Özet

| Durum | Sayı |
|---|---|
| IMPLEMENTED | 22 |
| PARTIAL | 21 |
| MISSING | 9 |
| NOT_APPLICABLE | 6 |
| REQUIRES_INFRASTRUCTURE | 41 |
| **Toplam** | **99** |

## A. Ağ çevresi: Firewall, NGFW, WAF, IDS, IPS, Anti-DDoS

Gerekçe (A1–A8): Bu katmanlar uygulamanın önündeki ağ/kenar altyapısında çalışır. Repoda ağ yapılandırması yok.

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 1 | Ağ güvenlik duvarı (L3/L4) | REQUIRES_INFRASTRUCTURE | Barındırma sağlayıcısı veya bulut güvenlik grubu |
| 2 | Yeni nesil güvenlik duvarı (NGFW) | REQUIRES_INFRASTRUCTURE | Kenar/ağ cihazı |
| 3 | Web uygulama güvenlik duvarı (WAF) | REQUIRES_INFRASTRUCTURE | CDN/kenar WAF. Uygulama içi karşılıkları F grubunda. |
| 4 | Saldırı tespit sistemi (IDS) | REQUIRES_INFRASTRUCTURE | Ağ/ana makine sensörü. BLACKOUT, `ids` kaynaklı olayları kabul eden arayüze sahip. |
| 5 | Saldırı önleme sistemi (IPS) | REQUIRES_INFRASTRUCTURE | Satır içi ağ cihazı |
| 6 | Anti-DDoS (L3/L4 hacimsel) | REQUIRES_INFRASTRUCTURE | Anycast/scrubbing hizmeti |
| 7 | Anti-DDoS (L7 uygulama) | REQUIRES_INFRASTRUCTURE | Kenar hız sınırlama ve bot yönetimi. BLACKOUT LOCKDOWN salt-okunur mod etkiyi azaltır ama DDoS koruması değildir. |
| 8 | Çıkış (egress) trafiği filtreleme | REQUIRES_INFRASTRUCTURE | Çalışma ortamı ağ politikası. Uygulama dış ağ çağrısı yapmıyor (CSP `connect-src 'self'`). |
| 9 | Coğrafi/ASN tabanlı engelleme | NOT_APPLICABLE | Herkese açık kültür arşivi. Coğrafi engelleme erişilebilirlik amacına aykırı; saldırı anında kenarda geçici kural olarak değerlendirilir. |
| 10 | DNS güvenliği (DNSSEC, CAA, kayıt kilidi) | REQUIRES_INFRASTRUCTURE | Alan adı/DNS sağlayıcısı. Bu görevde DNS değişikliği yasak. |

## B. İzleme ve müdahale: SIEM, SOC, SOME, EDR, XDR, SOAR

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 11 | SIEM (merkezi olay korelasyonu) | REQUIRES_INFRASTRUCTURE | Günlük toplama platformu. Uygulama JSON yapılı günlük üretiyor (#17). |
| 12 | SOC (7/24 güvenlik operasyon merkezi) | REQUIRES_INFRASTRUCTURE | Organizasyonel ekip ve hizmet |
| 13 | SOME / ulusal CERT (USOM) koordinasyonu | MISSING | Siber olaylara müdahale ekibi, iletişim noktası ve `/.well-known/security.txt` yok |
| 14 | EDR (uç nokta tespit ve müdahale) | REQUIRES_INFRASTRUCTURE | Sunucu ve geliştirici makinelerinde ajan |
| 15 | XDR (genişletilmiş tespit) | REQUIRES_INFRASTRUCTURE | EDR + ağ + bulut telemetrisi |
| 16 | SOAR (otomatik müdahale orkestrasyonu) | PARTIAL | **BLACKOUT** karar motoru, onay kapısı ve port tabanlı yürütücü SOAR oyun kitabı mantığını sağlıyor (`web/lib/security/blackout/`). Orkestrasyon platformu ve gerçek port uygulamaları yok. |
| 17 | Yapılandırılmış güvenlik günlüğü | IMPLEMENTED | `web/lib/server/log.ts` `logEvent` (JSON, seviye, olay adı) |
| 18 | Günlükte hassas veri redaksiyonu | IMPLEMENTED | `redact()`: parola, belirteç, çerez, JWT, özel anahtar. BLACKOUT kanıtı da redakte ediliyor (BO-18). |
| 19 | Güvenlik uyarı/bildirim kanalı | REQUIRES_INFRASTRUCTURE | BLACKOUT `ResponderNotifier` arayüzü hazır, uygulaması yok (e-posta/çağrı/sohbet hizmeti gerekir) |
| 20 | Olay müdahale el kitabı (runbook) | PARTIAL | `BLACKOUT.md` düzeyler, onaylar ve geri dönüşü tanımlıyor. Kişi, nöbet ve iletişim zinciri tanımlı değil. |

## C. Ağ erişimi ve iletim: NAC, VPN, TLS, segmentasyon

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 21 | NAC (ağ erişim denetimi) | NOT_APPLICABLE | Proje kurumsal yerel ağ işletmiyor. Ekip ofis ağı kurulursa yeniden değerlendirilir. |
| 22 | Yönetim erişimi için VPN / sıfır güven ağ geçidi | REQUIRES_INFRASTRUCTURE | Yönetim yüzeyi bugün tamamen kapalı (#48). Açılmadan önce kimlik farkındalıklı ağ geçidi gerekir. |
| 23 | TLS 1.2+/1.3 sonlandırma | REQUIRES_INFRASTRUCTURE | Barındırma/CDN sertifika ve şifre takımı |
| 24 | HSTS | PARTIAL | `headers.ts`: `ASRIN_ENABLE_HSTS=1` ile `max-age=31536000; includeSubDomains`. HTTPS dağıtımı olmadan etkin değil. |
| 25 | HSTS preload listesi | MISSING | `preload` yönergesi ve hstspreload.org başvurusu yok. Alan adı sahibinin kararı. |
| 26 | Servisler arası mTLS | NOT_APPLICABLE | Tek servis; iç servis çağrısı yok |
| 27 | Ağ segmentasyonu | REQUIRES_INFRASTRUCTURE | Barındırma ağı / VPC |
| 28 | Kökeni gizleme (yalnız CDN'den erişim) | REQUIRES_INFRASTRUCTURE | Origin yalnız kenar IP'lerine açık olmalı |

## D. Kenar: CDN, Anycast, bot yönetimi, hız sınırlama, IP itibarı

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 29 | CDN | REQUIRES_INFRASTRUCTURE | Ücretli/harici hizmet. Bu görevde açılmadı. |
| 30 | Anycast | REQUIRES_INFRASTRUCTURE | CDN/DNS sağlayıcısı |
| 31 | Bot yönetimi | REQUIRES_INFRASTRUCTURE | Kenar hizmeti. Uygulamada yalnız `robots`/`noindex` var; bunlar koruma değildir. |
| 32 | Hız sınırlama (rate limiting) | REQUIRES_INFRASTRUCTURE | Uygulama içinde yok. Çok örnekli dağıtımda paylaşılan sayaç deposu (Redis/KV) veya kenar kuralı gerekir. |
| 33 | IP itibar listeleri | REQUIRES_INFRASTRUCTURE | Tehdit istihbaratı beslemesi + kenar |
| 34 | Önbellek politikası (hassas yanıtlar önbelleğe girmez) | IMPLEMENTED | `NO_STORE_ROUTES`. FORTRESS e2e: "operasyonel uç noktalar no-store". |
| 35 | Origin kalkanı (origin shielding) | REQUIRES_INFRASTRUCTURE | CDN özelliği |
| 36 | İnsan doğrulama (challenge) | REQUIRES_INFRASTRUCTURE | Kenar challenge. Herkese açık okuma için CAPTCHA kullanılmıyor; bu bilinçli bir karar. |

## E. Kimlik ve erişim: IAM, MFA, FIDO2, passkeys, PAM, RBAC, JIT

Gerekçe (E37–E46): Rol, MFA ve görev ayrılığı politikası kodda ve testlerde var (`access-contract.ts`, `editorial-trust/`). Ancak gerçek kimlik sağlayıcısı kayıtlı değil (`REGISTERED_PROVIDER = null`). Politika canlı bir oturum üzerinde çalışmıyor.

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 37 | Kimlik sağlayıcısı (IAM / OIDC) | REQUIRES_INFRASTRUCTURE | `REGISTERED_PROVIDER = null`, `REGISTERED_IDENTITY_PROVIDER = null` |
| 38 | MFA | PARTIAL | `authorize()`: onay, zamanlama, uzman incelemesi ve kullanıcı yönetimi MFA ister (test var). Sağlayıcı yok. |
| 39 | FIDO2 / WebAuthn | REQUIRES_INFRASTRUCTURE | Kimlik sağlayıcısı özelliği |
| 40 | Passkeys | REQUIRES_INFRASTRUCTURE | Kimlik sağlayıcısı özelliği |
| 41 | PAM (ayrıcalıklı erişim yönetimi) | MISSING | Ayrıcalıklı oturum kaydı ve kasası yok |
| 42 | RBAC | PARTIAL | `ROLE_PERMISSIONS` + `authorize()` testli. Canlı oturum yok. |
| 43 | Görev ayrılığı (kendi içeriğini onaylayamaz, admin içerik onaylayamaz) | PARTIAL | `authorize()` self-approval; editoryal güven kapıları. Canlı kimlik yok. |
| 44 | JIT (tam zamanında) yetki | MISSING | Süreli yetki yükseltme akışı yok |
| 45 | Oturum ömrü ve zaman damgası doğrulaması | PARTIAL | `validateSession()` (8 saat üst sınır, gelecek tarih reddi). Oturum deposu yok. |
| 46 | Güvenli oturum çerezi politikası | PARTIAL | `validateSessionCookie()` (`__Host-`, Secure, HttpOnly, SameSite=Strict). Çerez üreten kod yok. |
| 47 | Onay–içerik bağı (içerik değişince onay düşer) | IMPLEMENTED | `verifyApprovalBinding()`, editoryal güven kapıları, BLACKOUT `planDigest` |
| 48 | Yönetim yüzeyi kapalı-başarısız | IMPLEMENTED | `proxy.ts` + `decideAccess`: `/admin`, `/yonetim`, `/panel`, `/api/admin` production'da 404 (e2e) |

## F. Uygulama: XSS, SQL injection, CSRF, API güvenliği

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 49 | XSS: çıktı kaçışlama | IMPLEMENTED | React kaçışlama; `dangerouslySetInnerHTML` kullanımı 0. FORTRESS e2e "yansıtılan girdiler kaçışlanır". |
| 50 | Content Security Policy | PARTIAL | Uygulanıyor: `object-src 'none'`, `frame-ancestors 'none'`, `connect-src 'self'`. `script-src 'unsafe-inline'` hâlâ var; nonce tabanlı katı CSP yok. **Risk:** Production'da `ASRIN_CSP_MODE=report-only` zorunlu CSP'yi kaldırıyor ve raporlama uç noktası yok. `off` açığını PR #72 kapatıyor, report-only açık kalıyor (bkz. `PR72-CSP-REVIEW.md`). |
| 51 | Bağlantı (href) izin listesi | IMPLEMENTED | `safe-url.ts`: TextLink, okuma listeleri, sergi kaynakları (V1.0) |
| 52 | SQL injection | NOT_APPLICABLE | SQL veritabanı yok; içerik repo içi JSON |
| 53 | CSRF | NOT_APPLICABLE | Bugün durum değiştiren uç nokta yok. `verifyCsrf()` (köken + çift gönderimli belirteç) hazır; ilk POST ile zorunlu olur. |
| 54 | API girdi doğrulama | IMPLEMENTED | Dışa aktarım biçimi izin listesi (bilinmeyen → 400), okuma listesi içe aktarma boyut ve prototip koruması |
| 55 | API yetkilendirme | IMPLEMENTED | Araştırma laboratuvarı ve dışa aktarım production'da 404; yönetim API'leri 404 |
| 56 | Güvenlik başlıkları | IMPLEMENTED | `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP, CORP |
| 57 | Yol geçişi (path traversal) | IMPLEMENTED | Slug doğrulama; `/arsiv/..%2f..` → 404 (e2e) |
| 58 | CSV/formül enjeksiyonu | IMPLEMENTED | `csv.ts` (V0.9) |
| 59 | Açık yönlendirme | IMPLEMENTED | FORTRESS e2e "açık yönlendirme yok" |
| 60 | Hata yanıtında iç bilgi sızmaması | IMPLEMENTED | `errorFields()` yığını yalnız geliştirmede tutuyor; `error.tsx` genel mesaj |

## G. Yazılım tedarik zinciri ve CI/CD: SAST, DAST, SCA, SBOM

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 61 | SAST | MISSING | CodeQL/Semgrep yok. Yalnız ESLint ve TypeScript. Ücretsiz CodeQL eklenebilir (Codex/CI sahibi). |
| 62 | DAST | PARTIAL | Playwright güvenlik e2e (25 test), `csp-probe.mjs`. OWASP ZAP benzeri tarayıcı yok. |
| 63 | SCA (bağımlılık açıkları) | IMPLEMENTED | `supply-chain.mjs --audit`; CI'da yüksek/kritik bulguda engelliyor |
| 64 | SBOM | PARTIAL | `supply-chain.mjs` doğrudan/dolaylı envanter üretiyor. Standart CycloneDX/SPDX çıktısı ve imzası yok. |
| 65 | Kilit dosyası bütünlüğü | IMPLEMENTED | `supply-chain.mjs` (kayıt defteri kaynağı, integrity alanları) |
| 66 | CI aksiyonlarının SHA ile sabitlenmesi | PARTIAL | `security.yml` sabit. `ci.yml`, `nextjs-ci.yml`, `release-quality.yml`, `editorial-trust.yml` `@v4`/`@v5` etiketleri kullanıyor. |
| 67 | Workflow en az yetki (`permissions:`) | IMPLEMENTED | 5 workflow'un 5'inde `permissions` bloğu var |
| 68 | Sır taraması | IMPLEMENTED | GitHub secret scanning + push protection açık; CI'da `secrets.mjs` (0 bulgu) |
| 69 | Dal koruması ve zorunlu inceleme | MISSING | `main` dalı korumasız (GitHub API: "Branch not protected"). Depo sahibinin ayarı; bu görevde değiştirilmedi. |
| 70 | İmzalı commit/sürüm, sürüm kanıtı (provenance) | MISSING | İmza zorunluluğu ve SLSA provenance yok |

## H. Çalışma ortamı: sunucu, container, Kubernetes, bulut

Gerekçe (H71–H75, H78): Dağıtım hedefi repoda tanımlı değil. Bu kontroller barındırma seçimine bağlı.

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 71 | Sunucu sıkılaştırma (CIS) | REQUIRES_INFRASTRUCTURE | Barındırma |
| 72 | Container imaj güvenliği (tarama, minimal imaj) | REQUIRES_INFRASTRUCTURE | Repoda Dockerfile yok |
| 73 | Container çalışma zamanı güvenliği | REQUIRES_INFRASTRUCTURE | Root olmayan kullanıcı, salt-okunur dosya sistemi, seccomp |
| 74 | Kubernetes güvenliği (RBAC, NetworkPolicy, PSA) | REQUIRES_INFRASTRUCTURE | Repoda Kubernetes kümesi ve manifest yok |
| 75 | Bulut IAM ve CSPM | REQUIRES_INFRASTRUCTURE | Bulut hesabı yok |
| 76 | IaC güvenlik taraması | NOT_APPLICABLE | Repoda IaC (Terraform/Helm) yok |
| 77 | Yama/güncelleme yönetimi | PARTIAL | `npm audit` CI'da engelliyor. Dependabot kapalı, Renovate yok. |
| 78 | Sır yöneticisi (vault) | REQUIRES_INFRASTRUCTURE | Önizleme parolası düz metin değil, SHA-256 ile karşılaştırılıyor. Merkezi sır kasası yok. |

## I. Tehdit istihbaratı ve saldırı yüzeyi

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 79 | Tehdit istihbaratı beslemeleri | REQUIRES_INFRASTRUCTURE | Harici besleme ve SIEM |
| 80 | Anomali tespiti | PARTIAL | BLACKOUT sınıflandırması, yoğunluk eşiği ve doğrulama mantığı (BO-01…08). Canlı telemetri kaynağı yok. |
| 81 | Saldırı yüzeyi yönetimi (ASM) | MISSING | Dış varlık envanteri ve sürekli tarama yok. Rota envanteri release-check'te var. |
| 82 | Tehdit modeli | IMPLEMENTED | `docs/security/THREAT-MODEL.md` |
| 83 | Arşiv bütünlüğü ve değişiklik tespiti | IMPLEMENTED | `integrity.mjs check/diff` CI'da (beklenmeyen değişiklik 0) |
| 84 | Performans ve kötüye kullanım temel çizgisi | PARTIAL | `perf.mjs` yalnız yerel. Production metriği yok. |

## J. Şifreleme ve veri güvenliği

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 85 | Aktarımda şifreleme | REQUIRES_INFRASTRUCTURE | TLS sonlandırma (#23) |
| 86 | Durağan veride şifreleme | REQUIRES_INFRASTRUCTURE | Barındırma diski/nesne deposu. Sunucuda kullanıcı verisi yok. |
| 87 | HSM / KMS | REQUIRES_INFRASTRUCTURE | Uygulamada imzalama anahtarı yok. Kimlik ve onay imzaları için gerekecek. |
| 88 | Anahtar rotasyonu | REQUIRES_INFRASTRUCTURE | KMS politikası. BLACKOUT, "anahtarı döndürüp eskisini yok etme" eylemini yasak listesinde tutuyor. |
| 89 | Veri sınıflandırma | PARTIAL | Kayıtlarda hak durumu ve yayın durumu sınıflaması var. Biçimsel veri sınıflandırma politikası yok. |
| 90 | Kişisel verinin en aza indirilmesi | IMPLEMENTED | Sunucuda kişisel veri tutulmuyor; okuma listeleri yalnız tarayıcıda (`localStorage`) |
| 91 | İçerik bütünlüğü özetleri | IMPLEMENTED | `integrity.mjs manifest` (SHA-256), BLACKOUT kanıt zinciri |

## K. Süreklilik, yedek ve günlük

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 92 | Felaket kurtarma planı (RTO/RPO) | MISSING | Yazılı DR planı ve hedefleri yok |
| 93 | Değiştirilemez yedek (WORM / nesne kilidi) | PARTIAL | `backup.mjs`: manifestli yedek, hash ve kurcalama doğrulaması. Değiştirilemez depolama yok. |
| 94 | Geri yükleme testi | PARTIAL | `backup.mjs restore` varsayılan dry-run ve testli. Düzenli tatbikat takvimi yok. |
| 95 | Kurcalamaya dayanıklı denetim kaydı | PARTIAL | `appendAuditEvent`/`verifyAuditChain` ve BLACKOUT kanıt defteri hash zincirli. Kalıcı depolama yok. |
| 96 | Merkezi günlük saklama | REQUIRES_INFRASTRUCTURE | Günlük deposu ve saklama politikası |

## L. Kritik müdahale

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| 97 | Şüpheli oturum iptali | PARTIAL | BLACKOUT `SessionRevoker` arayüzü, onay kuralları ve testleri var. Oturum deposu yok. |
| 98 | Ağ karantinası | REQUIRES_INFRASTRUCTURE | Ağ düzeyinde izolasyon kenar/bulut gerektirir. Uygulama düzeyinde BLACKOUT RESTRICTED/LOCKDOWN rota kararı var (bağlı değil). |
| 99 | PROJECT BLACKOUT acil durum sistemi | PARTIAL | Sınıflandırma, yanlış alarm koruması, iki kişilik insan onayı, kanıt defteri, durum makinesi, kontrollü geri dönüş ve 21 test var. Production'a bağlı değil; port uygulamaları ve paylaşılan durum deposu yok. Bkz. `BLACKOUT.md`. |
