# PROJECT BLACKOUT: kritik güvenlik ihlali müdahale sistemi

**Kod:** `web/lib/security/blackout/`
**Testler:** `web/tests/security-blackout.test.mjs` (21 test)
**Durum:** Karar motoru, açık arayüzler ve testler hazır. **Production istek yoluna bağlı değil**, gerçek port uygulaması yok ve hiçbir gerçek sistemi kesmiyor.

## Tasarım ilkeleri

1. **Yıkıcı eylem yok.** Veri silme, yedek imhası, günlük yok etme, günlük kapatma, depolama silme ve anahtar imhası:
   - tip düzeyinde tanımlı değil,
   - `FORBIDDEN_ACTION_TYPES` listesinde,
   - yürütücü çalışma anında reddediyor (BO-12).

   Kaynak kodda dosya sistemi, süreç sonlandırma veya ağ çağrısı yok (BO-21).
2. **Önce kanıt.** Her düzeyde ilk eylem kanıt korumadır. Kanıt defteri yalnız ekleme yapılabilen, hash zincirli ve redakte bir kayıttır (BO-18, BO-19).
3. **Yanlış alarmda kesinti yok.** Kısıtlama yalnız doğrulanmış olaylarda önerilir. Tek kaynak, elle bildirim, bot gürültüsü ve tatbikat en fazla izleme düzeyine çıkar.
4. **Yüksek etkiye insan kararı.** API kapatma, yazma dondurma ve salt-okunur mod iki farklı kişiden doğrulanmış, MFA'lı ve plana bağlı onay ister. Doğrulayıcı kayıtlı değilken bu adımlar hiç yürütülmez.
5. **Kontrollü dönüş.** Geri dönüş kademe kademe yapılır. Her kademede bekleme süresi, kontrol listesi ve ters eylemler var.
6. **Varsayılan dry-run.** Yürütücü, açıkça `dryRun: false` verilmedikçe hiçbir porta dokunmaz.

## Düzeyler

| Düzey | Ad | Tetikleyici | Önerilen eylemler | Rota etkisi (`blackoutRouteDecision`) |
|---|---|---|---|---|
| 0 | NORMAL | Olay yok veya yalnız düşük önem | — | Değişiklik yok |
| 1 | WATCH | Orta önem; doğrulanmamış yüksek/kritik; ≥50 düşük önemli olay | Kanıt koruma, ekibe bildirim | Değişiklik yok |
| 2 | RESTRICTED | Bağımsız ≥2 otomatik kaynaktan yüksek önem | + şüpheli oturum iptali, kritik API kapatma | Kritik API ve yönetim rotaları 503; sayfalar açık |
| 3 | LOCKDOWN | Doğrulanmış kritik olay | + ayrıcalıklı oturum iptali, yazma dondurma, salt-okunur güvenli mod | Durum değiştiren tüm istekler ve sağlık dışı API'ler 503; herkese açık sayfalar GET/HEAD ile okunur |

`/api/health` ve `/api/ready` her düzeyde açıktır (izleme ve geri dönüş doğrulaması için).

## Akış

```
olaylar ─► evaluateIncident ─► ResponsePlan ─► checkApprovals ─► executeActions(ports) ─► escalate
              │ (doğrulama)        │ planDigest      │ (2 kişi, MFA)     │ dry-run varsayılan
              ▼                    ▼                 ▼                   ▼
          appendEvidence ◄────────────── her adım kanıt defterine ──────────────┘

geri dönüş: planRecovery(kontrol listesi, bekleme) ─► checkApprovals ─► ters eylemler ─► stepDown (bir kademe)
```

## Önem sınıflandırması ve yanlış alarm koruması (`policy.ts`)

| Olay türü | Temel önem |
|---|---|
| `admin_route_probe`, `csp_violation`, `unknown` | low |
| `rate_anomaly`, `auth_failure_burst` | medium |
| `dependency_critical_vuln`, `privileged_session_anomaly`, `approval_forgery_attempt` | high |
| `integrity_unexpected_change`, `audit_chain_broken`, `secret_exposed`, `data_exfiltration_suspected` | critical |

**Yanlış alarm korumaları (test kimliği):**
- Kimliksiz, geçersiz güvenli, gelecekten gelen (>60 sn), 15 dk pencere dışı ve yinelenen olaylar atılır (BO-05).
- `test_harness` kaynağı her zaman `info` sayılır: tatbikat gerçek müdahale başlatmaz (BO-01, BO-06).
- Güveni 0,5'in altındaki olay bir önem düzeyi düşer (BO-01).
- **Doğrulama:** RESTRICTED veya LOCKDOWN için şunlardan biri gerekir:
  - en az iki bağımsız otomatik kaynak, ya da
  - deterministik araçtan (`integrity_tool`, `audit_chain`, `secrets_tool`) gelen, SHA-256 kanıt özetli ve güveni 0,9 ve üzeri bir kritik olay (BO-07, BO-08).
