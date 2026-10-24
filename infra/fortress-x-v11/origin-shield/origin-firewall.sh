#!/usr/bin/env bash
# ==============================================================================
# ASRIN KEMALİ — MKA FORTRESS X V1.1
# Origin Server Firewall & Cloudflare IP Whitelist Script
# ==============================================================================
# Bu betik, kaynak sunucuya doğrudan IP üzerinden gelen bağlantıları engeller.
# Yalnızca Cloudflare Anycast kenar düğümlerinden gelen HTTP(S) trafiğine izin verir.
# ==============================================================================

set -euo pipefail

DRY_RUN=false
FLUSH=false

for arg in "$@"; do
    case "$arg" in
        --dry-run)
            DRY_RUN=true
            ;;
        --flush)
            FLUSH=true
            ;;
        --help|-h)
            echo "Kullanım: $0 [--dry-run] [--flush]"
            echo "  --dry-run : Kuralları uygulamadan yazdırır"
            echo "  --flush   : Origin güvenlik duvarı kurallarını temizler"
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

echo "=== ASRIN KEMALİ Origin Shield Başlatılıyor ==="

if [[ "$FLUSH" == true ]]; then
    echo "[!] Origin güvenlik kuralları sıfırlanıyor..."
    if [[ "$DRY_RUN" == false ]]; then
        iptables -D INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN 2>/dev/null || true
        iptables -F CLOUDFLARE_IN 2>/dev/null || true
        iptables -X CLOUDFLARE_IN 2>/dev/null || true
    fi
    echo "[+] Sıfırlama tamamlandı."
    exit 0
fi

execute_cmd() {
    local cmd="$1"
    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY-RUN] $cmd"
    else
        eval "$cmd"
    fi
}

echo "[*] CLOUDFLARE_IN zinciri oluşturuluyor..."
execute_cmd "iptables -N CLOUDFLARE_IN 2>/dev/null || iptables -F CLOUDFLARE_IN"

# Yerel döngü (Loopback) trafiğine izin ver
execute_cmd "iptables -A CLOUDFLARE_IN -i lo -j ACCEPT"

# Mevcut kurulmuş bağlantılara izin ver
execute_cmd "iptables -A CLOUDFLARE_IN -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT"

# Cloudflare IPv4 Bloklarına port 80 ve 443 için izin ver
echo "[*] Cloudflare IPv4 adresleri yetkilendiriliyor..."
for cidr in "${CF_IPV4[@]}"; do
    execute_cmd "iptables -A CLOUDFLARE_IN -p tcp -m multiport --dports 80,443 -s $cidr -j ACCEPT"
done

# Diğer tüm doğrudan HTTP/HTTPS bağlantılarını sessizce engelle (DROP)
echo "[*] Doğrudan IP erişimlerine DROP kuralı ekleniyor..."
execute_cmd "iptables -A CLOUDFLARE_IN -p tcp -m multiport --dports 80,443 -j DROP"

# Ana INPUT zincirine bağla
execute_cmd "iptables -C INPUT -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN 2>/dev/null || iptables -I INPUT 1 -p tcp -m multiport --dports 80,443 -j CLOUDFLARE_IN"

echo "[✓] Origin Shield başarıyla kuruldu. Kaynak sunucu doğrudan IP saldırılarına kapatıldı."
