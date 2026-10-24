# PROJECT BLACKOUT: edge ve altyapı entegrasyon sözleşmesi

- **Sahip (uygulama + karar motoru):** Claude, `web/lib/security/blackout/`
- **Tüketici (edge, WAF, ağ, depolama):** Antigravity, `infra/fortress-x-v11/` (PR #73)
- **Sürüm:** 1.0 (2026-10-24)
- **Kural:** Bu belge ile `routes.ts` / `state.ts` / `ports.ts` arasında fark varsa **kod esastır**. Testler: `web/tests/security-blackout-integration.test.mjs`.

Bu belge Antigravity'nin dosyalarını değiştirmez. Aşağıdaki "PR #73 için değişiklik önerileri", inceleme için yazılmıştır.

## 1. Güvenlik düzeyi nasıl okunur?

- **Kaynak:** Paylaşılan, kalıcı durum deposundaki tek bir kayıt (`StoredBlackoutState`, `state.ts`):

```json
{
  "level": 0,
  "version": 7,
  "since": 1792838400000,
  "updatedAt": 1792838400000,
  "incidentId": null,
  "appliedActions": [],
  "transitionSha256": "<64 hex>",
  "signature": "<isteğe bağlı; doğrulayıcı kayıtlıysa zorunlu>"
}
```

- **Doğrulama:** Okuyan her katman (proxy: `resolveBlackoutState`, edge: aynı mantık) kaydı `validateStoredState` kurallarıyla denetler:
  - `level` ∈ {0, 1, 2, 3}
  - `version` ≥ 0 tam sayı
  - zaman damgaları gelecekte değil (+60 sn tolerans)
  - `appliedActions` izin listesinde
  - `transitionSha256` 64 hex
- **Ortam değişkeniyle düzey belirlenmez.** Ortam değişkeni, dağıtım erişimi olan herkesin düzeyi denetim kaydı ve onay olmadan değiştirmesine izin verir.
- **Okuma süresi sınırı:** Varsayılan 250 ms. Aşılırsa kayıt erişilemez sayılır.

## 2. Yetkili bir olay nasıl doğrulanır?

- Düzey yalnız `BlackoutController.respond()` / `recover()` akışıyla değişir. **Düzeyi doğrudan ayarlayan genel yöntem yoktur** (BI-07).
- **RESTRICTED ve LOCKDOWN için:**
  1. Olay doğrulanmış olmalı: en az iki bağımsız otomatik kaynak, ya da deterministik araçtan (`integrity_tool`, `audit_chain`, `secrets_tool`) SHA-256 kanıtlı ve güveni 0,9 ve üzeri kritik bulgu.
  2. Düzeyin tüm eylemleri **iki farklı kişiden** onay almış olmalı. Her onay:
     - `ApprovalVerifier` (OIDC + MFA) ile doğrulanmış,
     - `security_officer` veya `incident_commander` rolünde,
     - 15 dakikadan eski değil,
     - plan özetine (`planDigest`) bağlı,
     - talep eden kişiden değil.
- Onaysızken en fazla WATCH uygulanır. WATCH'ın rota etkisi yoktur.
- **Edge tarafı onay vermez, olay doğrulamaz.** Edge yalnız kaydı okur ve uygular. WAF/IDS kendi bulgularını `SecurityEvent` olarak gönderir (`source: "waf" | "ids"`). Tek başına edge bulgusu en fazla WATCH üretir; ikinci bağımsız kaynak gerekir.

## 3. Durum nasıl kalıcı ve tutarlı tutulmalı?

- **Depo:** Tüm uygulama örneklerinin ve edge'in okuyabildiği tek bir kalıcı kayıt (ör. sürüm/ETag destekli KV veya küçük bir kontrol API'si).
- **Yazma yalnız compare-and-set ile:** `compareAndSet(expectedVersion, next)`, `next.version === expectedVersion + 1` şartıyla. **Koşulsuz `setLevel` yazma yolu olmamalı.** Uygunluk kontrolü bunu reddeder (`checkStateStoreConformance`, BI-15).
- **HTTP sözleşmesi** (`adapters/http-state-store.ts`, bağımsız test edildi):
  - `GET {endpoint}` → 200 JSON / 404 = başlangıç durumu
  - `PUT {endpoint}`, `If-Match: "<expectedVersion>"` → 200/204 yazıldı, 409/412 sürüm çakışması (`{ version }`)
  - Yalnız `https:`, `Authorization: Bearer`, yönlendirme izlenmez
