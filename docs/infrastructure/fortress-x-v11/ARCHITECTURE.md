# ASRIN KEMALİ — MKA FORTRESS X V1.1
## Çok Katmanlı Altyapı Güvenlik Mimarisi (Defense-in-Depth Architecture)

**Proje:** Mustafa Kemal Atatürk Odaklı Bağımsız Tarih ve Kültür Platformu  
**Marka:** ASRIN KEMALİ | **Motto:** BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI  
**Rol:** Ağ, Bulut ve Altyapı Güvenliği  
**Sürüm:** V1.1 (FORTRESS X)  
**Tarih:** 2026-10-24  

---

## 1. Mimari Genel Bakış ve Tasarım İlkeleri

ASRIN KEMALİ platformu; Atatürk'ün mirasını, tarihî belgeleri ve arşiv kayıtlarını internet üzerinden kamuoyuna sunan **bağımsız** bir dijital hafıza projesidir. Platformun temel varlığı, tarihî belgelerin **özgünlüğü, doğruluğu ve manipüle edilemezliğidir**. 

Bu doğrultuda altyapı savunma mimarisi **"Derinlemesine Savunma" (Defense-in-Depth)** ve **"Sıfır Güven" (Zero Trust)** prensipleriyle dört temel katmanda kurgulanmıştır:

