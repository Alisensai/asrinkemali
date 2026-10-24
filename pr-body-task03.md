## MKA FORTRESS X V1.1, Görev 03: Altyapı, WAF, Anti-DDoS, Tehdit İzleme ve PROJECT BLACKOUT Entegrasyonu (Antigravity)

**Taban:** `integration/asrinkemali-v11-fortress-x`  
**Geliştirme Dalı:** `feature/antigravity-v11-infrastructure-security`  
**Rol:** Ağ, Bulut ve Altyapı Güvenliği Mühendisi  
**Marka:** ASRIN KEMALİ | **Motto:** BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI  

---

### 1. Amaç ve Kapsam

ASRIN KEMALİ bağımsız tarih ve kültür platformunun internetten gelebilecek L3/L4 volumetrik ve L7 uygulama katmanı saldırılarına, kötü niyetli botlara, veri kurcalama girişimlerine ve servis kesintilerine karşı **4 katmanlı derinlemesine savunma (Defense-in-Depth)** sistemini tasarlamak ve test edilebilir doğrulanabilir altyapı şablonlarını geliştirmek.

Bu çalışma; Claude Code'un 99 kontrollük güvenlik matrisinde `REQUIRES_INFRASTRUCTURE` olarak işaretlenen 41 kontrolün tamamını adresler, Claude Code'un PROJECT BLACKOUT karar motoruna (`web/lib/security/blackout/ports.ts`) altyapı adaptörleri sağlar ve Codex'in Next.js/API kodlarına dokunmadan bağımsız bir altyapı katmanı sunar.

---

### 2. Kritik Güvenlik İncelemesi ve Yapılan Düzeltmeler

1. **WAF Kural Güvenliği:**
   - Arama sayfasında (`/arsiv`, `/arastirma`) bulunmanın WAF denetimlerini topluca atlatması riski tamamen giderildi.
   - Açık saldırı imzaları (`<script`, `union select`, `../`, `' or '1'='1`) rotadan bağımsız olarak koşulsuz engellenir (`WAF-04-EXPLOIT-PAYLOADS`).
   - Yalnızca saldırı imzası taşımayan temiz Türkçe arama terimleri (`WAF-05-TURKISH-SEARCH-WHITELIST`) yanlış pozitif korumasından yararlanır.
   - Negatif testlerle XSS, SQLi ve Path Traversal denemelerinin arama sayfasından dahi kaçamayacağı kanıtlandı.

2. **PROJECT BLACKOUT Kenar ve Kesinti Yönetimi:**
   - `edge-blackout-worker.js`: Durum deposu (KV) kesintiye uğradığında fail-open NORMAL (0) olma riski giderildi. Son doğrulanmış güvenlik seviyesi korunur; soğuk başlangıçta kesinti varsa tüm siteyi kapatmak yerine WATCH (1) moduna geçerek hassas API'ler kapalı tutulur.
   - Bozuk, geçersiz veya negatif durum verileri `sanitizeBlackoutLevel` ile ayıklanır.
   - Kesinti anında `X-Fortress-Degraded` başlığı eklenir; `/api/health` izleme sistemleri için her zaman açık kalır.

3. **Origin ve Ağ Koruması:**
   - `origin-firewall.sh`: Hem IPv4 (`iptables`) hem de IPv6 (`ip6tables`) için doğrudan port 80/443 bağlantıları engellendi.
   - SSH yönetim erişimi (`$SSH_PORT`) için otomatik kural eklendi; kilitlenme riski önlendi.
   - Güvenli dry-run, `--verify` ve otomatik geri alma (`--auto-rollback=60`) mekanizması eklendi.
   - `egress-lockdown.sh`: Sistem paket güncellemeleri (`apt`, `npm`, `github`) ve DNS korunurken bilinmeyen dış bağlantılar ve IPv6 kaçak çıkışları engellendi.
   - Mimari belgelere, Cloudflare IP'sinin tek başına bizim bölgemize ait olduğunu kanıtlamayacağı, bu nedenle Authenticated Origin Pulls (mTLS) veya Tunnel'ın zorunlu olduğu açıkça yazıldı.

