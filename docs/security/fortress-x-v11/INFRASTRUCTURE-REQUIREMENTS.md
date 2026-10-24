# FORTRESS X V1.1: eksik altyapı gereksinimleri

Aşağıdakiler repo içinden sağlanamaz. Bu görevde hiçbir ücretli hizmet açılmadı, DNS veya canlı sistem değiştirilmedi.

**Öncelik ölçütü:** Saldırı yüzeyi bugün küçük (salt-okunur site, yazma uç noktası yok, yönetim kapalı). En yüksek öncelik, yayın ve onay akışı açılmadan önce gerekenler.

## P0: halka açık yayından önce

| Gereksinim | Kontroller | Not |
|---|---|---|
| `main` dal koruması (zorunlu inceleme, durum kontrolleri, force-push yasağı) | #69 | Ücretsiz. Depo sahibinin ayarı. |
| TLS + HSTS'li HTTPS dağıtımı | #23, #24, #85 | `ASRIN_ENABLE_HSTS=1` yalnız HTTPS'te |
| Kenar koruması: CDN + Anti-DDoS + WAF + hız sınırlama | #3, #6, #7, #29, #32 | Ücretsiz katmanlı seçenekler değerlendirilebilir. Karar kullanıcının. |
| Güvenlik iletişim noktası ve `security.txt` | #13 | USOM/CERT koordinasyonu |

## P1: editoryal onay ve yönetim açılmadan önce

| Gereksinim | Kontroller | BLACKOUT portu |
|---|---|---|
| OIDC kimlik sağlayıcısı + MFA/FIDO2/passkey | #37–#40 | `ApprovalVerifier` |
| Oturum deposu ve iptal | #45, #97 | `SessionRevoker` |
| Paylaşılan durum deposu (KV) | #32, #98 | `BlackoutStateStore`, `CriticalApiGate`, `SafeModeSwitch` |
| WORM kanıt ve denetim deposu | #93, #95 | `EvidenceSink` |
| Bildirim kanalı ve nöbet | #19, #20 | `ResponderNotifier` |
| KMS/HSM (onay imzaları) | #87, #88 | — |

## P2: olgunluk

| Gereksinim | Kontroller |
|---|---|
| SIEM + merkezi günlük saklama | #11, #96 |
| SAST (CodeQL, ücretsiz) | #61 |
| SBOM (CycloneDX) ve imzalı sürüm | #64, #70 |
| Dependabot/Renovate | #77 |
| Workflow aksiyonlarını SHA ile sabitleme (4 dosya) | #66 |
| Nonce tabanlı katı CSP | #50 |
| DR planı ve düzenli geri yükleme tatbikatı | #92, #94 |
| EDR/XDR, SOC, tehdit istihbaratı, ASM | #12, #14, #15, #79, #81 |