```
[ İnternet / Ziyaretçiler / Olası Saldırganlar ]
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. KATMAN: DIŞ SAVUNMA (EDGE & WAF & ANTI-DDOS)             │
│ - Cloudflare Anycast CDN (300+ PoP)                         │
│ - WAF v5 (OWASP Kuralları + Türkçe Arama Muafiyeti)         │
│ - L3/L4/L7 Dağıtık DDoS Koruması                            │
│ - Adaptif Hız Sınırlama (Genel: 120/10s, Arama: 30/10s)     │
│ - Origin Shield (Cloudflare Tunnel / Authenticated Pulls)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Yalnızca Güvenli Tünel / mTLS)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. KATMAN: SUNUCU VE AĞ GÜVENLİĞİ (HOST & NETWORK)          │
│ - Sertleştirilmiş Ters Vekil (Nginx / Caddy HTTP/3)         │
│ - Linux Çekirdek Sertleştirme (sysctl CIS Benchmark Seviye 2)│
│ - Egress Filtreleme (Dışarıya Rastgele Bağlantı Yasağı)     │
│ - Konteyner Güvenliği (Non-Root UID 10001, Salt-Okunur Root)│
│ - Kubernetes K8s NetworkPolicy (Default Deny Ingress/Egress)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. KATMAN: TESPİT VE İZLEME (MONITORING & SIEM)             │
│ - FIM (File Integrity Monitoring - SHA-256 Bütünlük Takibi) │
│ - Yapılandırılmış ECS/OpenTelemetry JSON Günlük Şeması      │
│ - KVKK/GDPR Uyumlu İstemci IP Hashleme (Tuzlu SHA-256)      │
│ - Prometheus/Alertmanager Eşik Alarmları (SEV-1 ... SEV-4)  │
│ - Güvenlik Olay Taksonomisi ve Otomatik Eskalasyon          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. KATMAN: KURTARMA VE PROJECT BLACKOUT                     │
│ - WORM Değiştirilemez Yedek (S3 Object Lock COMPLIANCE 365) │
│ - Kenar Acil Durum Yönlendiricisi (edge-blackout-worker.js) │
│ - Statik Acil Durum Sayfası (blackout.html - Sıfır Bağımlılık)
│ - PROJECT BLACKOUT Altyapı Adaptörü (infra-ports-adapter.ts)│
│ - RTO < 15 dk (Acil Mod), RPO < 1 saat                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Güvenlik Katmanlarının Detayları

### Katman 1: Dış Savunma (WAF, Anti-DDoS, Edge & Origin Shield)
1. **Cloudflare WAF v5 Ruleset:**
   - Bilinen zafiyet tarayıcıları (`sqlmap`, `nikto`, `nmap` vb.) kenarda anında engellenir.
   - Gizli dosya ve dizin taramaları (`/.env`, `/.git`, `/wp-admin`, `*.bak`, `*.sql`) köken sunucuya ulaşmadan `403/404` ile kesilir.
   - **Türkçe Arama İstisnası:** ASRIN KEMALİ arama sorgularında yer alan Türkçe karakterler (`ç, ğ, ı, ö, ş, ü, İ`) ve tarihî ifadeler WAF tarafından SQLi/XSS gibi algılanmayacak şekilde kuralla güvenceye alınmıştır.
2. **Anti-DDoS ve Adaptif Hız Sınırlama (Rate Limiting):**
   - L3/L4 volumetrik saldırılar Cloudflare Anycast omurgasında filtrelenir.
   - L7 uygulama katmanında arama rotaları için 30 istek / 10 sn; genel sayfalar için 120 istek / 10 sn eşiği uygulanır.
   - `/api/health`, `/api/ready` ve statik varlıklar hız sınırlamasından muaftır.
3. **Origin Shield (Kaynak Sunucu Gizleme):**
   - Sunucunun doğrudan IP adresine internetten gelen tüm port 80/443 istekleri `origin-firewall.sh` ile DROP edilir.
   - Sunucu ile Cloudflare arasında Cloudflare Tunnel (`cloudflared`) veya Authenticated Origin Pulls (mTLS) kullanılır.

### Katman 2: Sunucu ve Ağ Güvenliği (Host & Network)
1. **Linux Çekirdek Sertleştirme (`sysctl-fortress.conf`):**
   - `tcp_syncookies = 1` ile SYN flood saldırılarında kuyruk taşması önlenir.
   - `rp_filter = 1` ile IP sahteciliği (spoofing) engellenir.
   - `randomize_va_space = 2` ile bellek istismarlarına karşı tam ASLR sağlanır.
   - Kaynak yönlendirmesi (`accept_source_route = 0`) ve ICMP redirect paketleri reddedilir.
2. **Egress (Dışa Giden Trafik) Kısıtlaması (`egress-lockdown.sh`):**
   - Web sunucusunun dış internete rastgele TCP bağlantısı açması güvenlik duvarında engellenir.
   - Yalnızca yetkili DNS sunucuları (Port 53), NTP sunucuları (Port 123) ve kaynak doğrulama için onaylı resmî arşivlerin (TBMM, TTK vb.) HTTPS portuna izin verilir.
   - Bu sayede SSRF (Server-Side Request Forgery) ve reverse shell veri sızıntısı riskleri sıfırlanır.
3. **Konteyner ve Kubernetes Sertleştirmesi:**
   - Multi-stage Docker imajında root olmayan `nextjs` kullanıcısı (UID 10001) tanımlıdır.
   - Kök dosya sistemi salt-okunurdur (`read_only: true`), geçici dosyalar `tmpfs` içinde tutulur.
   - Tüm Linux kabiliyetleri bırakılmıştır (`cap_drop: ALL`), yetki yükseltme engellenmiştir (`no-new-privileges: true`).
   - K8s ortamında `restricted` Pod Security Standard ve Default-Deny NetworkPolicy uygulanır.

### Katman 3: Tespit, İzleme ve SIEM (Detection & Monitoring)
1. **File Integrity Monitoring (FIM):**
   - `tools/infra-security/fim.mjs` aracı kod tabanı ve arşiv verilerinin SHA-256 manifestolarını çıkarır ve doğrular.
   - Dosya eklenmesi, silinmesi veya değiştirilmesi anında SEV-1 ihlali olarak raporlanır.
2. **Yapılandırılmış Loglama ve Gizlilik:**
   - Günlükler ECS ve OpenTelemetry standartlarında JSON formatında üretilir.
   - Ziyaretçi IP adresleri KVKK/GDPR uyumlu şekilde tuzlu SHA-256 ile özetlenir (`client.ip_hash`); ham IP saklanmaz.
3. **Olay Taksonomisi ve Eşik Alarmları:**
   - SEV-1 (Kritik): Dosya kurcalanması, kaynak sunucu çöküşü. (SLA: < 15 dk).
   - SEV-2 (Yüksek): L7 DDoS atağı, yoğun WAF engellemesi. (SLA: < 1 saat).
   - SEV-3 (Orta): Şüpheli 4xx taramaları, zafiyet araçları. (SLA: < 4 saat).
   - SEV-4 (Düşük): Rutin CSP raporları, istemci hataları.

### Katman 4: Kurtarma ve PROJECT BLACKOUT Entegrasyonu
1. **WORM Değiştirilemez Yedek:**
   - S3 Object Lock COMPLIANCE modunda 365 gün saklama kuralı. Kök kullanıcı dahil hiç kimse kilit süresi bitmeden yedeği silemez.
2. **Kenar Acil Durum Yönlendiricisi (`edge-blackout-worker.js`):**
   - Sistem LOCKDOWN seviyesine geçtiğinde kenar düğüm arka uca hiçbir istek iletmez; doğrudan `blackout.html` sayfasını HTTP 503 ve `no-store` başlığıyla döner.
3. **Altyapı Port Adaptörü (`infra-ports-adapter.ts`):**
   - Claude'un `BlackoutPorts` arayüzlerine tam uyumlu; oturum iptali, kritik API dondurma, yazma kilidi, bildirim ve WORM kanıt defteri yürütücülerini içerir.

---

## 3. Claude Code 99 Kontrol Matrisiyle Uyumluluk

Claude Code'un `docs/security/fortress-x-v11/CONTROL-MATRIX.md` dosyasında `REQUIRES_INFRASTRUCTURE` olarak işaretlenen 41 kontrolün bu altyapı teslimatıyla nasıl adreslendiği:

| Kontrol No | Alan | Bu Teslimatta Sağlanan Altyapı Karşılığı |
|---|---|---|
| #1, #2 | L3/L4 Ağ ve Güvenlik Duvarı | `origin-firewall.sh`, `cloudflare-ruleset.tf` |
| #3 | Web Uygulama Güvenlik Duvarı (WAF) | `waf-rulesets.json`, `cloudflare-ruleset.tf`, `nginx-hardened.conf` |
| #4, #5 | IDS / IPS | Vector/SIEM anomali tespiti ve Cloudflare Managed Rules |
| #6, #7 | Anti-DDoS (L3/L4 ve L7) | Cloudflare Anycast, Nginx rate limit, `sysctl-fortress.conf` SYN cookies |
| #8 | Çıkış (Egress) Trafiği Filtreleme | `egress-lockdown.sh` (Yalnızca DNS, NTP, onaylı kurumlar) |
| #10 | DNS Güvenliği & DNSSEC | DNSSEC, CAA ve Registrar Lock kılavuzu |
| #11, #96 | SIEM ve Merkezi Günlük Saklama | `log-schema.json`, `vector-agent.toml` |
| #21 | Ağ Segmentasyonu | DMZ, Docker bridge network, K8s NetworkPolicy |
| #23, #85 | Aktarımda Şifreleme & TLS | Nginx/Caddy TLS 1.3 Strict, HSTS Preload |
| #25 | CAA Kayıtları | `issue "letsencrypt.org"`, `iodef` raporlama |
| #31, #71 | Sunucu Sıkılaştırma (CIS) | `sysctl-fortress.conf` (CIS Seviye 2) |
| #36 | Dosya Bütünlüğü İzleme (FIM) | `tools/infra-security/fim.mjs` CLI ve alarmı |
| #72, #73 | Konteyner İmaj ve Çalışma Güvenliği | `Dockerfile.hardened` (non-root UID 10001, salt-okunur rootfs, `cap_drop: ALL`) |
| #74 | Kubernetes Güvenliği | `k8s-security.yaml` (PSA: Restricted, NetworkPolicy) |
| #92, #94 | Felaket Kurtarma & Geri Yükleme | `DISASTER-RECOVERY-RUNBOOK.md` |
| #93 | Değiştirilemez Yedek (WORM) | `immutable-backup-policy.json` (S3 Object Lock COMPLIANCE 365 gün) |
| #97 | Şüpheli Oturum İptali | `infra-ports-adapter.ts` (`InfraSessionRevoker`) |
| #98 | Ağ Karantinası | `origin-firewall.sh` ve `edge-blackout-worker.js` |
| #99 | PROJECT BLACKOUT Altyapısı | `edge-blackout-worker.js`, `blackout.html`, `infra-ports-adapter.ts` |
