# MKA FORTRESS X V1.1 — güvenlik kontrolü matrisi

- **Kaynak liste:** [SOURCE-CONTROL-LIST.md](SOURCE-CONTROL-LIST.md), kullanıcının verdiği özgün liste. Madde numaraları ve adları **birebir korundu**.
- **Madde sayısı:** Özgün liste **99 madde**. "Firewall" numarasız bir başlıktır, madde değildir (kullanıcı düzeltmesi, 2026-10-24).
- **Ek öneriler:** Listede olmayan ve önceki matriste bulunan kontroller ayrı bölümde ([Ek öneriler](#ek-öneriler-özgün-listede-yok)). Toplama dahil değiller.
- **Taban ve tarih:** `integration/asrinkemali-v11-fortress-x` @ `005842d`, 2026-10-24.

> Kaynak listenin notu: İlk 26 madde TBMM'nin kamuya açık bilişim ilanlarında geçen teknoloji alanlarını temel alır; kurumda aktif kullanıldıkları doğrulanmış değildir. Bu matris yalnız **ASRIN KEMALİ'nin** durumunu gösterir. Hiçbir kurumun sistemini temsil etmez.

**Durum tanımları**

| Durum | Anlamı |
|---|---|
| `IMPLEMENTED` | Kodda veya CI'da çalışıyor ve testle doğrulanıyor |
| `PARTIAL` | Bir kısmı var. Eksik kısım satırda yazıyor. |
| `MISSING` | Bu repoda veya proje süreçlerinde yapılabilir ama yok |
| `NOT_APPLICABLE` | Bugünkü mimaride karşılığı yok. Gerekçesi satırda yazıyor. |
| `REQUIRES_INFRASTRUCTURE` | Barındırma, ağ, kimlik sağlayıcısı veya ücretli hizmet gerektiriyor. Repo içinden sağlanamaz. |

**Mimari gerçeği:**
- Salt-okunur Next.js sitesi.
- Veritabanı, sunucuya dosya yükleme ve durum değiştiren (POST/PUT/DELETE) uç nokta yok.
- Kimlik sağlayıcısı yok; yönetim yüzeyi fail-closed (404).
- Repoda dağıtım altyapısı yok.
- Hiçbir koruma, uygulanmadığı halde uygulanmış gibi işaretlenmedi.

## Özet (99 madde)

| Durum | Sayı |
|---|---|
| IMPLEMENTED | 5 |
| PARTIAL | 25 |
| MISSING | 13 |
| NOT_APPLICABLE | 10 |
| REQUIRES_INFRASTRUCTURE | 46 |
| **Toplam** | **99** |

## 1–98: Kurumsal güvenlik kontrolleri (başlık: Firewall)

| # | Kontrol | Durum | ASRIN KEMALİ kanıtı / gerekçe |
|---|---|---|---|
| 1 | Next-Generation Firewall (NGFW) | REQUIRES_INFRASTRUCTURE | Kenar/ağ cihazı |
| 2 | Web Application Firewall (WAF) | REQUIRES_INFRASTRUCTURE | CDN/kenar WAF. Uygulama içi karşılıklar #47, #50, #73, #74 ve Ek öneriler. |
| 3 | Intrusion Detection System (IDS) | REQUIRES_INFRASTRUCTURE | Ağ/ana makine sensörü. BLACKOUT `ids` kaynaklı olayları kabul eden arayüze sahip. |
| 4 | Intrusion Prevention System (IPS) | REQUIRES_INFRASTRUCTURE | Satır içi ağ cihazı |
| 5 | Anti-DDoS Protection | REQUIRES_INFRASTRUCTURE | Anycast/scrubbing ve kenar L7 koruması. BLACKOUT LOCKDOWN etkiyi azaltır ama DDoS koruması değildir. |
| 6 | Security Information and Event Management (SIEM) | REQUIRES_INFRASTRUCTURE | Günlük toplama/korelasyon platformu. Uygulama redakte JSON günlük üretiyor (#21). |
| 7 | Endpoint Detection and Response (EDR) | REQUIRES_INFRASTRUCTURE | Sunucu ve geliştirici makinelerinde ajan |
| 8 | Extended Detection and Response (XDR) | REQUIRES_INFRASTRUCTURE | EDR + ağ + bulut telemetrisi |
| 9 | Security Operations Center (SOC) | REQUIRES_INFRASTRUCTURE | Organizasyonel 7/24 ekip ve hizmet |
| 10 | Siber Olaylara Müdahale Ekibi (SOME) | MISSING | Müdahale ekibi, iletişim noktası, USOM koordinasyonu ve `/.well-known/security.txt` yok. BLACKOUT onay rolleri (`security_officer`, `incident_commander`) tanımlı ama kişiye atanmamış. |
| 11 | Network Access Control (NAC) | NOT_APPLICABLE | Proje kurumsal yerel ağ işletmiyor. Ofis ağı kurulursa yeniden değerlendirilir. |
| 12 | Virtual Private Network (VPN) | REQUIRES_INFRASTRUCTURE | Yönetim yüzeyi bugün tamamen kapalı (Ek öneri E2). Açılmadan önce VPN/kimlik farkındalıklı ağ geçidi gerekir. |
| 13 | SSL/TLS Encryption | REQUIRES_INFRASTRUCTURE | TLS sonlandırma barındırma/CDN'de. HSTS başlığı uygulamada hazır (`ASRIN_ENABLE_HSTS=1`, `max-age=31536000; includeSubDomains`) ama yalnız HTTPS dağıtımında açılır. |
| 14 | Malware Sandbox | NOT_APPLICABLE | Sunucu dosya veya e-posta eki almıyor (#53) |
| 15 | Secure Email Gateway | NOT_APPLICABLE | Site e-posta altyapısı işletmiyor. Proje e-postası kurulursa sağlayıcı düzeyinde gerekir. |
| 16 | Endpoint Protection Platform (EPP) | REQUIRES_INFRASTRUCTURE | Sunucu ve geliştirici uç noktaları |
| 17 | Vulnerability Management | PARTIAL | `supply-chain.mjs --audit` CI'da yüksek/kritik bağımlılık açığında engelliyor. Altyapı/ana makine tarayıcısı yok, Dependabot kapalı. |
| 18 | Penetration Testing | PARTIAL | Otomatik saldırı senaryoları her PR'da: Playwright güvenlik e2e (XSS, açık yönlendirme, yol geçişi, büyük/geçersiz girdi, önbellek; 25 test). Bağımsız, insan yürütmeli sızma testi yapılmadı. |
| 19 | Identity and Access Management (IAM) | REQUIRES_INFRASTRUCTURE | `REGISTERED_PROVIDER = null`, `REGISTERED_IDENTITY_PROVIDER = null`. Rol ve izin politikası kodda var (#41). |
| 20 | Load Balancer | REQUIRES_INFRASTRUCTURE | Barındırma veya CDN katmanı. Repoda dağıtım yapılandırması yok. |
| 21 | Centralized Syslog / EventLog | PARTIAL | `web/lib/server/log.ts`: yapılandırılmış JSON günlük ve hassas veri redaksiyonu. Merkezi toplama ve saklama altyapısı yok. |
| 22 | MITRE ATT&CK Framework | MISSING | `THREAT-MODEL.md` ATT&CK tekniklerine eşlenmemiş. BLACKOUT olay türleri de eşlenmemiş. |
| 23 | OWASP Security Standards | PARTIAL | OWASP Top 10 alanlarının çoğu karşılanıyor: #46–#48, #50, #56, #73, #74, erişim denetimi fail-closed. Biçimsel ASVS değerlendirmesi yok. |
| 24 | ISO/IEC 27001 | MISSING | Bilgi güvenliği yönetim sistemi (politika, risk kaydı, iç denetim) yok. Kurumsal süreçtir; kod içinden sağlanamaz. |
| 25 | Disaster Recovery | MISSING | Yazılı DR planı ve RTO/RPO yok. Yedekleme aracı var (#62). |

| 26 | Zero Trust Architecture | REQUIRES_INFRASTRUCTURE | Kimlik merkezli sürekli doğrulama için IdP ve cihaz güveni gerekir. Uygulama varsayılan-ret ilkesine uyuyor (yönetim 404, CSP `connect-src 'self'`). |
| 27 | Network Segmentation | REQUIRES_INFRASTRUCTURE | Barındırma ağı / VPC |
| 28 | Global CDN / Anycast | REQUIRES_INFRASTRUCTURE | Ücretli/harici hizmet. Bu görevde açılmadı. |
| 29 | Enterprise Bot Management | REQUIRES_INFRASTRUCTURE | Kenar hizmeti. Uygulamada yalnız `robots`/`noindex` var; koruma değil. |
| 30 | Adaptive Rate Limiting | REQUIRES_INFRASTRUCTURE | Uygulama içinde yok. Çok örnekli dağıtımda paylaşılan sayaç deposu veya kenar kuralı gerekir. |
| 31 | Behavioral Threat Analysis | PARTIAL | BLACKOUT sınıflandırması, düşük önem yoğunluğu eşiği ve çok kaynaklı doğrulama (BO-01…08). Canlı davranış telemetrisi yok. |
| 32 | IP Reputation Intelligence | REQUIRES_INFRASTRUCTURE | Tehdit istihbaratı beslemesi + kenar |
| 33 | Adaptive Security Challenges | REQUIRES_INFRASTRUCTURE | Kenar challenge. Herkese açık okuma için CAPTCHA kullanılmıyor; bilinçli karar. |
| 34 | Origin Server Protection | REQUIRES_INFRASTRUCTURE | Origin yalnız kenar IP'lerine açık olmalı |
| 35 | Server Hardening | REQUIRES_INFRASTRUCTURE | Barındırma (CIS) |
| 36 | Runtime Threat Detection | REQUIRES_INFRASTRUCTURE | Çalışma zamanı sensörü |
| 37 | Outbound Traffic Filtering | REQUIRES_INFRASTRUCTURE | Sunucu çıkış politikası altyapıda. Tarayıcı tarafında CSP `connect-src 'self'` dış bağlantıyı engelliyor. Uygulama dış ağ çağrısı yapmıyor. |
| 38 | Hardware Security Keys | REQUIRES_INFRASTRUCTURE | Kimlik sağlayıcısı (WebAuthn) |
| 39 | FIDO2 / Passkeys | REQUIRES_INFRASTRUCTURE | Kimlik sağlayıcısı |
| 40 | Privileged Access Management (PAM) | MISSING | Ayrıcalıklı oturum kaydı ve kasası yok |
| 41 | Role-Based Access Control (RBAC) | PARTIAL | `access-contract.ts` `ROLE_PERMISSIONS` + `authorize()`, görev ayrılığı (kendi içeriğini onaylayamaz). Testli, ancak canlı oturum yok. |
| 42 | Just-in-Time Privileged Access | MISSING | Süreli yetki yükseltme akışı yok |
| 43 | Device Trust Verification | REQUIRES_INFRASTRUCTURE | MDM/IdP cihaz durumu |
| 44 | Session Hijacking Protection | PARTIAL | `validateSessionCookie()` (`__Host-`, Secure, HttpOnly, SameSite=Strict), `validateSession()` (ömür sınırı). Oturum üreten sistem yok. |
| 45 | Continuous Authentication | REQUIRES_INFRASTRUCTURE | IdP risk sinyalleri |
| 46 | SQL Injection Protection | NOT_APPLICABLE | SQL veritabanı yok; içerik repo içi JSON |
| 47 | Cross-Site Scripting (XSS) Protection | IMPLEMENTED | React kaçışlama, `dangerouslySetInnerHTML` kullanımı 0, href izin listesi (`safe-url.ts`). FORTRESS e2e "yansıtılan girdiler kaçışlanır". |
| 48 | Cross-Site Request Forgery (CSRF) Protection | NOT_APPLICABLE | Bugün durum değiştiren uç nokta yok. `verifyCsrf()` (köken + çift gönderimli belirteç) hazır ve testli; ilk POST ile zorunlu olur. |
| 49 | API Security Gateway | REQUIRES_INFRASTRUCTURE | Ağ geçidi ürünü altyapıda. Uygulama düzeyinde API girdi izin listesi ve yetkilendirme var (dışa aktarım biçimi izin listesi; araştırma ve yönetim API'leri production'da 404). |
| 50 | Object-Level Authorization | IMPLEMENTED | Kayıt bazında kapı: yayımlanmamış arşiv kayıtları, staging sergiler ve insan onaysız yayınlar 404/gizli (`canExposePublicExhibition`, `isPubliclyVisible`; e2e ve birim testleri) |
| 51 | Secrets Management | PARTIAL | GitHub secret scanning + push protection açık; CI'da `secrets.mjs` (0 bulgu). Önizleme parolası SHA-256 ile karşılaştırılıyor. Merkezi sır kasası yok. |
| 52 | Database Encryption | NOT_APPLICABLE | Veritabanı yok. Sunucuda kullanıcı verisi tutulmuyor. |
| 53 | Secure File Upload Scanning | NOT_APPLICABLE | Sunucuya dosya yüklenmiyor. Okuma listesi içe aktarma yalnız tarayıcıda ve boyut, prototip ve URL doğrulamasıyla. |
| 54 | Static Application Security Testing (SAST) | MISSING | CodeQL/Semgrep yok. Yalnız ESLint ve TypeScript. |
| 55 | Dynamic Application Security Testing (DAST) | PARTIAL | Playwright güvenlik e2e, `csp-probe.mjs`. OWASP ZAP benzeri tarayıcı yok. |
| 56 | Software Composition Analysis (SCA) | IMPLEMENTED | `supply-chain.mjs --audit`, CI'da yüksek/kritik bulguda engelliyor |
| 57 | Security Orchestration, Automation and Response (SOAR) | PARTIAL | BLACKOUT karar motoru, onay kapısı ve port tabanlı yürütücü oyun kitabı mantığını sağlıyor. Orkestrasyon platformu ve gerçek port uygulamaları yok. |
| 58 | User and Entity Behavior Analytics (UEBA) | REQUIRES_INFRASTRUCTURE | Kullanıcı/oturum telemetrisi ve analitik platform |
| 59 | Honeytokens / Deception Technology | MISSING | Tuzak belirteç veya rota yok |
| 60 | Immutable Audit Logs | PARTIAL | Hash zincirli denetim kaydı (`appendAuditEvent`/`verifyAuditChain`) ve BLACKOUT kanıt defteri. Testli, ancak kalıcı WORM depolama yok. |
| 61 | Automated Incident Isolation | PARTIAL | BLACKOUT kısıtlama/izolasyon kararı üretiyor. Yüksek etkili adımlar **bilinçli olarak** iki kişilik insan onayı istiyor (tam otomatik değil). Bağlı değil. |
| 62 | Immutable Offline Backups | PARTIAL | `backup.mjs`: manifestli yedek, hash ve kurcalama doğrulaması, depo dışı geri yükleme. Değiştirilemez/çevrimdışı depolama yok. |
| 63 | Automated Disaster Recovery | MISSING | Otomatik yük devretme ve geri yükleme yok |
| 64 | Cloud Security Posture Management (CSPM) | REQUIRES_INFRASTRUCTURE | Bulut hesabı yok |
| 65 | Container Runtime Security | REQUIRES_INFRASTRUCTURE | Repoda konteyner yok. Dağıtım hedefine bağlı. |
| 66 | Kubernetes Security Policies | REQUIRES_INFRASTRUCTURE | Repoda Kubernetes kümesi ve manifest yok |
| 67 | Infrastructure as Code Security Scanning | NOT_APPLICABLE | Repoda IaC (Terraform/Helm) yok |
| 68 | Supply Chain Security | PARTIAL | Kilit dosyası bütünlüğü, kayıt defteri kaynağı, `npm audit`, 5/5 workflow'da `permissions`. Aksiyon SHA sabitleme kısmi (yalnız `security.yml`); provenance yok. |
| 69 | Software Bill of Materials (SBOM) | PARTIAL | `supply-chain.mjs` envanter üretiyor. Standart CycloneDX/SPDX çıktısı ve imzası yok. |
| 70 | DNSSEC | REQUIRES_INFRASTRUCTURE | DNS sağlayıcısı. Bu görevde DNS değişikliği yasak. |
| 71 | DNS Filtering | REQUIRES_INFRASTRUCTURE | Sunucu ve ağ düzeyinde DNS çözümleyici politikası |
| 72 | Certificate Transparency Monitoring | REQUIRES_INFRASTRUCTURE | Alan adı ve CT izleme hizmeti |
| 73 | HTTP Security Headers | IMPLEMENTED | `headers.ts`: `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, COOP, CORP. Production'da doğrulandı (güvenlik e2e). |
| 74 | Content Security Policy (CSP) | PARTIAL | Uygulanıyor: `object-src 'none'`, `frame-ancestors 'none'`, `connect-src 'self'`. `script-src 'unsafe-inline'` var; nonce tabanlı katı CSP yok. **Risk:** production'da `ASRIN_CSP_MODE=report-only` zorunlu CSP'yi kaldırıyor ve raporlama uç noktası yok. `off` açığını PR #72 kapatıyor, report-only açık (bkz. `PR72-CSP-REVIEW.md`). |
| 75 | Subresource Integrity (SRI) | NOT_APPLICABLE | Dış kaynaktan betik/stil yüklenmiyor. CSP `script-src` dış kökene izin vermiyor. Dış kaynak eklenirse zorunlu. |
| 76 | Multi-Factor Authentication (MFA) | PARTIAL | `authorize()` onay, zamanlama, uzman incelemesi ve kullanıcı yönetiminde MFA istiyor; BLACKOUT onayları MFA istiyor (testli). Kimlik sağlayıcısı yok. |
| 77 | Risk-Based Authentication | REQUIRES_INFRASTRUCTURE | IdP risk motoru |
| 78 | Database Activity Monitoring | NOT_APPLICABLE | Veritabanı yok; içerik repo içi salt-okunur JSON |
| 79 | Data Loss Prevention (DLP) | PARTIAL | Sır taraması, günlük redaksiyonu, sunucuda kişisel veri tutmama. Kurumsal DLP yok. |
| 80 | Cloud Workload Protection (CWPP) | REQUIRES_INFRASTRUCTURE | Bulut iş yükü ve koruma ajanı gerekir; bulut hesabı yok |
| 81 | Attack Surface Management (ASM) | MISSING | Varlık envanteri ve sürekli tarama yok. Rota envanteri release-check'te var. |
| 82 | External Attack Surface Monitoring (EASM) | MISSING | Dış yüzey izleme yok |
| 83 | Threat Intelligence Platform (TIP) | REQUIRES_INFRASTRUCTURE | Harici besleme ve platform |
| 84 | Continuous Security Validation | PARTIAL | Her PR'da güvenlik birim testleri (47), production güvenlik e2e (25), FORTRESS araçları ve release-quality. Canlı ortam doğrulaması yok. |
| 85 | Breach and Attack Simulation (BAS) | MISSING | Saldırı simülasyonu yok. BLACKOUT `test_harness` kaynağı tatbikat için hazır. |
| 86 | Automated Vulnerability Patching | MISSING | Dependabot kapalı, Renovate yok |
| 87 | Secure CI/CD Pipeline | PARTIAL | En az yetki, SCA, sır taraması, bütünlük farkı, zorunlu testler. Aksiyon sabitleme kısmi; **`main` dalı korumasız** (E8). |
| 88 | Runtime Application Self-Protection (RASP) | REQUIRES_INFRASTRUCTURE | Çalışma zamanı ajanı |
| 89 | File Integrity Monitoring (FIM) | PARTIAL | `integrity.mjs check/diff` arşiv içeriğini CI'da SHA-256 ile izliyor (beklenmeyen değişiklik 0). Sunucu dosya sistemi izlemesi yok. |
| 90 | Cryptographic Key Rotation | REQUIRES_INFRASTRUCTURE | KMS politikası. BLACKOUT "anahtarı döndürüp eskisini yok etme"yi yasaklıyor. |
| 91 | Hardware Security Module (HSM) | REQUIRES_INFRASTRUCTURE | Uygulamada imzalama anahtarı yok. Onay imzaları için gerekecek. |
| 92 | Tamper Detection | IMPLEMENTED | Arşiv bütünlük farkı (CI), yedek kurcalama doğrulaması, hash zincirli denetim ve kanıt kayıtları. Testli (FORTRESS 15/15, BO-18). |
| 93 | Emergency Access Revocation | PARTIAL | BLACKOUT `revoke_sessions` (şüpheli: tek onay, ayrıcalıklı/tümü: iki onay) ve `SessionRevoker` arayüzü. Testli, ancak oturum deposu yok. |
| 94 | Automated Credential Revocation | REQUIRES_INFRASTRUCTURE | IdP ve sır kasası API'si gerekir. BLACKOUT'ta bunun için ayrı port henüz yok. |
| 95 | Critical Database Read-Only Lockdown | PARTIAL | BLACKOUT LOCKDOWN: `freeze_writes` + salt-okunur güvenli mod. Durum değiştiren istekler ve sağlık dışı API'ler 503, sayfalar okunur (BO-15, BO-17). Bugün veritabanı yok; `proxy.ts`'e bağlı değil. |
| 96 | Emergency Network Quarantine | REQUIRES_INFRASTRUCTURE | Ağ izolasyonu kenar/bulutta. Uygulama düzeyinde BLACKOUT RESTRICTED/LOCKDOWN rota kararı var. |
| 97 | Incident Evidence Preservation | PARTIAL | BLACKOUT kanıt defteri: yalnız ekleme, hash zinciri, redaksiyon, silme işlevi yok (BO-18, BO-19). WORM `EvidenceSink` uygulaması yok. |
| 98 | Independent Recovery Environment | REQUIRES_INFRASTRUCTURE | Ayrı hesap/bölgede temiz kurtarma ortamı |

## 99: PROJECT BLACKOUT

| # | Kontrol | Durum | ASRIN KEMALİ kanıtı / gerekçe |
|---|---|---|---|
| 99 | PROJECT BLACKOUT | PARTIAL | Kritik ihlal **doğrulandığında** (çok kaynak veya kanıtlı araç bulgusu) güvenli moda alma (LOCKDOWN), erişimi kesme (oturum iptali, kritik API kapatma) ve verileri koruma (yazma dondurma, kanıt defteri). İki kişilik insan onayı, kademeli geri dönüş, 21 test. **Veri imhası yok:** silme, yedek imhası ve günlük yok etme tanımsız ve reddediliyor (BO-12). Production'a bağlı değil; port uygulamaları yok. Bkz. `BLACKOUT.md`. |

## Ek öneriler (özgün listede yok)

Önceki matriste yer alan ve özgün listede karşılığı olmayan kontroller. Kanıtlar korunmak için burada tutuluyor; toplama dahil değiller.

| # | Kontrol | Durum | Kanıt / gerekçe |
|---|---|---|---|
| E1 | Onay–içerik bağı (içerik değişince onay düşer) | IMPLEMENTED | `verifyApprovalBinding()`, editoryal güven kapıları, BLACKOUT `planDigest` |
| E2 | Yönetim yüzeyi kapalı-başarısız | IMPLEMENTED | `proxy.ts` + `decideAccess`: `/admin`, `/yonetim`, `/panel`, `/api/admin` production'da 404 (e2e) |
| E3 | Önbellek politikası (hassas yanıtlar önbelleğe girmez) | IMPLEMENTED | `NO_STORE_ROUTES`; FORTRESS e2e |
| E4 | Bağlantı (href) izin listesi | IMPLEMENTED | `safe-url.ts`: TextLink, okuma listeleri, sergi kaynakları |
| E5 | Yol geçişi, CSV enjeksiyonu, açık yönlendirme | IMPLEMENTED | Slug doğrulama (e2e 404), `csv.ts`, FORTRESS e2e |
| E6 | Hata yanıtında iç bilgi sızmaması | IMPLEMENTED | `errorFields()`, `error.tsx` |
| E7 | Tehdit modeli | IMPLEMENTED | `docs/security/THREAT-MODEL.md` (ATT&CK eşlemesi yok, #22) |
| E8 | `main` dal koruması ve zorunlu inceleme | MISSING | GitHub API: "Branch not protected". Depo sahibinin ayarı; değiştirilmedi. **P0.** |
| E9 | İmzalı commit/sürüm ve SLSA provenance | MISSING | İmza zorunluluğu yok |
| E10 | HSTS preload | MISSING | `preload` yönergesi ve başvuru yok |
| E11 | Kişisel verinin en aza indirilmesi | IMPLEMENTED | Sunucuda kişisel veri yok; okuma listeleri yalnız tarayıcıda |
| E12 | Coğrafi/ASN engelleme | NOT_APPLICABLE | Herkese açık arşiv; yalnız saldırı anında kenarda geçici kural |
| E13 | Firewall (ağ güvenlik duvarı, L3/L4) | REQUIRES_INFRASTRUCTURE | Özgün listede numarasız başlık; kanıt korunmak için burada. Barındırma sağlayıcısı veya bulut güvenlik grubu. Repoda ağ yapılandırması yok. |
