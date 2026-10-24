# V0.9 bağımsız güvenlik ve yayın hazırlık denetimi

**Denetlenen:** PR #63, `release/v0.9-final-takeover-release-candidate` @ `3c9570a` (1394 dosya, taban `main`). **Dal:** `fix/claude-v09-security-backend-audit`. **Tarih:** 2026-10-24.

**Kapsam dışı:**
- Codex'in lint ve Playwright dosyaları (`web/lib/source-reliability/service.ts` lint satırları, `web/e2e/**`, `web/playwright*.ts`).
- Antigravity UI bileşenleri.
- İnsan onayları. Hiçbiri sahtelenmedi; hiçbir kalite kapısı gevşetilmedi.

## 1. Release Quality bulgularının sınıflandırılması

Kaynak: CI koşusu 40067906510, `release-quality.json`.

### 303 kritik

| Adet | Kod | Sınıf | Karar |
|---|---|---|---|
| 151 | `published-without-human-review` | **E: İnsan uzman onayı** | Yazılımla kapatılamaz. 151 kaydın teknik `published` etiketi var, doğrulanmış uzman incelemesi 0. |
| 151 | `unauthorized-published-record` | **E: İnsan editör onayı** | Yazılımla kapatılamaz. Ayrı editör onayı 0. |
| 1 | `quality-command-failed` (web-e2e, 20 test) | **T: Teknik / Playwright yapılandırması (Codex)** | Ayrıntı aşağıda. |

**web-e2e kök nedeni:** CI'da varsayılan `playwright.config.ts`, production sunucusu (`npm run start`) başlatıyor. Ancak `testDir: ./e2e` yalnız geliştirmede çalışan spec'leri de içeriyor; örneğin `research-workbench-ui.spec.ts` geliştirme sunucusu ve `MKA_RESEARCH_LAB=1` ister. Production'da laboratuvar **tasarım gereği** 404 döner, bu yüzden test başarısız olur: FORTRESS kapısı doğru çalışıyor. `exhibitions.spec.ts` hataları yalnız `mobile-360x800` projesinde.

Doğru çözüm (Codex): geliştirmeye özel spec'ler kendi config'leriyle koşmalı veya varsayılan config'te `testIgnore` ile dışlanmalı. **Laboratuvar production'da açılmamalıdır.**

### 23 hata

| Adet | Kod | Sınıf | Karar |
|---|---|---|---|
| 1 | `quality-command-failed` (web-lint) | T: Codex | `web/lib/source-reliability/service.ts` 136, 137, 194: `no-explicit-any`. Dokunulmadı. |
| 4 | `broken-route` | **T: denetleyici yanlış pozitifi** | **Düzeltildi** (madde 2.3). `app/api/arastirma-laboratuvari/export/route.ts` vardır; denetleyici yalnız `page.tsx` dosyalarını rota sayıyordu. |
| 9 | `button-without-action` | U: UI / statik analiz | `app/tasarim-sistemi` katalog demo düğmeleri ve `EmptyState`. Antigravity alanı. |
| 9 | `unlabeled-button` | U: çoğu yanlış pozitif | Düğme metni JSX ifadesinden geliyor (`{city}`) veya `Button` bileşeni `children`'ı aktarıyor. Statik denetleyici bunları değerlendiremiyor. Antigravity alanı. |

### 11 uyarı

| Adet | Kod | Sınıf |
|---|---|---|
| 1 + 2 + 1 + 3 | `TARIH_EKSIK`, `HAK_BELIRSIZ`, `INCELEME_HAK`, `TARIH_TAHMINI` | E: içerik/hak; insan kaynak doğrulaması gerekir |
| 2 | `unreferenced-asset` | U: varlık temizliği |
| 1 | `missing-published-content` | E: yayın kaydı yok (doğru durum) |
| 1 | `scheduled-content-not-configured` | Bilgi: zamanlayıcı içeriği yok |

Ayrıca 168 `human-expert-review-required` var (E).

**Özet:**
- İnsan onayı gerektiren (E): 302 kritik + 168 uzman incelemesi + 8 içerik uyarısı.
- Teknik ve bu PR'da düzeltilen: 4 hata.
- Teknik ama başka sahipte: 1 kritik ve 1 hata (Codex).
- UI veya yanlış pozitif (Antigravity): 18 hata ve 2 uyarı.

## 2. Bu PR'daki düzeltmeler

### 2.1 SEC-V09-01: Sergi kamuya açma kapısı sahte onaya açıktı (yüksek, gizli)

