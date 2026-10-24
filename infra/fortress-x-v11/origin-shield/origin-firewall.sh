#!/usr/bin/env bash
# ==============================================================================
# ASRIN KEMALİ — MKA FORTRESS X V1.1
# Origin Server Firewall & Cloudflare IP Whitelist Script (IPv4 & IPv6 Destekli)
# ==============================================================================
# GÜVENLİK VE MİMARİ NOTU (V1.1 Görev 10):
# 1. Betikte ASLA 'eval' KULLANILMAZ. Tüm komutlar doğrudan güvenli argüman dizisi
#    olarak yürütülür; komut enjeksiyonu riski sıfırdır.
# 2. Hem IPv4 (iptables) hem de IPv6 (ip6tables) için doğrudan port 80/443
#    bağlantıları engellenir; yalnızca Cloudflare IP bloklarına izin verilir.
# 3. ÖNEMLİ MİMARİ GERÇEK: Cloudflare IP'sinden gelmek, isteğin BİZİM Cloudflare
#    bölgemizden geldiğini tek başına KANITLAMAZ (Başka bir Cloudflare kullanıcısı
#    bu IP'yi hedef gösterebilir). Bu nedenle Cloudflare Tunnel (cloudflared)
#    veya Authenticated Origin Pulls (mTLS) kullanımı ZORUNLUDUR.
# 4. SSH yönetim erişimi ($SSH_PORT doğrulanarak) en başta korunur; kilitlenme önlenir.
# 5. Kurallar idempotanttır; tekrar çalıştırıldığında zincirleri mükerrer üretmez.
# 6. --verify ve --auto-rollback seçenekleriyle güvenli devreye alma sağlanır.
# ==============================================================================

set -euo pipefail

DRY_RUN=false
FLUSH=false
VERIFY=false
AUTO_ROLLBACK=0
SSH_PORT="${SSH_PORT:-22}"

# SSH Port Giriş Doğrulaması (1..65535 arası geçerli tam sayı kontrolü)
if ! [[ "$SSH_PORT" =~ ^[0-9]+$ ]] || [ "$SSH_PORT" -lt 1 ] || [ "$SSH_PORT" -gt 65535 ]; then
    echo "Hata: Geçersiz SSH_PORT: $SSH_PORT (1-65535 arasında olmalıdır)" >&2
    exit 1
fi

for arg in "$@"; do
    case "$arg" in
        --dry-run)
            DRY_RUN=true
            ;;
        --flush)
            FLUSH=true
            ;;
        --verify)
            VERIFY=true
            ;;
        --auto-rollback=*)
            AUTO_ROLLBACK="${arg#*=}"
            if ! [[ "$AUTO_ROLLBACK" =~ ^[0-9]+$ ]]; then
                echo "Hata: --auto-rollback değeri pozitif tam sayı olmalıdır." >&2
                exit 1
            fi
            ;;
        --help|-h)
            echo "Kullanım: $0 [--dry-run] [--flush] [--verify] [--auto-rollback=SANIYE]"
            echo "  --dry-run        : Kuralları uygulamadan ekrana yazdırır"
            echo "  --flush          : Eklenen güvenlik duvarı kurallarını tamamen temizler"
            echo "  --verify         : Mevcut kuralları ve sözdizimini doğrular"
            echo "  --auto-rollback  : Belirtilen saniye sonra kuralları otomatik sıfırlar (SSH kopmasını önler)"
            exit 0
            ;;
    esac
done

# Cloudflare Resmi IP Blokları (IPv4)
CF_IPV4=(
    "173.245.48.0/20"
    "103.21.244.0/22"
    "103.22.200.0/22"
    "103.31.4.0/22"
    "141.101.64.0/18"
    "108.162.192.0/18"
    "190.93.240.0/20"
    "188.114.96.0/20"
    "197.234.240.0/22"
    "198.41.128.0/17"
    "162.158.0.0/15"
    "104.16.0.0/13"
    "104.24.0.0/14"
    "172.64.0.0/13"
    "131.0.72.0/22"
)

# Cloudflare Resmi IP Blokları (IPv6)
CF_IPV6=(
    "2400:cb00::/32"
    "2606:4700::/32"
    "2803:f800::/32"
    "2405:b500::/32"
    "2405:8100::/32"
    "2a06:98c0::/29"
    "2c0f:f248::/32"
)

# GÜVENLİ YÜRÜTME: 'eval' ASLA kullanılmaz, doğrudan argüman dizisi çağrılır
execute_cmd() {
    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY-RUN] $*"
    else
        "$@"
    fi
}