- **Yazma yetkisi:** Depoya yazma kimlik bilgisi yalnız denetleyicinin çalıştığı ortamda bulunmalı. Edge'de **yalnız okuma** yetkisi olmalı.
- **İmza (önerilen):** Kayıt, KMS/HSM anahtarıyla imzalanmalı (`signature`) ve edge/proxy `StateRecordVerifier` ile doğrulamalı. Bugün kayıtlı doğrulayıcı yok (`REGISTERED_STATE_RECORD_VERIFIER = null`).
- **Bugünkü durum:** `REGISTERED_STATE_STORE = null`. Proxy düzeyi NORMAL okur. Tek sunuculu veya çok sunuculu gerçek koruma **yoktur**.

## 4. Edge katmanı hangi rotaları engeller?

Tablo `routes.ts` `ROUTE_POLICY` ile aynıdır. Engelleme yanıtı: `503`, `Retry-After: 300`, `Cache-Control: no-store`, düzey adı ve iç ayrıntı gövdede yok.

| Rota sınıfı | Örnek | NORMAL | WATCH | RESTRICTED | LOCKDOWN |
|---|---|---|---|---|---|
| `health` | `/api/health`, `/api/ready` (tam eşleşme) | ✔ | ✔ | ✔ | ✔ |
| `admin` | `/admin`, `/yonetim`, `/panel`, `/editor`, `/api/admin`, `/api/editor` | ✔* | ✔* | ✖ | ✖ |
| `research` | `/arastirma-laboratuvari`, `/api/arastirma-laboratuvari/*` | ✔* | ✔* | ✖ | ✖ |
| `public_api` | `/api/health-integration` ve diğer `/api/*` | ✔ | ✔ | GET/HEAD ✔ · yazma ✖ | ✖ |
| `public_page` | Diğer her şey (`/`, `/arsiv/...`) | ✔ | ✔ | ✔ | GET/HEAD ✔ · yazma ✖ |

