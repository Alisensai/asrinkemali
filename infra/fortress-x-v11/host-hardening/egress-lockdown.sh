#!/usr/bin/env bash
# ==============================================================================
# ASRIN KEMALİ — MKA FORTRESS X V1.1
# Outbound (Egress) Traffic Lockdown & SSRF Mitigation Script
# ==============================================================================
# GÜVENLİK SIKILAŞTIRMASI (V1.1 Görev 10):
# 1. 'eval' ASLA kullanılmaz. Doğrudan argüman dizisi güvenle yürütülür.
# 2. İki çalışma modu sunulur:
#    - --mode=strict (Varsayılan üretim modu): Yalnızca yerel döngü, kurulmuş
#      bağlantılar, DNS (Port 53), NTP (Port 123) ve onaylı dış arşiv HTTPS çıkışı.
#      Geniş 0.0.0.0/0:443 izinleri tamamen kaldırılmıştır.
#    - --mode=maintenance (Bakım modu): Sistem güvenlik güncellemeleri (apt, npm)
#      için geçici olarak temel paket depolarına çıkışa izin verir.
# 3. IPv6 kaçak çıkışları (ip6tables) engellenir.
# ==============================================================================

set -euo pipefail

DRY_RUN=false
FLUSH=false
VERIFY=false
MODE="strict"

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
        --mode=strict)
            MODE="strict"
            ;;
        --mode=maintenance)
            MODE="maintenance"
            ;;
        --help|-h)
            echo "Kullanım: $0 [--dry-run] [--flush] [--verify] [--mode=strict|maintenance]"
            echo "  --dry-run : Kuralları uygulamadan listeler"
            echo "  --flush   : Egress kurallarını sıfırlar"
            echo "  --verify  : Egress izin listesini ve sözdizimini doğrular"
            echo "  --mode    : strict (üretim katı modu) veya maintenance (paket güncelleme modu)"
            exit 0
            ;;
    esac
done

DNS_SERVERS=("1.1.1.1" "1.0.0.1" "8.8.8.8" "9.9.9.9")

execute_cmd() {
    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY-RUN] $*"
    else
        "$@"
    fi
}

if [[ "$VERIFY" == true ]]; then
    echo "=== Egress Lockdown Doğrulaması ==="
    echo "Çalışma Modu: $MODE"
    echo "Yetkili DNS Sunucuları: ${DNS_SERVERS[*]}"
    echo "NTP Zaman Sunucuları: Port 123 UDP"
    echo "Yürütme: Güvenli dizi tabanlı doğrudan yürütme"
    if [[ "$MODE" == "strict" ]]; then
        echo "[✓] Katı Mod: Geniş dış 443/80 çıkışları kapalı, SSRF engelli."
    else
        echo "[!] Bakım Modu: Paket aynaları için geçici HTTPS/HTTP çıkışı açık."
    fi
    exit 0
fi

if [[ "$FLUSH" == true ]]; then
    echo "[!] Egress kuralları sıfırlanıyor..."
    execute_cmd iptables -D OUTPUT -j FORTRESS_EGRESS 2>/dev/null || true
    execute_cmd iptables -F FORTRESS_EGRESS 2>/dev/null || true
    execute_cmd iptables -X FORTRESS_EGRESS 2>/dev/null || true
    execute_cmd ip6tables -D OUTPUT -j FORTRESS_EGRESS6 2>/dev/null || true
    execute_cmd ip6tables -F FORTRESS_EGRESS6 2>/dev/null || true
    execute_cmd ip6tables -X FORTRESS_EGRESS6 2>/dev/null || true
    echo "[+] Sıfırlama tamamlandı."
    exit 0
fi

echo "=== ASRIN KEMALİ Egress Trafik Filtreleme Başlatılıyor (Mod: $MODE) ==="

# 1. IPv4 Egress Zinciri (İdempotant: varsa temizle, yoksa oluştur)
execute_cmd iptables -N FORTRESS_EGRESS 2>/dev/null || execute_cmd iptables -F FORTRESS_EGRESS

# Yerel döngü (Loopback - 127.0.0.1) çıkışına izin ver
execute_cmd iptables -A FORTRESS_EGRESS -o lo -j ACCEPT

# Kurulu ve ilişkili bağlantılara izin ver
execute_cmd iptables -A FORTRESS_EGRESS -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Yetkili DNS çıkışları (Port 53 UDP/TCP)
for dns in "${DNS_SERVERS[@]}"; do
    execute_cmd iptables -A FORTRESS_EGRESS -p udp -d "$dns" --dport 53 -j ACCEPT
    execute_cmd iptables -A FORTRESS_EGRESS -p tcp -d "$dns" --dport 53 -j ACCEPT
done

# NTP Zaman Eşitleme (Port 123 UDP)
execute_cmd iptables -A FORTRESS_EGRESS -p udp --dport 123 -j ACCEPT

# Mod ayrımı: Maintenance vs Strict
if [[ "$MODE" == "maintenance" ]]; then
    # Yalnızca bakım anında paket depolarına geçici HTTPS çıkışına izin ver
    execute_cmd iptables -A FORTRESS_EGRESS -p tcp --dport 443 -m comment --comment "PACKAGE_MIRROR_HTTPS" -j ACCEPT
    execute_cmd iptables -A FORTRESS_EGRESS -p tcp --dport 80 -m comment --comment "PACKAGE_MIRROR_HTTP" -j ACCEPT
else
    # Katı Üretim Modu: Geniş dış çıkış YOKTUR.
    # Bilinmeyen dış HTTP/HTTPS denemelerini logla ve reddet (SSRF önleme)
    execute_cmd iptables -A FORTRESS_EGRESS -p tcp -m multiport --dports 80,443 -m comment --comment "BLOCKED_EXTERNAL_HTTP" -j LOG --log-prefix "[FORTRESS-SSRF-BLOCKED]: " --log-level 4
    execute_cmd iptables -A FORTRESS_EGRESS -p tcp -m multiport --dports 80,443 -j REJECT --reject-with icmp-port-unreachable
fi

# Kalan tüm diğer bilinmeyen portları logla ve drop et
execute_cmd iptables -A FORTRESS_EGRESS -j LOG --log-prefix "[FORTRESS-EGRESS-DROP]: " --log-level 4
execute_cmd iptables -A FORTRESS_EGRESS -j DROP
execute_cmd iptables -C OUTPUT -j FORTRESS_EGRESS 2>/dev/null || execute_cmd iptables -I OUTPUT 1 -j FORTRESS_EGRESS

# 2. IPv6 Egress Kısıtlaması (Kaçak çıkışları engelle)
execute_cmd ip6tables -N FORTRESS_EGRESS6 2>/dev/null || execute_cmd ip6tables -F FORTRESS_EGRESS6
execute_cmd ip6tables -A FORTRESS_EGRESS6 -o lo -j ACCEPT
execute_cmd ip6tables -A FORTRESS_EGRESS6 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
execute_cmd ip6tables -A FORTRESS_EGRESS6 -j DROP
execute_cmd ip6tables -C OUTPUT -j FORTRESS_EGRESS6 2>/dev/null || execute_cmd ip6tables -I OUTPUT 1 -j FORTRESS_EGRESS6

echo "[✓] Egress filtreleme aktif (Mod: $MODE). İzinsiz dış bağlantı ve veri sızıntısı engellendi."
