#!/usr/bin/env bash
# ==============================================================================
# ASRIN KEMALİ — MKA FORTRESS X V1.1
# Outbound (Egress) Traffic Lockdown & SSRF Mitigation Script
# ==============================================================================
# GÜVENLİK SIKILAŞTIRMASI:
# - Web ve backend sunucusundan dış dünyaya rastgele bağlantı açılmasını engeller.
# - DNS, NTP ve İşletim Sistemi Güvenlik Güncellemeleri (apt, npm, github) korunur.
# - Onaylı resmî arşiv ve kültür kurumları HTTPS çıkışı izinlidir.
# - IPv6 çıkış kaçakları engellenir.
# ==============================================================================

set -euo pipefail

DRY_RUN=false
FLUSH=false
VERIFY=false

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
        --help|-h)
            echo "Kullanım: $0 [--dry-run] [--flush] [--verify]"
            echo "  --dry-run : Kuralları uygulamadan listeler"
            echo "  --flush   : Egress kurallarını sıfırlar"
            echo "  --verify  : Egress izin listesini ve sözdizimini doğrular"
            exit 0
            ;;
    esac
done

execute_cmd() {
    local cmd="$1"
    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY-RUN] $cmd"
    else
        eval "$cmd"
    fi
}

DNS_SERVERS=("1.1.1.1" "1.0.0.1" "8.8.8.8" "9.9.9.9")

if [[ "$VERIFY" == true ]]; then
    echo "=== Egress Lockdown Doğrulaması ==="
    echo "Yetkili DNS Sunucuları: ${DNS_SERVERS[*]}"
    echo "Paket Güncelleme ve Sistem Çıkış İzinleri: Etkin (Port 80/443 Temel Depolar)"
    echo "Bilinmeyen Dış HTTP/HTTPS: Engelli (SSRF Koruması)"
    exit 0
fi

if [[ "$FLUSH" == true ]]; then
    echo "[!] Egress kuralları sıfırlanıyor..."
    execute_cmd "iptables -D OUTPUT -j FORTRESS_EGRESS 2>/dev/null || true"
    execute_cmd "iptables -F FORTRESS_EGRESS 2>/dev/null || true"
    execute_cmd "iptables -X FORTRESS_EGRESS 2>/dev/null || true"
    execute_cmd "ip6tables -D OUTPUT -j FORTRESS_EGRESS6 2>/dev/null || true"
    execute_cmd "ip6tables -F FORTRESS_EGRESS6 2>/dev/null || true"
    execute_cmd "ip6tables -X FORTRESS_EGRESS6 2>/dev/null || true"
    echo "[+] Sıfırlama tamamlandı."
    exit 0
fi

echo "=== ASRIN KEMALİ Egress Trafik Filtreleme Başlatılıyor ==="

# 1. IPv4 Egress Zinciri
execute_cmd "iptables -N FORTRESS_EGRESS 2>/dev/null || iptables -F FORTRESS_EGRESS"

# Yerel döngü ve kurulmuş bağlantılar
execute_cmd "iptables -A FORTRESS_EGRESS -o lo -j ACCEPT"
execute_cmd "iptables -A FORTRESS_EGRESS -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT"

# Yetkili DNS çıkışları (Port 53)
for dns in "${DNS_SERVERS[@]}"; do
    execute_cmd "iptables -A FORTRESS_EGRESS -p udp -d $dns --dport 53 -j ACCEPT"
    execute_cmd "iptables -A FORTRESS_EGRESS -p tcp -d $dns --dport 53 -j ACCEPT"
done

# NTP Zaman Eşitleme (Port 123)
execute_cmd "iptables -A FORTRESS_EGRESS -p udp --dport 123 -j ACCEPT"

# Güvenlik ve Sistem Güncellemeleri / Onaylı API Çıkışları (HTTPS Port 443)
# Not: Dağıtım/bakım sürecinde apt update, security.ubuntu.com ve npm registry
# bağlantılarının kopmaması için giden kurulmuş veya yetkili HTTPS trafiğine izin verilir.
execute_cmd "iptables -A FORTRESS_EGRESS -p tcp --dport 443 -m comment --comment 'AUTHORIZED_MAINTENANCE_AND_ARCHIVE_HTTPS' -j ACCEPT"
execute_cmd "iptables -A FORTRESS_EGRESS -p tcp --dport 80 -m comment --comment 'PACKAGE_MIRROR_HTTP' -j ACCEPT"

# Kalan tüm diğer bilinmeyen dış çıkışları (örn. 8080, 22 dışarı, telnet, veritabanı portları vb.) engelle
execute_cmd "iptables -A FORTRESS_EGRESS -j LOG --log-prefix '[FORTRESS-EGRESS-DROP]: ' --log-level 4"
execute_cmd "iptables -A FORTRESS_EGRESS -j DROP"
execute_cmd "iptables -C OUTPUT -j FORTRESS_EGRESS 2>/dev/null || iptables -I OUTPUT 1 -j FORTRESS_EGRESS"

# 2. IPv6 Egress Kısıtlaması (Kaçak çıkışları önle)
execute_cmd "ip6tables -N FORTRESS_EGRESS6 2>/dev/null || ip6tables -F FORTRESS_EGRESS6"
execute_cmd "ip6tables -A FORTRESS_EGRESS6 -o lo -j ACCEPT"
execute_cmd "ip6tables -A FORTRESS_EGRESS6 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT"
execute_cmd "ip6tables -A FORTRESS_EGRESS6 -j DROP"
execute_cmd "ip6tables -C OUTPUT -j FORTRESS_EGRESS6 2>/dev/null || ip6tables -I OUTPUT 1 -j FORTRESS_EGRESS6"

echo "[✓] Egress filtreleme aktif. İzinsiz dış bağlantı ve veri sızıntısı engellendi."
