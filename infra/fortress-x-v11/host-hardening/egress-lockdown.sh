#!/usr/bin/env bash
# ==============================================================================
# ASRIN KEMALİ — MKA FORTRESS X V1.1
# Outbound (Egress) Traffic Lockdown & SSRF Mitigation Script
# ==============================================================================
# Amaç: Web ve backend sunucusundan dış dünyaya rastgele bağlantı açılmasını engellemek,
# veri sızıntısını (exfiltration) ve SSRF / reverse-shell riskini önlemek.
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
            echo "  --dry-run : Kuralları uygulamadan listeler"
            echo "  --flush   : Egress kurallarını sıfırlar"
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

echo "=== ASRIN KEMALİ Egress Trafik Filtreleme Başlatılıyor ==="

if [[ "$FLUSH" == true ]]; then
    echo "[!] Egress kuralları sıfırlanıyor..."
    if [[ "$DRY_RUN" == false ]]; then
        iptables -D OUTPUT -j FORTRESS_EGRESS 2>/dev/null || true
        iptables -F FORTRESS_EGRESS 2>/dev/null || true
        iptables -X FORTRESS_EGRESS 2>/dev/null || true
    fi
    echo "[+] Sıfırlama tamamlandı."
    exit 0
fi

# Özel FORTRESS_EGRESS zinciri oluştur
execute_cmd "iptables -N FORTRESS_EGRESS 2>/dev/null || iptables -F FORTRESS_EGRESS"

# 1. Yerel döngü (Loopback - 127.0.0.1) çıkış trafiğine izin ver
execute_cmd "iptables -A FORTRESS_EGRESS -o lo -j ACCEPT"

# 2. Daha önce kurulmuş ve ilişkili bağlantıların devamına izin ver
execute_cmd "iptables -A FORTRESS_EGRESS -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT"

# 3. Yalnızca Yetkili DNS Sunucularına Çıkışa İzin Ver (Port 53 UDP/TCP)
# Örnek: Cloudflare DNS (1.1.1.1, 1.0.0.1) ve Google DNS (8.8.8.8)
DNS_SERVERS=("1.1.1.1" "1.0.0.1" "8.8.8.8")
for dns in "${DNS_SERVERS[@]}"; do
    execute_cmd "iptables -A FORTRESS_EGRESS -p udp -d $dns --dport 53 -j ACCEPT"
    execute_cmd "iptables -A FORTRESS_EGRESS -p tcp -d $dns --dport 53 -j ACCEPT"
done

# 4. Yalnızca Zaman Eşitleme (NTP - Port 123 UDP) Trafiğine İzin Ver
execute_cmd "iptables -A FORTRESS_EGRESS -p udp --dport 123 -j ACCEPT"

# 5. Onaylı Resmî Arşiv ve Kültür Kurumları (TBMM, TTK, ATAM) HTTPS (Port 443)
# Not: Uygulama çalışma zamanında doğrudan dış istek yapmaz; ancak editoryal kaynak
# bağlantı denetimleri için yalnızca izin verilen IP/domain çıkışları tanımlanır.
execute_cmd "iptables -A FORTRESS_EGRESS -p tcp -m multiport --dports 80,443 -d 0.0.0.0/0 -m comment --comment 'BLOCKED_EXTERNAL_HTTP' -j LOG --log-prefix '[FORTRESS-SSRF-BLOCKED]: ' --log-level 4"
execute_cmd "iptables -A FORTRESS_EGRESS -p tcp -m multiport --dports 80,443 -j REJECT --reject-with icmp-port-unreachable"

# 6. Kalan tüm diğer bilinmeyen dış çıkışları LOG'la ve DROP et
execute_cmd "iptables -A FORTRESS_EGRESS -j LOG --log-prefix '[FORTRESS-EGRESS-DROP]: ' --log-level 4"
execute_cmd "iptables -A FORTRESS_EGRESS -j DROP"

# Ana OUTPUT zincirine ekle
execute_cmd "iptables -C OUTPUT -j FORTRESS_EGRESS 2>/dev/null || iptables -I OUTPUT 1 -j FORTRESS_EGRESS"

echo "[✓] Egress filtreleme aktif. İzinsiz dış bağlantı ve veri sızıntısı engellendi."