`canExposePublicExhibition`, kayıt içi `editorialReview.status: "published"` ve boş olmayan serbest metin `reviewedBy` ile sergiyi kamuya açıyordu. Staging sergileri tam olarak böyle bir beyan taşıyor: `reviewedBy: "Asrın Kemali Araştırma ve Küratörlük Kurulu"`. Doğrulanmış böyle bir insan kurulu yok. Biri bu dosyayı `content/exhibitions/published/` altına `isSyntheticPreview:false` ile kopyalasa, sergi hiçbir doğrulanmış insan kararı olmadan yayına çıkardı.

**Düzeltme:** kamuya açılma, editoryal güven katmanının (Görev 04) yapılandırılmış olmasını (güvenilir kimlik sağlayıcısı + politika) ve doğrulanmış onayı birlikte ister.
- `web/lib/editorial-trust/configuration.ts` tek kaynak; `server.ts` buradan yeniden dışa aktarır.
- Bu repoda sağlayıcı yok, dolayısıyla üretimde hiçbir sergi kamuya açılmaz (fail-closed).
- Bugün `published/` dizini olmadığı için canlı etkisi yoktu.
- Test: `web/tests/v09-security-audit.test.mjs`.

### 2.2 SEC-V09-02: Dışa aktarım CSV'si satırı bozuyordu (orta, yalnız geliştirme)

PR #24 kökenli `csvCell`, önekli hücreleri tırnaklamıyordu: `'=HYPERLINK("x"),y` iki alana bölünüyordu. Ortak `web/lib/research-evidence/csv.ts` modülü eklendi; önekli hücre her zaman tırnaklanır. Başlık satırı değişmedi (Codex'in e2e beklentisi korunuyor). Yanıt başlıklarına `nosniff` ve `noindex` eklendi.

### 2.3 Release checker `route.ts` yanlış pozitifi

`tools/release-check/checker.py`, App Router `route.ts` dosyalarını geçerli bağlantı hedefi olarak tanımıyordu.
- Artık var olan handler'a giden bağlantı geçer; olmayan hedef hâlâ `broken-route` olarak raporlanır (test eklendi).
- Gerçek ağaçta `broken-route` sayısı 4'ten 0'a indi.
- Kapı gevşetilmedi: diğer kurallar ve önem seviyeleri değişmedi.

## 3. Doğrulanan güvenlik sınırları (değişiklik gerekmedi)

| Alan | Durum |
|---|---|
| FORTRESS | `proxy.ts`, `access-contract.ts`, `headers.ts`, `next.config.ts`, health/ready, `security.yml` PR #28 ile **bayt düzeyinde aynı** |
| RBAC | `REGISTERED_ADMIN_SESSION_PROVIDER = null`; `/yonetim` arayüzü yok, proxy 404 döner |
| Editoryal güven | Sağlayıcı ve politika `null`; karar yazımı `not_configured` |
| Veri | 168 formun 168'i `pending`; hiçbir kayıtta sahte `publicationApproval` yok; 167 kaydın `reviewedBy` alanı yapay zekâ/ajan; yayın kaydı 0 |
| Araştırma laboratuvarı | Production'da `MKA_RESEARCH_LAB=1` olsa bile kapalı (sayfa ve export API) |
| Sergiler | Production'da staging hiçbir zaman listelenmez; sentetik önizleme 404 döner |
| Secret taraması (`tools/mka-fortress/secrets.mjs`) | 0 bulgu |
| Bütünlük (`integrity.mjs check`) | Geçti (151 teknik published, 0 insan onaylı) |
| Tedarik zinciri | Geçti; tek orta bulgu: `ci.yml`, `nextjs-ci.yml`, `release-quality.yml` aksiyonları SHA ile sabitlenmemiş (öneri; sahipleri ayrı) |

## 4. Açık kalanlar ve öneriler

1. **Codex:**
   - `service.ts` lint hataları.
   - Varsayılan Playwright config'ten geliştirmeye özel spec'lerin ayrılması.
   - `exhibitions.spec` 360 px hatası.
2. **Antigravity:** 18 düğme bulgusu; çoğu yanlış pozitif, ama `tasarim-sistemi` demo düğmeleri `disabled` veya `aria-label` alabilir.
3. **Orta (bilgi):**
   - `/deneysel/anycoder-audit` ve `/tasarim-sistemi` production'da erişilebilir (`noindex`). E2E testleri bu rotalara bağlı olduğu için kapatılmadı. Yayın öncesi ürün kararı gerekir.
   - `web/lib/source-reliability/service.ts` ve `authority-registry/service.ts` `server-only` işareti taşımıyor. Bugün hiçbir rota bu dosyaları içe aktarmıyor.
4. **Düşük:** `/api/health-integration` `releaseCandidate: "v0.6"` döndürüyor (eski sürüm etiketi).
5. **Yayın kararı:** teknik doğrulama bu PR ile ilerledi, ancak `release_ready=false` doğrudur. Gerçek uzman ve editör onayları gelmeden V0.9 yayına hazır sayılmamalıdır.
