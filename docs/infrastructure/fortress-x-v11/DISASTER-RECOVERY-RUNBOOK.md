# ASRIN KEMALİ — MKA FORTRESS X V1.1
## Felaket Kurtarma El Kitabı (Disaster Recovery Runbook)

**Proje:** Mustafa Kemal Atatürk Odaklı Bağımsız Tarih ve Kültür Platformu  
**Marka:** ASRIN KEMALİ | **Motto:** BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI  
**Rol:** Altyapı Güvenliği ve Sistem Güvenilirliği (SRE)  
**Tarih:** 2026-10-24  

---

## 1. Kurtarma Hedefleri (Hedef vs. Doğrulanmış Ölçüm)

> [!IMPORTANT]
> **Dürüst Beyan:** Aşağıdaki RTO ve RPO süreleri mimari **tasarım hedefleridir (Target SLA)**. Canlı felaket kurtarma tatbikatı henüz gerçek veri merkezinde icra edilmemiş olup, yerel ve dry-run simülasyonları üzerinden doğrulanmıştır.

| Metrik | Tasarım Hedefi (Target SLA) | Doğrulanmış Yerel Ölçüm (Lab Benchmark) | Notlar |
|---|---|---|---|
| **RTO — Kenar Acil Durum (Blackout Fallback)** | **< 5 dakika** | **~1.2 saniye** (Cloudflare Edge Worker tetiklenme süresi) | KV bayrağı güncellendiğinde tüm kenar anında 503 statik korumaya geçer. |
| **RTO — Tam Sunucu Yeniden Kurulumu** | **< 45 dakika** | **~2 dakika 40 saniye** (Docker build + container up + health check) | Sıfır sunucu kurulumunda işletim sistemi kurulum süresi hariçtir. |
| **RPO — İçerik ve Kod Bütünlüğü** | **0 dakika** | **0 dakika** | Git commit SHA'ları ile anlık mühürlüdür; kayıp yaşanmaz. |
| **RPO — Denetim ve Kanıt Zinciri** | **< 5 dakika** | **Anlık (Yerel)** | WORM S3 deposuna akışta ağ gecikmesi üst sınırı. |

---

## 2. Kritik Güvenlik Uyarısı: S3 Object Lock COMPLIANCE Modu

> [!CAUTION]
> **COMPLIANCE Modu Geri Alınamaz:**
> AWS S3 Object Lock `COMPLIANCE` modunda saklanan nesneler, **AWS Root hesabı dahil hiç kimse** tarafından kilit süresi (365 gün) dolana kadar silinemez, üzerine yazılamaz veya kısaltılamaz.
> 
> - **Maliyet Riski:** Yanlışlıkla veya saldırı anında büyük boyutlu çöp veri yüklenirse 365 gün boyunca depolama ücreti ödenmesi yasal ve teknik olarak zorunludur.
> - **Politika:** COMPLIANCE modu, yalnızca proje sahibinin açık yazılı onayı ile üretim ortamında etkinleştirilmelidir. Geliştirme ve test süreçlerinde `GOVERNANCE` modu kullanılmalıdır (Governance modunda özel IAM yetkisiyle kilit açılabilir).

---

## 3. Acil Durum Senaryoları ve Adli Bilişim (Forensics) Koruması

### Senaryo 1: FIM (Dosya Bütünlüğü) İhlali veya Yetkisiz Değişiklik (SEV-1)
- **Tetikleyici:** `tools/infra-security/fim.mjs` veya Prometheus alarmı (`FileIntegrityTamperingDetected`).
- **Müdahale ve Adli Delil Koruması:**
  1. **Kenar Koruması:** Saldırganın arka uca yeni istek atmasını önlemek için kenar worker LOCKDOWN moduna alınır:
     ```bash
     wrangler kv:key put --binding=BLACKOUT_KV "level" "3"
     ```
  2. **ADLİ DELİL KORUMASI (ÖNEMLİ):** Asla doğrudan `git reset --hard` çalıştırılmaz! Önce mevcut saldırı izleri, güncellenen dosyalar ve bellek izleri güvenli bir konuma arşivlenir:
     ```bash
     mkdir -p /var/log/fortress-incident-evidence
     tar -czf /var/log/fortress-incident-evidence/forensic-snapshot-$(date +%s).tar.gz \
         /var/log/nginx/ /var/log/asrinkemali/ content/ web/ .git/logs/
     ```
  3. FIM doğrulama komutu çalıştırılarak hangi dosyaların kurcalandığı tam olarak listelenir:
     ```bash
     node tools/infra-security/fim.mjs verify --manifest=app-baseline.json
     ```
  4. Deliller güvenceye alındıktan sonra, doğrulanmış Git commit SHA'sına geri dönülür:
     ```bash
     git checkout main
     git verify-commit HEAD
     ```
  5. Kanıt defterine SHA-256 zincirli olay raporu işlenir.

---

### Senaryo 2: Hacimsel L7 DDoS Atağı veya Kaynak Tüketimi (SEV-2)
- **Tetikleyici:** `HighTrafficAnomalySpike` alarmı veya >%90 CPU/Bellek doygunluğu.
- **Müdahale:**
  1. Cloudflare kontrol panelinde **"Under Attack Mode"** etkinleştirilir.
  2. WAF hız sınırları arama için 10 istek / 10 saniye seviyesine sıkılaştırılır.
  3. Kaynak sunucu doğrudan IP bağlantıları `origin-firewall.sh --verify` ile kontrol edilir.

---

### Senaryo 3: Fiziksel Sunucu Çöküşü veya Veri Merkezi Kesintisi
- **Tetikleyici:** `OriginBackendDown` alarmı.
- **Müdahale:**
  1. Kenar otomatik devreye girer: Ziyaretçiler `blackout.html` sayfasını görür.
  2. Temiz kurtarma sunucusuna geçiş:
     ```bash
     git clone https://github.com/Alisensai/asrinkemali.git /opt/asrinkemali
     cd /opt/asrinkemali
     sudo cp infra/fortress-x-v11/host-hardening/sysctl-fortress.conf /etc/sysctl.d/99-fortress.conf
     sudo sysctl --system
     docker compose -f infra/fortress-x-v11/host-hardening/docker-compose.hardened.yml up -d --build
     curl -I http://127.0.0.1:3000/api/health
     ```
  3. DNS veya Cloudflare Tunnel yeni sunucuya yönlendirilir.

---

## 4. PROJECT BLACKOUT Güvenli Geri Alma (Rollback)

`LOCKDOWN` seviyesinden `NORMAL` seviyesine geri dönüş iki kişilik MFA doğrulamalı insan onayıyla yürütülür:
1. Kanıt defteri hash zinciri doğrulanır.
2. 15 dakikalık soğuma süresi (cooldown) beklenir.
3. Altyapı portları tersine işletilir (`unfreeze_writes`, `disable_read_only_mode`, `enable_critical_api`).
4. Kenar worker seviyesi `0` (NORMAL) olarak güncellenir.
