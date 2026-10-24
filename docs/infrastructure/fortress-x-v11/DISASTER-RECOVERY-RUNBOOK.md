# ASRIN KEMALİ — MKA FORTRESS X V1.1
## Felaket Kurtarma El Kitabı (Disaster Recovery Runbook)

**Proje:** Mustafa Kemal Atatürk Odaklı Bağımsız Tarih ve Kültür Platformu  
**Marka:** ASRIN KEMALİ | **Motto:** BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI  
**Rol:** Altyapı Güvenliği ve Sistem Güvenilirliği (SRE)  
**Tarih:** 2026-10-24  

---

## 1. Kurtarma Hedefleri (RTO ve RPO)

| Metrik | Hedef Süre | Açıklama |
|---|---|---|
| **RTO (Recovery Time Objective) — Acil Durum Modu** | **< 5 dakika** | Ana sunucu çökse dahi kenarda `blackout.html` statik koruma sayfasının devreye girmesi. |
| **RTO — Tam Sunucu Yeniden Kurulumu** | **< 45 dakika** | Sıfırdan temiz bir VPS/sunucu üzerinde Docker konteynerinin ayağa kaldırılması. |
| **RPO (Recovery Point Objective) — İçerik ve Kod** | **0 dakika** | Kod ve arşiv içeriği Git commit SHA'ları ile korunur; veri kaybı yaşanmaz. |
| **RPO — Günlük ve Kanıt Zinciri** | **< 5 dakika** | WORM S3 deposuna akan denetim kanıtlarının kurtarılma noktası. |

---

## 2. Acil Durum Senaryoları ve Müdahale Adımları

### Senaryo 1: FIM (Dosya Bütünlüğü) İhlali veya Yetkisiz Değişiklik (SEV-1)
- **Tetikleyici:** `tools/infra-security/fim.mjs` veya Prometheus alarmı (`FileIntegrityTamperingDetected`).
- **Müdahale:**
  1. Sunucu üzerinde şüpheli süreçler derhal izole edilir.
  2. PROJECT BLACKOUT düzeyi `RESTRICTED` veya `LOCKDOWN` seviyesine çekilir:
     ```bash
     # Kenar worker'da LOCKDOWN seviyesini etkinleştir
     # Cloudflare KV üzerinden:
     wrangler kv:key put --binding=BLACKOUT_KV "level" "3"
     ```
  3. FIM doğrulama komutu çalıştırılarak etkilenen dosyalar dökümlenir:
     ```bash
     node tools/infra-security/fim.mjs verify --manifest=baseline-manifest.json
     ```
  4. Git referansı ile temiz sürüme geri dönülür:
     ```bash
     git reset --hard origin/main
     ```
  5. Kanıt defterine hash zincirli inceleme kaydı işlenir.

---

### Senaryo 2: Hacimsel L7 DDoS Atağı veya Kaynak Tüketimi (SEV-2)
- **Tetikleyici:** `HighTrafficAnomalySpike` alarmı veya >%90 CPU/Bellek doygunluğu.
- **Müdahale:**
  1. Cloudflare kontrol panelinde **"Under Attack Mode"** etkinleştirilir.
  2. `infra/fortress-x-v11/waf/waf-rulesets.json` hız sınırlama limitleri sıkılaştırılır:
     - Arama API sınırı: 10 istek / 10 saniye.
     - Genel sayfalar: Managed Challenge oranı %100'e çekilir.
  3. Kaynak sunucu üzerindeki Nginx bağlantıları izlenir:
     ```bash
     netstat -an | grep :443 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -n
     ```
  4. Gerekirse `origin-firewall.sh` ile saldırgan ASN'ler geçici olarak engellenir.

---

### Senaryo 3: Fiziksel Sunucu Çöküşü veya Veri Merkezi Kesintisi
- **Tetikleyici:** `OriginBackendDown` alarmı.
- **Müdahale:**
  1. Otomatik kenar devreye girer: Ziyaretçiler `blackout.html` sayfasını görür. Kesinti anonsu veya kafa karışıklığı yaşanmaz.
  2. Yeni temiz kurtarma sunucusuna (Disaster Site) geçilir:
     ```bash
     # 1. Yeni sunucuda repoyu klonla
     git clone https://github.com/Alisensai/asrinkemali.git /opt/asrinkemali
     cd /opt/asrinkemali
     git checkout main

     # 2. Kernel ve sysctl ayarlarını uygula
     sudo cp infra/fortress-x-v11/host-hardening/sysctl-fortress.conf /etc/sysctl.d/99-fortress.conf
     sudo sysctl --system

     # 3. Docker sertleştirilmiş konteyneri başlat
     docker compose -f infra/fortress-x-v11/host-hardening/docker-compose.hardened.yml up -d --build

     # 4. Yerel sağlık denetimini doğrula
     curl -I http://127.0.0.1:3000/api/health
     ```
  3. Cloudflare Tunnel veya DNS A kaydı yeni sunucu IP'sine yönlendirilir.
  4. BLACKOUT seviyesi NORMAL (0)'a düşürülerek yayın normale döndürülür.

---

## 3. PROJECT BLACKOUT Seviye Geçiş ve İki Kişilik Onay Protokolü

Claude Code'un tasarladığı onay kuralları uyarınca, `LOCKDOWN` seviyesinden `NORMAL` seviyesine geri dönüş **iki farklı yetkili uzmanın (MFA doğrulamalı)** onayı olmadan yapılamaz:

1. **Kanıt Defteri Doğrulaması:** Olay sırasındaki tüm eylemler SHA-256 zinciriyle mühürlenir.
2. **Bekleme Süresi (Cooldown):** Saldırı kesildikten sonra en az 15 dakika beklenir.
3. **Tersine Eylemler (Rollback):**
   - Dondurulan yazma kilitleri açılır (`unfreeze_writes`).
   - Salt-okunur mod kapatılır (`disable_read_only_mode`).
   - Kritik API geçitleri açılır (`enable_critical_api`).
   - Nöbetçilere bilgilendirme gönderilir (`notify_responders`).
