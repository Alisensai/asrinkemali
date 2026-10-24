# ASRIN KEMALİ — Kaynak Sunucu Doğrulama ve Origin Kimlik Protokolleri Karşılaştırması

Bu belge, **ASRIN KEMALİ** web sunucularının doğrudan internetten ve yetkisiz Cloudflare bölgelerinden gelebilecek saldırılara karşı korunması için 4 temel yöntemi mimari, güvenlik ve operasyonel açılardan karşılaştırır.

---

## 1. Kritik Güvenlik Problemi: Neden Yalnızca IP İzin Listesi Yetersizdir? (Kiracı Taklit Riski)

Cloudflare Anycast IP adresleri kamuya açıktır. Kaynak sunucuda yalnızca `origin-firewall.sh` ile Cloudflare IP bloklarına izin verilirse:
- İnternetten doğrudan IP taramaları engellenir (L3/L4 koruması sağlanır).
- **ANCAK (Kiracı Taklit Riski / Tenant Impersonation Bypass):** Kötü niyetli bir saldırgan, kendi açtığı başka bir Cloudflare hesabında DNS hedefini bizim sunucumuzun IP'si olarak tanımlayabilir.
- İstek Cloudflare üzerinden geçeceği için kaynak IP yine geçerli bir Cloudflare IP'si olacaktır.
- Bu durumda saldırgan bizim WAF kurallarımızı, hız limitlerimizi ve PROJECT BLACKOUT kontrollerimizi tamamen atlatabilir (**WAF Bypass via Tenant Impersonation**).

Bu nedenle, **kriptografik köken kimlik doğrulaması ZORUNLUDUR**.

---

## 2. 4 Yöntemin Detaylı Karşılaştırması

| Kriter | 1. Yalnızca IP Beyaz Liste (IP Whitelist) | 2. Origin TLS (Strict SNI) | 3. Authenticated Origin Pull (mTLS) | 4. Cloudflare Tunnel (`cloudflared`) |
|---|---|---|---|---|
| **Doğrudan IP Koruması** | Var (iptables DROP) | Var (iptables DROP) | Var (iptables DROP) | **Mükemmel (Açık port yok)** |
| **Bölge Taklidi Koruması** | **YOK (Açık)** | Kısmi (Host başlığı zorunlu) | **TAM (Kriptografik mTLS)** | **TAM (Sıfır Güven Tünel)** |
| **İnternete Açık Port** | 80, 443 | 443 | 443 | **Sıfır (0 açık port)** |
| **Sertifika Yönetimi** | Yok | Let's Encrypt / Origin CA | Cloudflare Zone CA | Otomatik Token / Kasa |
| **Operasyonel Karmaşıklık** | Çok Düşük | Düşük | Orta | Düşük |
| **Güvenlik Derecesi** | Düşük-Orta | Orta | Yüksek | **En Yüksek (CIS L2)** |

---

## 3. ASRIN KEMALİ İçin En Az Ayrıcalıklı Tavsiye Edilen En Güvenli Mimari

### Birincil Tercih: Cloudflare Tunnel (`cloudflared`)
- **Neden?**
  1. Sunucuda port 80 veya 443'ün internete açılmasına gerek kalmaz.
  2. Saldırgan sunucunun gerçek IP'sini keşfetse bile hiçbir port açık olmadığı için doğrudan port taraması veya DDoS yapamaz.
  3. Yalnızca bizim Cloudflare hesabımızda oluşturulmuş tünel belirteci (`credentials-file`) ile gelen istekler işlenir.
- **Örnek Yapılandırma (`/etc/cloudflared/config.yml`):**
  ```yaml
  tunnel: mka-fortress-production-tunnel
  credentials-file: /etc/cloudflared/mka-tunnel.json

  ingress:
    - hostname: asrinkemali.org
      service: http://localhost:3000
    - hostname: www.asrinkemali.org
      service: http://localhost:3000
    - service: http_status:404
  ```

### İkincil Tercih (Ters Vekil / VPS için): Authenticated Origin Pulls (Zone-Level mTLS)
- Klasik Nginx veya Caddy kullanılıyorsa, Cloudflare genel CA sertifikası yerine **özel Zone-Level CA sertifikası** yüklenmelidir:
  ```nginx
  # Yalnızca bizim zone'umuza ait Cloudflare istemci sertifikası kabul edilir
  ssl_client_certificate /etc/ssl/certs/cloudflare-zone-origin-pull.pem;
  ssl_verify_client on;
  ```

---

## 4. Dürüst Durum Beyanı

> [!NOTE]
> Bu belge ve repodaki konfigürasyon dosyaları **altyapı şablonudur**. Projenin mevcut aşamasında canlı bir Cloudflare Enterprise/Pro hesabı, aktif Cloudflare Tunnel veya mTLS sertifikası bulunmamaktadır. Bu korumalar canlı yayına geçiş öncesi dağıtım aşamasında devreye alınacaktır.
