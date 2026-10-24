# FORTRESS X V1.1: eksik altyapı gereksinimleri

Aşağıdakiler repo içinden sağlanamaz. Bu görevde hiçbir ücretli hizmet açılmadı, DNS veya canlı sistem değiştirilmedi.

Madde numaraları özgün kontrol listesine (`SOURCE-CONTROL-LIST.md`) aittir. `E` önekli numaralar `CONTROL-MATRIX.md` "Ek öneriler" bölümündendir.

**Öncelik ölçütü:** Saldırı yüzeyi bugün küçük (salt-okunur site, yazma uç noktası yok, yönetim kapalı). En yüksek öncelik, yayın ve onay akışı açılmadan önce gerekenler.

## P0: halka açık yayından önce

| Gereksinim | Kontroller | Not |
|---|---|---|
| `main` dal koruması (zorunlu inceleme, durum kontrolleri, force-push yasağı) | E8, #88 | Ücretsiz. Depo sahibinin ayarı. |
| TLS + HSTS'li HTTPS dağıtımı | #14 | `ASRIN_ENABLE_HSTS=1` yalnız HTTPS'te |
| Kenar koruması: CDN/Anycast + Anti-DDoS + WAF + hız sınırlama + origin koruması | #3, #6, #29, #31, #35 | Ücretsiz katmanlı seçenekler değerlendirilebilir. Karar kullanıcının. |
| Production'da CSP'nin her zaman zorunlu olması (report-only zorunlu politikanın yerine geçmemeli) | #75 | Codex, `headers.ts` (bkz. `PR72-CSP-REVIEW.md`). Kod değişikliği; altyapı gerektirmez. |
| Güvenlik iletişim noktası, SOME ve `security.txt` | #11 | USOM koordinasyonu |

## P1: editoryal onay ve yönetim açılmadan önce

| Gereksinim | Kontroller | BLACKOUT portu |
|---|---|---|
| OIDC kimlik sağlayıcısı + MFA + FIDO2/passkey/donanım anahtarı | #20, #39, #40, #77 | `ApprovalVerifier` |
| Oturum deposu ve acil iptal | #45, #94 | `SessionRevoker` |
| Paylaşılan durum deposu (KV) | #31, #96, #97 | `BlackoutStateStore`, `CriticalApiGate`, `SafeModeSwitch`, `WriteGuard` |
| WORM kanıt, denetim ve yedek deposu | #61, #63, #98 | `EvidenceSink` |
| Bildirim kanalı, nöbet ve müdahale ekibi | #10, #11 | `ResponderNotifier` |
| KMS/HSM ve anahtar rotasyonu (onay imzaları) | #91, #92 | — |
| Kimlik bilgisi iptal API'si (IdP + sır kasası) | #52, #95 | (yeni port gerekir) |

## P2: olgunluk

| Gereksinim | Kontroller |
|---|---|
| SIEM + merkezi günlük saklama | #7, #22 |
| SAST (CodeQL, ücretsiz) | #55 |
| SBOM (CycloneDX) ve imzalı sürüm | #70, E9 |
| Dependabot/Renovate | #18, #87 |
| Workflow aksiyonlarını SHA ile sabitleme (4 dosya) | #69, #88 |
| Nonce tabanlı katı CSP | #75 |
| DR planı, bağımsız kurtarma ortamı, düzenli geri yükleme tatbikatı | #26, #64, #99 |
| MITRE ATT&CK eşlemesi, OWASP ASVS değerlendirmesi, ISO/IEC 27001 BGYS | #23, #24, #25 |
| Bağımsız sızma testi, BAS, ASM/EASM | #19, #82, #83, #86 |
| EDR/EPP/XDR, SOC, UEBA, TIP | #8, #9, #10, #17, #59, #84 |