\* FORTRESS kapıları ayrıca uygulanır (yönetim rotaları kimlik sağlayıcısı yokken 404; araştırma production'da 404). BLACKOUT bunları asla gevşetmez.

- **Yol normalizasyonu zorunlu** (`normalizePath`): küçük harf, yüzde kodlaması çözülür, `\` → `/`, çift ve sondaki eğik çizgiler kaldırılır. Çözülemeyen kodlama en hassas sınıf (`admin`) sayılır (BI-02).
- **LOCKDOWN = salt-okunur güvenli mod**, tüm siteyi kapatmak değildir. Kamuya açık okuma sürer (BI-01, BI-05).

## 5. Depo kesilirse ne yapılır?

| Durum | Sonuç |
|---|---|
| Depo kayıtlı değil | NORMAL (bugün), `source: not_configured` |
| Okuma hatası / zaman aşımı | `degraded`: etkin düzey en az RESTRICTED. Hassas yüzeyler (yönetim, araştırma, API yazımları) 503; kamuya açık okuma sürer. |
| Geçersiz kayıt | `degraded` |
| İmza doğrulanamadı | `degraded` |

- Denetleyici kesintide **düzeyi değiştirmez** (`store_unavailable`). Yine de kanıt ve bildirim (otomatik eylemler) denenir (BI-10).
- **Self-DoS yok:** Kesinti asla tüm siteyi kapatmaz.

## 6. Kanıtlar nasıl korunur?

- **Kanıt defteri:** `evidence.ts`. Yalnız ekleme yapılır; SHA-256 zincirli (`previousHash`, `sequence`); yük redakte (parola, belirteç, çerez, JWT, anahtar).
- **`EvidenceSink` sözleşmesi:**
  - Yalnız `append` var; silme, değiştirme veya kırpma yöntemi **olmamalı**.
  - Zincir sürekliliği doğrulanmalı, kopuk veya değiştirilmiş kayıt reddedilmeli.
  - Aynı kaydın yeniden gönderimi idempotent olmalı.
  - Uygunluk kontrolü: `checkEvidenceSinkConformance` (BI-14).
- **WORM gereksinimi:** Nesne kilidi (compliance mode) ve saklama süresi olan depolama. Silme yetkisi kanıt yazan kimlikte bulunmamalı. **Bugün WORM depo yok.** Bellek ikizi WORM değildir ve öyle raporlanır.

## 7. Sistem nasıl geri alınır?

- `recover()` her çağrıda **bir kademe** iner: LOCKDOWN → RESTRICTED → WATCH → NORMAL.
- **En kısa bekleme:** 30 / 15 / 5 dakika.
- **Kontrol listesi:**
  - tehdit kontrol altında,
  - kanıt korundu,
  - sağlık kontrolleri geçiyor,
  - LOCKDOWN'dan çıkışta kök neden belgelendi.
- **Onay:** RESTRICTED ve üstünden iniş iki farklı kişi, WATCH → NORMAL bir doğrulanmış kişi.
- **Ters eylemler** uygulanma sırasının tersine yürür (önce salt-okunur kapatılır ve yazmalar açılır, sonra API). Ters eylem başarısızsa düzey değişmez.
- Durum CAS ile yazılır. Her adım kanıt defterine işlenir (BI-11).
- **Kurtarma erişimi:** BLACKOUT hiçbir düzeyde SSH, konsol veya yönetici kurtarma erişimini kesmez; bu tür bir eylem tanımlı değildir. Edge kuralları kurtarma yolunu (bulut konsolu, bastion) **kapsam dışında** tutmalıdır.

## Kesin yasaklar (her iki taraf için)

Veritabanı yok etme, yedek silme, günlük silme veya kapatma, kanıt imhası, sunucuyu kalıcı bozma ve kurtarma erişimini kalıcı kesme:
- tip düzeyinde tanımlı değil,
- `FORBIDDEN_ACTION_TYPES` listesinde,
- yürütücü çalışma anında reddediyor (BO-12, BI-17).

Edge/altyapı betikleri de bu eylemleri içermemelidir.

## PR #73 için değişiklik önerileri (inceleme notu, 2026-10-24)

Okunan dosyalar: `infra/fortress-x-v11/blackout-adapters/infra-ports-adapter.ts`, `.../disaster-recovery/blackout-edge-fallback/edge-blackout-worker.js` (head `284e9cb`). Bu dosyalar değiştirilmedi.

| # | Gözlem | Risk | Öneri |
|---|---|---|---|
| 1 | Edge LOCKDOWN tüm isteklere 503 dönüyor | Kamuya açık arşiv tamamen kapanıyor; uygulamanın salt-okunur LOCKDOWN tanımıyla çelişiyor | LOCKDOWN'da yalnız yazma yöntemlerini ve sağlık dışı API'leri engelleyin (bölüm 4). Tam kapatma ayrı ve açık bir "bakım" kararı olmalı. |
| 2 | Depo kesintisinde WATCH'a düşülüyor; yorum "hassas yüzeyler kapalı kalır" diyor ama düzey 1'de hiçbir rota engellenmiyor | Kesintide hassas yüzeyler açık kalıyor (yorum ile davranış uyuşmuyor) | Kesinti → `degraded` → en az RESTRICTED etkisi (bölüm 5) |
| 3 | `env.MKA_BLACKOUT_LEVEL` ile düzey belirlenebiliyor | Dağıtım erişimi olan kişi onaysız ve izsiz düzey değiştirebilir | Kaldırılması önerilir (bölüm 1) |
| 4 | KV'den imzasız, sürümsüz ham `level` değeri okunuyor | Kayıt bütünlüğü ve kaynağı doğrulanmıyor | `StoredBlackoutState` şeması + doğrulama + (önerilen) imza |
| 5 | Adaptörde koşulsuz `setLevel(level)` | Yetkisiz veya yarış koşullu yazım | `compareAndSet` sözleşmesi; uygunluk kontrolü `setLevel`'i reddeder |
| 6 | Tipler yeniden tanımlanmış ve sapmış: `SessionScope` (`admin/editorial/guest` ↔ `suspicious/privileged/all`), `EvidenceEntry` alanları, `revoke` dönüş tipi | Sözleşme uyumsuzluğu; port yürütücüsüyle çalışma anında hata | Tipleri `web/lib/security/blackout/ports.ts` ve `evidence.ts`'den içe aktarın |
| 7 | RESTRICTED'da araştırma yolu 403, yalnız `/api/arastirma*` ve laboratuvar | Yönetim ve API yazımları kapsanmıyor; durum kodu farklı | Bölüm 4 tablosu; durum `503` + `Retry-After` |
| 8 | Yol karşılaştırması normalize edilmiyor (`url.pathname.startsWith`) | `/API/...`, `%2F`, çift eğik çizgiyle atlatma | `normalizePath` kuralları (BI-02) |

Olumlu: Adaptörler bellek içi durumu dağıtık gibi göstermiyor ve oturum deposu yokken sahte iptal sayısı üretmiyor. Bu ilke bu sözleşmede de esas.
