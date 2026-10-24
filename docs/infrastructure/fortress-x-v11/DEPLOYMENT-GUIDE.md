# ASRIN KEMALİ — MKA FORTRESS X V1.1
## Güvenli Dağıtım ve Geçiş Kılavuzu (Deployment Guide)

Bu kılavuz, **MKA FORTRESS X V1.1** altyapı güvenlik katmanlarının üretime zarar vermeden, aşamalı ve doğrulanabilir şekilde nasıl devreye alınacağını adım adım açıklar.

---

## 1. Aşama 0: Yerel ve Kuru Çalıştırma (Dry-Run) Doğrulaması

Herhangi bir canlı sisteme müdahale etmeden önce tüm altyapı şablonları yerel araçlarla test edilir:

```bash
# 1. Altyapı ve güvenlik kurallarının statik doğrulaması
node tools/infra-security/validate-infra.mjs

# 2. 19 adet birim ve entegrasyon testinin çalıştırılması
node --test tools/infra-security/tests/infra-security.test.mjs

# 3. Dosya bütünlüğü manifestosunun çıkarılması
node tools/infra-security/fim.mjs manifest --dir=web/app --out=app-baseline.json

# 4. Sır taraması (Hiçbir anahtarın sızmadığının teyidi)
node tools/mka-fortress/secrets.mjs
```

---

## 2. Aşama 1: Sunucu ve Çekirdek Sertleştirmesi

Ubuntu / Debian Linux VPS veya Dedicated sunucu üzerinde:

```bash
# 1. sysctl ayarlarının uygulanması
sudo cp infra/fortress-x-v11/host-hardening/sysctl-fortress.conf /etc/sysctl.d/99-fortress.conf
sudo sysctl --system

# 2. Ayarların doğrulanması
sysctl net.ipv4.tcp_syncookies
sysctl net.ipv4.conf.all.rp_filter
sysctl kernel.randomize_va_space
# Beklenen: 1, 1, 2

# 3. Egress güvenlik duvarının dry-run olarak incelenmesi
sudo bash infra/fortress-x-v11/host-hardening/egress-lockdown.sh --dry-run
```

---

## 3. Aşama 2: Konteyner ile Güvenli Çalıştırma

```bash
# 1. İmajın derlenmesi
docker compose -f infra/fortress-x-v11/host-hardening/docker-compose.hardened.yml build

# 2. Konteynerin salt-okunur ve non-root modda başlatılması
docker compose -f infra/fortress-x-v11/host-hardening/docker-compose.hardened.yml up -d

# 3. Sağlık durumunun kontrol edilmesi
curl -i http://127.0.0.1:3000/api/health
# Beklenen: HTTP/1.1 200 OK
```

---

## 4. Aşama 3: Kenar Ağı (Cloudflare) ve Origin Shield Devreye Alma

1. **DNS ve SSL:** Cloudflare kontrol panelinde SSL/TLS modu **"Full (Strict)"** seçilir.
2. **WAF Kurallarının İçe Aktarılması:**
   - `infra/fortress-x-v11/waf/cloudflare-ruleset.tf` dosyası Terraform ile uygulanır veya `waf-rulesets.json` kuralları panelde tanımlanır.
   - İlk 48 saat kurallar **"Log / Simulate"** modunda tutularak meşru ziyaretçi trafiğinde sıfır yanlış pozitif olduğu gözlemlenir.
3. **Origin Shield:**
   - Sunucu üzerinde `origin-firewall.sh` çalıştırılarak doğrudan port 80/443 bağlantıları yalnızca Cloudflare IP'lerine kısıtlanır.

---

## 5. Acil Durum Geri Alma (Rollback)

Beklenmeyen bir aksaklık durumunda:
```bash
# Origin firewall'u sıfırla
sudo bash infra/fortress-x-v11/origin-shield/origin-firewall.sh --flush

# Egress kısıtlamalarını sıfırla
sudo bash infra/fortress-x-v11/host-hardening/egress-lockdown.sh --flush
```
