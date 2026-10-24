# PROJECT BLACKOUT: kritik güvenlik ihlali müdahale sistemi

**Kod:** `web/lib/security/blackout/`
**Testler:** `web/tests/security-blackout.test.mjs` (21 test), `web/tests/security-blackout-integration.test.mjs` (18 test)
**Durum (Görev 09):** Karar motoru, rota politikası, proxy geçiş katmanı, olay müdahale denetleyicisi ve port sözleşmeleri hazır. `proxy.ts` FORTRESS kararından sonra BLACKOUT kararını uyguluyor. **Paylaşılan durum deposu kayıtlı olmadığından etkin düzey her zaman NORMAL** ve canlı davranış değişmiyor. Gerçek port bağlı değil; hiçbir gerçek sistem kesilmiyor.
**Edge sözleşmesi:** [BLACKOUT-INTEGRATION-CONTRACT.md](BLACKOUT-INTEGRATION-CONTRACT.md) · **Port ve hizmet gereksinimleri:** [PORTS.md](PORTS.md)

## Ne gerçekten çalışıyor, ne test seviyesinde, ne altyapı bekliyor

| Bileşen | Durum | Kanıt |
|---|---|---|
| Rota sınıflandırması ve düzey etki tablosu (`routes.ts`) | **Çalışıyor** (saf kod, her istekte) | BI-01, BI-02 |
| Proxy geçiş katmanı (`proxy-guard.ts`, `proxy.ts`) | **Canlı istek yolunda.** Depo yokken her zaman `allow`; davranış değişmiyor. Beklenmeyen hatada fail-closed (hassas yüzeyler 503). | BI-03, production güvenlik E2E |
| Durum kaydı doğrulama ve degraded çözümleme (`state.ts`) | **Çalışıyor**, ancak okunacak kayıtlı depo yok | BI-03, BO-20 |
| Olay değerlendirme, onay kapısı, durum makinesi, kanıt defteri | **Kod hazır ve testli.** Çağıran bir olay kaynağı veya arayüz yok. | BO-01…19, BI-04…14 |
| Olay müdahale denetleyicisi (`controller.ts`) | **Test seviyesinde.** Bellek ikizleri ve sahte onay doğrulayıcısıyla. Varsayılan dry-run. | BI-04…14 |
| HTTPS durum deposu adaptörü | **Yazıldı, bağımsız test edildi, bağlı değil** | BI-15, BI-16 |
| Bellek içi adaptörler | **Yalnız test ikizi.** Production sayılmaz (`test_double`). | BI-13 |
| Paylaşılan durum deposu, onay doğrulayıcısı (OIDC+MFA), oturum deposu, WORM kanıt, bildirim, kayıt imzası (KMS) | **Altyapı gerektiriyor** (`requires_infrastructure`) | BI-13, PORTS.md |
| Veritabanı yazma kilidi | **Uygulanamaz:** uygulamada veritabanı yok; iddia edilmiyor | PORTS.md |

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
| `BlackoutStateStore` | Tüm örneklerin ve edge'in okuduğu kayıt: `read()` + `compareAndSet()` | Yok (`REGISTERED_STATE_STORE = null`, düzey hep NORMAL). Depo erişilemez veya kayıt geçersizse **degraded** (BO-20, BI-03). |

Port eksikse eylem `requires_infrastructure` döner. Bir portun hatası diğer eylemleri durdurmaz (BO-13, BO-14). Ayrıntılar ve gereken hizmetler: [PORTS.md](PORTS.md).

## Rota etkileri (`routes.ts`)

| Rota sınıfı | NORMAL | WATCH | RESTRICTED | LOCKDOWN |
|---|---|---|---|---|
| `health` (`/api/health`, `/api/ready`) | ✔ | ✔ | ✔ | ✔ |
| `admin` (`/admin`, `/yonetim`, `/panel`, `/editor`, `/api/admin`, `/api/editor`) | ✔ (FORTRESS: 404) | ✔ (FORTRESS: 404) | ✖ 503 | ✖ 503 |
| `research` (`/arastirma-laboratuvari`, `/api/arastirma-laboratuvari/*`) | ✔ (production: 404) | ✔ | ✖ 503 | ✖ 503 |
| `public_api` (`/api/health-integration`, diğer `/api/*`) | ✔ | ✔ | GET/HEAD ✔, yazma ✖ | ✖ 503 |
| `public_page` (diğer her şey) | ✔ | ✔ | ✔ | GET/HEAD ✔, yazma ✖ |
| **Depo kesintisi / geçersiz kayıt** (degraded) | En az RESTRICTED etkisi: hassas yüzeyler kapalı, okuma sürer | | | |

- Yol normalizasyonu: küçük harf, `%xx` çözme, `\` → `/`, çift ve sondaki eğik çizgi. Çözülemeyen kodlama `admin` sayılır (BI-02).
- BLACKOUT, FORTRESS kararından sonra çalışır ve onu **asla gevşetmez** (BO-21).

## Olay müdahale denetleyicisi (`controller.ts`)

- `previewPlan(events, requestedBy)` → onaylayanların imzalayacağı plan ve `planSha256`.
- `respond({ events, requestedBy, approvals })`:
  - değerlendirme → onay → uygulanabilir en yüksek düzey → yürütme → CAS ile durum yazımı → kanıt.
  - RESTRICTED/LOCKDOWN yalnız düzeyin tüm eylemleri iki kişiden onay almışsa uygulanır; aksi hâlde en fazla WATCH (`levelLimitedBy`).
- `previewRecovery` / `recover`: bir kademe iniş, bekleme süresi, kontrol listesi, onay, ters eylemler, CAS.
- **Kalıcılık sonucu** (`persistence`), dürüstçe raporlanır:
  - `persisted`
  - `dry_run` (varsayılan)
  - `requires_infrastructure` (depo yok; yalnız bu süreç görür)
  - `store_unavailable` (düzey değişmez)
  - `version_conflict` (eşzamanlı yazım; düzey uygulanmış sayılmaz)
  - `failed`
  - `not_needed`
- Aynı olay tekrar gönderilirse eylemler yeniden yürütülmez, durum yeniden yazılmaz (`duplicate`).
- Düzeyi doğrudan ayarlayan genel yöntem yoktur (BI-07).

## Production'a bağlama (ayrı, onaylı görev)

Şu sırayla yapılmalı:
1. Paylaşılan durum deposu (`HttpBlackoutStateStore` veya eşdeğeri; uygunluk kontrolü)
2. Kimlik sağlayıcısı + `ApprovalVerifier` (OIDC, MFA/FIDO2)
3. KMS ile kayıt imzası + `StateRecordVerifier`
4. WORM kanıt deposu + bildirim kanalı
5. `REGISTERED_STATE_STORE` kaydı (proxy bağlantısı hazır; ek kod gerekmez)
6. Edge kurallarının sözleşmeye uyarlanması (Antigravity)
7. Tatbikat (`test_harness` kaynağı) ve geri dönüş provası
