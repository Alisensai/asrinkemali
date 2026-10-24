# FORTRESS X V1.1: eksik altyapı gereksinimleri

Aşağıdakiler repo içinden sağlanamaz. Bu görevde hiçbir ücretli hizmet açılmadı, DNS veya canlı sistem değiştirilmedi.

Madde numaraları özgün kontrol listesine (`SOURCE-CONTROL-LIST.md`) aittir. `E` önekli numaralar `CONTROL-MATRIX.md` "Ek öneriler" bölümündendir.

**Öncelik ölçütü:** Saldırı yüzeyi bugün küçük (salt-okunur site, yazma uç noktası yok, yönetim kapalı). En yüksek öncelik, yayın ve onay akışı açılmadan önce gerekenler.

## P0: halka açık yayından önce

| Gereksinim | Kontroller | Not |
|---|---|---|
| `main` dal koruması (zorunlu inceleme, durum kontrolleri, force-push yasağı) | E8, #87 | Ücretsiz. Depo sahibinin ayarı. |
| TLS + HSTS'li HTTPS dağıtımı | #13 | `ASRIN_ENABLE_HSTS=1` yalnız HTTPS'te |
| Kenar koruması: CDN/Anycast + Anti-DDoS + WAF + hız sınırlama + origin koruması | #2, #5, #28, #30, #34 | Ücretsiz katmanlı seçenekler değerlendirilebilir. Karar kullanıcının. |
| Production'da CSP'nin her zaman zorunlu olması (report-only zorunlu politikanın yerine geçmemeli) | #74 | Codex, `headers.ts` (bkz. `PR72-CSP-REVIEW.md`). Kod değişikliği; altyapı gerektirmez. |
| Güvenlik iletişim noktası, SOME ve `security.txt` | #10 | USOM koordinasyonu |

## P1: editoryal onay ve yönetim açılmadan önce

| Gereksinim | Kontroller | BLACKOUT portu |
|---|---|---|
| OIDC kimlik sağlayıcısı + MFA + FIDO2/passkey/donanım anahtarı | #19, #38, #39, #76 | `ApprovalVerifier` |
| Oturum deposu ve acil iptal | #44, #93 | `SessionRevoker` |
| Paylaşılan durum deposu (KV) | #30, #95, #96 | `BlackoutStateStore`, `CriticalApiGate`, `SafeModeSwitch`, `WriteGuard` |
| WORM kanıt, denetim ve yedek deposu | #60, #62, #97 | `EvidenceSink` |
| Bildirim kanalı, nöbet ve müdahale ekibi | #9, #10 | `ResponderNotifier` |
| KMS/HSM ve anahtar rotasyonu (onay imzaları) | #90, #91 | — |
| Kimlik bilgisi iptal API'si (IdP + sır kasası) | #51, #94 | (yeni port gerekir) |

## P2: olgunluk

| Gereksinim | Kontroller |
|---|---|
| SIEM + merkezi günlük saklama | #6, #21 |
| SAST (CodeQL, ücretsiz) | #54 |
| SBOM (CycloneDX) ve imzalı sürüm | #69, E9 |
| Dependabot/Renovate | #17, #86 |
| Workflow aksiyonlarını SHA ile sabitleme (4 dosya) | #68, #87 |
| Nonce tabanlı katı CSP | #74 |
| DR planı, bağımsız kurtarma ortamı, düzenli geri yükleme tatbikatı | #25, #63, #98 |
| MITRE ATT&CK eşlemesi, OWASP ASVS değerlendirmesi, ISO/IEC 27001 BGYS | #22, #23, #24 |
| Bağımsız sızma testi, BAS, ASM/EASM | #18, #81, #82, #85 |
| EDR/EPP/XDR, SOC, UEBA, TIP | #7, #8, #9, #16, #58, #83 |
