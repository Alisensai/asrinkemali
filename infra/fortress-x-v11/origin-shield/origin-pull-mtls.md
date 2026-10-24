# ASRIN KEMALİ — Kaynak Sunucu Doğrulama ve mTLS / Tunnel Mimarisi

Bu belge, **ASRIN KEMALİ** web sunucularının doğrudan internet saldırılarına karşı görünmez kılınması (Origin Cloaking) için iki kademeli güven protokolünü açıklar.

## 1. Yöntem A: Cloudflare Authenticated Origin Pulls (mTLS)

Authenticated Origin Pulls, kenar CDN ile kaynak sunucu arasında karşılıklı TLS (Mutual TLS - mTLS) el sıkışması gerçekleştirir. Kaynak sunucu, gelen isteğin istemci sertifikasını (Cloudflare Origin CA) doğrular; sertifikasız hiçbir istek kabul edilmez.

### Nginx Yapılandırması:
```nginx
# Cloudflare Origin Pull CA sertifikası
ssl_client_certificate /etc/ssl/certs/cloudflare-origin-pull-ca.pem;
ssl_verify_client on;

# Yalnızca geçerli Cloudflare sertifikasına sahip istekler işlenir
error_page 495 496 497 =403 /origin-denied.html;
```

---

## 2. Yöntem B: Cloudflare Tunnel (Önerilen Mimari)

Cloudflare Tunnel (`cloudflared`), kaynak sunucuda hiçbir açık gelen port (Inbound Port 80/443) bırakmaz. Sunucu, Cloudflare Anycast ağına güvenli giden (Outbound) TLS tünelleri açar.

### Avantajları:
- **Sıfır Açık Port:** Sunucuda port 80 veya 443'ün internete açık olmasına gerek yoktur.
- **DDoS İmkânsızlığı:** Doğrudan kaynak IP üzerinden DDoS veya port taraması yapılamaz.
- **Statik IP Zorunluluğu Yok:** Dinamik veya özel IP arkasındaki ortamlarda bile güvenle çalışır.

### Örnek `cloudflared` Yapılandırması (`/etc/cloudflared/config.yml`):
```yaml
tunnel: a5b4c3d2-mka-fortress-production
credentials-file: /etc/cloudflared/mka-tunnel.json

ingress:
  - hostname: asrinkemali.org
    service: http://localhost:3000
    originRequest:
      connectTimeout: 10s
      noTLSVerify: false
  - hostname: www.asrinkemali.org
    service: http://localhost:3000
  - service: http_status:404
```

---

## 3. Güvenlik Seviyesi Karşılaştırması

| Kriter | Doğrudan IP | IP Whitelist (Firewall) | Authenticated Origin Pull | Cloudflare Tunnel |
|---|---|---|---|---|
| Doğrudan Saldırı Riski | Yüksek | Düşük | Çok Düşük | **Sıfır** |
| WAF Bypass Riski | Yüksek | Yok (IP bilinse de engellenir) | Yok (Kriptografik) | **Yok** |
| Açık Port İhtiyacı | 80/443 | 80/443 | 80/443 | **0 (Yok)** |