- Tek kaynaklı kritik olay yalnız WATCH üretir (BO-02). Yalnız elle bildirilen olaylar WATCH'ı aşamaz (BO-04). 500 yönetim rotası taraması yalnız WATCH üretir (BO-03).

## İnsan onayı (`approval.ts`)

| Eylem | Etki |
|---|---|
| Kanıt koruma, bildirim | Otomatik |
| Şüpheli oturum iptali | Tek doğrulanmış onay |
| Ayrıcalıklı/tüm oturum iptali, API kapatma/açma, yazma dondurma/çözme, salt-okunur mod aç/kapat | İki farklı kişiden onay |

Bir onay şu koşulların hepsini sağlamalı:
- `ApprovalVerifier` tarafından doğrulanmış,
- MFA'lı,
- `security_officer` veya `incident_commander` rolünde,
- 15 dakikadan eski değil,
- plan özetine (`planDigest`) bağlı,
- planı talep eden kişiden gelmiyor.

Plan değişirse önceki onaylar düşer. Aynı kişinin iki onayı tek sayılır (BO-10, BO-11).

`REGISTERED_APPROVAL_VERIFIER = null`: bugün yalnız kanıt koruma ve bildirim yürütülebilir (BO-09).

## Kontrollü geri dönüş ve geri alma (`state-machine.ts`)

- Yükseltme doğrudan yapılabilir. İniş yalnız bir kademe: LOCKDOWN → RESTRICTED → WATCH → NORMAL.
- En kısa bekleme süreleri: LOCKDOWN 30 dk, RESTRICTED 15 dk, WATCH 5 dk.
- **Kontrol listesi:**
  - tehdit kontrol altında,
  - kanıt korundu,
  - sağlık kontrolleri geçiyor,
  - (LOCKDOWN'dan inişte) kök neden belgelendi.
- Ters eylemler uygulanma sırasının tersine yürür: önce salt-okunur kapatılır ve yazmalar açılır, sonra API açılır. Ters eylemler yürütülmeden `stepDown` reddeder (BO-15, BO-16).
- Oturum iptali geri alınmaz ama yıkıcı değildir; kullanıcı yeniden oturum açar. Kanıt koruma hiçbir zaman geri alınmaz.

Tam döngü testi (BO-15), sahte portlarla NORMAL → LOCKDOWN → NORMAL geçişini yapar ve sistemin başlangıç durumuna döndüğünü doğrular.

## Açık arayüzler (`ports.ts`)

| Port | Görev | Bugün |
|---|---|---|
| `SessionRevoker` | Oturum iptali (kapsam: şüpheli/ayrıcalıklı/tümü) | Yok: oturum deposu ve kimlik sağlayıcısı gerekir |
| `CriticalApiGate` | Kritik API'leri kapat/aç | Yok: paylaşılan durum ve proxy bağlantısı gerekir |
| `WriteGuard` | Yazma dondurma | Yok: bugün yazma uç noktası da yok |
| `SafeModeSwitch` | Salt-okunur güvenli mod | Yok |
| `ResponderNotifier` | Ekibe bildirim | Yok: e-posta/çağrı hizmeti |
| `EvidenceSink` | Değiştirilemez kanıt deposu (yalnız `append`) | Yok: WORM depolama |
| `BlackoutStateStore` | Tüm örneklerin okuduğu etkin düzey | Yok (`REGISTERED_STATE_STORE = null`, düzey hep NORMAL). Depo erişilemezse WATCH'a düşer (BO-20). |

Port eksikse eylem `requires_infrastructure` döner. Bir portun hatası diğer eylemleri durdurmaz (BO-13, BO-14).

## Production'a bağlama (ayrı, onaylı görev)

Şu sırayla yapılmalı:
1. Paylaşılan durum deposu
2. Kimlik sağlayıcısı + `ApprovalVerifier` (OIDC, MFA/FIDO2)
3. WORM kanıt deposu
4. Bildirim kanalı
5. `proxy.ts` içinde `blackoutRouteDecision(await currentBlackoutLevel(), request)` çağrısı (FORTRESS proxy sahibi ile)
6. Tatbikat (`test_harness` kaynağı) ve geri dönüş provası

İlk sürüm bilinçli olarak `proxy.ts`'e dokunmuyor (BO-21).