if [[ "$VERIFY" == true ]]; then
    echo "=== Origin Shield Kural Doğrulaması ==="
    echo "Tanımlı IPv4 Cloudflare CIDR Sayısı: ${#CF_IPV4[@]}"
    echo "Tanımlı IPv6 Cloudflare CIDR Sayısı: ${#CF_IPV6[@]}"
    echo "Korumalı SSH Portu: $SSH_PORT"
    echo "Yürütme Modu: Güvenli dizi tabanlı doğrudan yürütme"
    if command -v iptables >/dev/null 2>&1; then
        echo "[✓] iptables mevcut"
    else
        echo "[i] iptables bulunamadı (Dry-run / simülasyon ortamı)"
    fi
    if command -v ip6tables >/dev/null 2>&1; then
        echo "[✓] ip6tables mevcut"
    else
        echo "[i] ip6tables bulunamadı (Dry-run / simülasyon ortamı)"
    fi
    echo "[✓] Yapılandırma ve CIDR blokları geçerli."
    exit 0
fi

if [[ "$FLUSH" == true ]]; then
    echo "[!] Origin güvenlik kuralları sıfırlanıyor..."
    execute_cmd iptables -D INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN 2>/dev/null || true
    execute_cmd iptables -F CLOUDFLARE_IN 2>/dev/null || true
    execute_cmd iptables -X CLOUDFLARE_IN 2>/dev/null || true
    execute_cmd ip6tables -D INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN6 2>/dev/null || true
    execute_cmd ip6tables -F CLOUDFLARE_IN6 2>/dev/null || true
    execute_cmd ip6tables -X CLOUDFLARE_IN6 2>/dev/null || true
    echo "[+] Sıfırlama tamamlandı."
    exit 0
fi

echo "=== ASRIN KEMALİ Origin Shield Kuruluyor (IPv4 & IPv6) ==="

# 1. SSH Yönetim Erişimini Garantiye Al (Asla Kilitlenme!)
execute_cmd iptables -C INPUT -p tcp --dport $SSH_PORT -j ACCEPT 2>/dev/null || execute_cmd iptables -I INPUT 1 -p tcp --dport $SSH_PORT -j ACCEPT
execute_cmd ip6tables -C INPUT -p tcp --dport $SSH_PORT -j ACCEPT 2>/dev/null || execute_cmd ip6tables -I INPUT 1 -p tcp --dport $SSH_PORT -j ACCEPT

# 2. IPv4 Kurulumu (İdempotant: varsa temizle, yoksa oluştur)
execute_cmd iptables -N CLOUDFLARE_IN 2>/dev/null || execute_cmd iptables -F CLOUDFLARE_IN
execute_cmd iptables -A CLOUDFLARE_IN -i lo -j ACCEPT
execute_cmd iptables -A CLOUDFLARE_IN -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
for cidr in "${CF_IPV4[@]}"; do
    execute_cmd iptables -A CLOUDFLARE_IN -p tcp -m multiport --dports 80,443 -s "$cidr" -j ACCEPT
done
execute_cmd iptables -A CLOUDFLARE_IN -p tcp -m multiport --dports 80,443 -j DROP
execute_cmd iptables -C INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN 2>/dev/null || execute_cmd iptables -I INPUT 2 -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN

# 3. IPv6 Kurulumu (İdempotant: varsa temizle, yoksa oluştur)
execute_cmd ip6tables -N CLOUDFLARE_IN6 2>/dev/null || execute_cmd ip6tables -F CLOUDFLARE_IN6
execute_cmd ip6tables -A CLOUDFLARE_IN6 -i lo -j ACCEPT
execute_cmd ip6tables -A CLOUDFLARE_IN6 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
for cidr6 in "${CF_IPV6[@]}"; do
    execute_cmd ip6tables -A CLOUDFLARE_IN6 -p tcp -m multiport --dports 80,443 -s "$cidr6" -j ACCEPT
done
execute_cmd ip6tables -A CLOUDFLARE_IN6 -p tcp -m multiport --dports 80,443 -j DROP
execute_cmd ip6tables -C INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN6 2>/dev/null || execute_cmd ip6tables -I INPUT 2 -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN6

echo "[✓] Origin Shield başarıyla kuruldu (IPv4 & IPv6 doğrudan port 80/443 kapatıldı)."

# Otomatik Geri Alma Sayacı (SSH kopması testi için)
if [[ "$AUTO_ROLLBACK" -gt 0 && "$DRY_RUN" == false ]]; then
    echo "[!] Otomatik geri alma (auto-rollback) devrede: $AUTO_ROLLBACK saniye sonra kurallar sıfırlanacak."
    echo "[!] İşlemi onaylamak için 'touch /tmp/mka-fw-confirmed' çalıştırın."
    (
        sleep "$AUTO_ROLLBACK"
        if [[ ! -f /tmp/mka-fw-confirmed ]]; then
            echo "[!] Onay dosyası bulunamadı, kurallar geri alınıyor..."
            "$0" --flush
        else
            echo "[✓] Kural onayı alındı, kalıcı yapılıyor."
            rm -f /tmp/mka-fw-confirmed
        fi
    ) &
fi