4. **BLACKOUT Adaptörleri ve Dürüst Beyan:**
   - `infra-ports-adapter.ts`: Sabit 42 veya 5 başarılı oturum iptali üretilmesi kaldırıldı.
   - Canlı oturum deposu bağlı değilken sahte sayı üretilmez; `revoked: 0` ve `status: "requires_infrastructure"` dürüstçe döner.
   - Bellek içi durum deposunun dağıtık bir küme olmadığı (`isDistributed() === false`), süreç-içi bir simülasyon olduğu açıkça belirtildi.

5. **Log ve Kurtarma Güvenliği:**
   - `vector-agent.toml`: Kod içine gömülü sabit tuz (`salt = "mka-fortress-static-salt-v1"`) kaldırıldı; tuzun ortam değişkeninden (`MKA_LOG_SALT`) dinamik okunması sağlandı.
   - `DISASTER-RECOVERY-RUNBOOK.md`: Doğrudan `git reset --hard` çalıştırma riski giderildi; önce adli delillerin (`forensic-snapshot`) arşivlenmesi zorunlu kılındı.
   - S3 Object Lock COMPLIANCE modunun geri alınamazlık uyarısı ve kullanıcı onayı gerekliliği eklendi.
   - RTO ve RPO metrikleri "Tasarım Hedefi" ve "Doğrulanmış Yerel Ölçüm" olarak ayrıldı.

---

### 3. Çalıştırılan Komutlar ve Test Sonuçları

| Komut | Kapsam | Sonuç |
|---|---|---|
| `node --test tools/infra-security/tests/infra-security.test.mjs` | FIM, WAF Negatif/Pozitif, Worker, Ağ, BLACKOUT testleri | **25/25 GEÇTİ** (0 hata, 101ms) |
| `node tools/infra-security/validate-infra.mjs` | Kuru çalıştırma (dry-run) altyapı doğrulayıcı CLI | **19/19 GEÇTİ** (0 hata) |
| `node tools/mka-fortress/secrets.mjs` | 1.451 dosyada sır ve gizli anahtar taraması | **0 BULGU, GEÇTİ** (`ok: true`) |
| `npm --prefix web run lint` | ESLint statik kod analizi | **0 HATA, 0 UYARI** |
| `npm --prefix web run typecheck` | TypeScript tip denetimi (`tsc --noEmit`) | **0 HATA** |
| `node --test tools/mka-fortress/tests/*.test.mjs` | Bütünlük, yedek ve tedarik zinciri testleri | **15/15 GEÇTİ** |
| `npm --prefix web test` | Web uygulaması birim ve entegrasyon testleri | **462 GEÇTİ, 0 BAŞARISIZ** (35 atlandı) |
| `python tools/release-check/checker.py` | Sürüm kalite kontrol aracı | **GEÇTİ** (Regresyon yok) |

---

### 4. Aktif vs. Şablon / Simülasyon Ayrımı (Dürüst Beyan)

| Bileşen | Durum | Açıklama |
|---|---|---|
| FIM Dosya Bütünlüğü Aracı | **GERÇEK & AKTİF** | `tools/infra-security/fim.mjs` yerel olarak gerçek SHA-256 hesaplar ve doğrular. |
| Kuru Çalıştırma Doğrulayıcısı | **GERÇEK & AKTİF** | `tools/infra-security/validate-infra.mjs` tüm konfigürasyonları statik olarak denetler. |
| Test Paketleri (25 Test) | **GERÇEK & AKTİF** | Node.js native test runner ile tam kapsamlı negatif ve davranışsal testler çalışır. |
| Cloudflare WAF & Ruleset | **ŞABLON (IaC)** | Terraform ve JSON dosyaları hazırdır; canlı Cloudflare hesabı bağlanınca uygulanacaktır. |
| Nginx & Caddy Yapılandırması | **ŞABLON** | Sunucuya yüklendiğinde çalışacak sertleştirilmiş konfigürasyon dosyalarıdır. |
| Origin & Egress Firewall | **ŞABLON BETİK** | Dry-run ve verify destekli iptables/ip6tables betikleridir; VPS üzerinde çalıştırılacaktır. |
| BLACKOUT Altyapı Adaptörü | **SİMÜLASYON / DRY-RUN** | Süreç-içi yerel test adaptörüdür; canlı oturum/durum deposu olmadığı açıkça belirtilir. |
| S3 Object Lock Politikası | **ŞABLON (POLİTİKA)** | COMPLIANCE 365 gün kuralıdır; AWS S3 hesabı açıldığında uygulanacaktır. |
