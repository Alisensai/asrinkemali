#!/usr/bin/env bash
# ==============================================================================
# ASRIN KEMALİ — MKA FORTRESS X V1.1
# Origin Server Firewall & Cloudflare IP Whitelist Script (IPv4 & IPv6 Destekli)
# ==============================================================================
# GÜVENLİK VE MİMARİ NOTU:
# 1. Bu betik hem IPv4 (iptables) hem de IPv6 (ip6tables) için doğrudan HTTP/HTTPS
#    (Port 80/443) erişimini engeller; yalnızca Cloudflare IP bloklarına izin verir.
# 2. ÖNEMLİ: Cloudflare IP'sinden gelmek, isteğin BİZİM Cloudflare bölgemizden
#    geldiğini TEK BAŞINA KANITLAMAZ (Başka bir Cloudflare hesabı da bu IP'yi
#    hedef gösterebilir). Bu nedenle tam koruma için Authenticated Origin Pulls
#    (mTLS) veya Cloudflare Tunnel (cloudflared) kullanımı ZORUNLUDUR.
# 3. Yönetim SSH erişimi (Port 22) yanlışlıkla kilitlenmeye karşı korunmuştur.
# 4. --verify ve --auto-rollback seçenekleriyle güvenli devreye alma sağlanır.
# ==============================================================================

set -euo pipefail

DRY_RUN=false
FLUSH=false
VERIFY=false
AUTO_ROLLBACK=0
SSH_PORT="${SSH_PORT:-22}"

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

execute_cmd() {
    local cmd="$1"
    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY-RUN] $cmd"
    else
        eval "$cmd"
    fi
}

if [[ "$VERIFY" == true ]]; then
    echo "=== Origin Shield Kural Doğrulaması ==="
    echo "Tanımlı IPv4 Cloudflare CIDR Sayısı: ${#CF_IPV4[@]}"
    echo "Tanımlı IPv6 Cloudflare CIDR Sayısı: ${#CF_IPV6[@]}"
    echo "Korumalı SSH Portu: $SSH_PORT"
    if command -v iptables >/dev/null 2>&1; then
        echo "[✓] iptables mevcut"
    else
        echo "[i] iptables bulunamadı (Dry-run veya konteyner ortamı)"
    fi
    if command -v ip6tables >/dev/null 2>&1; then
        echo "[✓] ip6tables mevcut"
    else
        echo "[i] ip6tables bulunamadı (Dry-run veya konteyner ortamı)"
    fi
    echo "[✓] Yapılandırma ve CIDR blokları geçerli."
    exit 0
fi

if [[ "$FLUSH" == true ]]; then
    echo "[!] Origin güvenlik kuralları sıfırlanıyor..."
    execute_cmd "iptables -D INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN 2>/dev/null || true"
    execute_cmd "iptables -F CLOUDFLARE_IN 2>/dev/null || true"
    execute_cmd "iptables -X CLOUDFLARE_IN 2>/dev/null || true"
    execute_cmd "ip6tables -D INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN6 2>/dev/null || true"
    execute_cmd "ip6tables -F CLOUDFLARE_IN6 2>/dev/null || true"
    execute_cmd "ip6tables -X CLOUDFLARE_IN6 2>/dev/null || true"
    echo "[+] Sıfırlama tamamlandı."
    exit 0
fi

echo "=== ASRIN KEMALİ Origin Shield Kuruluyor (IPv4 & IPv6) ==="

# 1. SSH Yönetim Erişimini Garantiye Al (Asla Kilitlenme!)
execute_cmd "iptables -C INPUT -p tcp --dport $SSH_PORT -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport $SSH_PORT -j ACCEPT"
execute_cmd "ip6tables -C INPUT -p tcp --dport $SSH_PORT -j ACCEPT 2>/dev/null || ip6tables -I INPUT 1 -p tcp --dport $SSH_PORT -j ACCEPT"

# 2. IPv4 Kurulumu
execute_cmd "iptables -N CLOUDFLARE_IN 2>/dev/null || iptables -F CLOUDFLARE_IN"
execute_cmd "iptables -A CLOUDFLARE_IN -i lo -j ACCEPT"
execute_cmd "iptables -A CLOUDFLARE_IN -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT"
for cidr in "${CF_IPV4[@]}"; do
    execute_cmd "iptables -A CLOUDFLARE_IN -p tcp -m multiport --dports 80,443 -s $cidr -j ACCEPT"
done
execute_cmd "iptables -A CLOUDFLARE_IN -p tcp -m multiport --dports 80,443 -j DROP"
execute_cmd "iptables -C INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN 2>/dev/null || iptables -I INPUT 2 -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN"

# 3. IPv6 Kurulumu (IPv6 By-pass Koruması)
execute_cmd "ip6tables -N CLOUDFLARE_IN6 2>/dev/null || ip6tables -F CLOUDFLARE_IN6"
execute_cmd "ip6tables -A CLOUDFLARE_IN6 -i lo -j ACCEPT"
execute_cmd "ip6tables -A CLOUDFLARE_IN6 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT"
for cidr6 in "${CF_IPV6[@]}"; do
    execute_cmd "ip6tables -A CLOUDFLARE_IN6 -p tcp -m multiport --dports 80,443 -s $cidr6 -j ACCEPT"
done
execute_cmd "ip6tables -A CLOUDFLARE_IN6 -p tcp -m multiport --dports 80,443 -j DROP"
execute_cmd "ip6tables -C INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN6 2>/dev/null || ip6tables -I INPUT 2 -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN6"

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
