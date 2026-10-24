# V1.0 backend, güvenlik ve entegrasyon denetimi

- **Taban:** `release/v0.9-final-takeover-release-candidate` @ `2f0a2a010a2e51ceac12bd3d9b0ae5e8bda1a581` (GitHub'da doğrulandı; `3c9570a` üzerine tek Antigravity commit'i).
- **Dal:** `fix/claude-v10-backend-security-integration`.
- **Tarih:** 2026-10-24.

İnsan onayı sahtelenmedi. Doğrulama kapıları kaldırılmadı. Release gate sonucu manipüle edilmedi. Copilot/Codex'in Playwright, e2e ve workflow dosyalarına ve Antigravity'nin görsel bileşenleri ile CSS'ine dokunulmadı.

## A. PR #64 / #65 / `2f0a2a0` entegrasyon denetimi

| Dosya | Durum | Karar |
|---|---|---|
| `web/lib/source-reliability/service.ts` | `2f0a2a0` (Antigravity), PR #64 (Codex) ile işlevsel olarak eşdeğer düzeltmeyi içeriyor: kategori/önem enum doğrulaması, aday tip koruması | **Yeniden uygulanmadı.** PR #64 fiilen aşıldı. Küçük fark: HEAD'de isteğe bağlı aday alanları (`url`, `sourceId`) string olarak doğrulanmıyor (veri repo içi sabit dosyadan geliyor; öneri). |
| `tools/release-check/checker.py` (`route.ts`) | `2f0a2a0`, PR #65'in `route.ts` düzeltmesiyle eşdeğer | HEAD sürümü korundu. #65'in iki testi (var olan ve olmayan handler) eşdeğerliği doğruluyor. |
| `tools/release-check/checker.py` (`href`) | `2f0a2a0`, `href` niteliğini her düğmede eylem sayıyordu. Yerel `<button href>` HTML'de hiçbir şey yapmaz; kapı bunu kaçırıyordu (yanlış negatif). | **Daraltıldı:** `href` yalnız tasarım sistemi `<Button>` bileşeninde eylem sayılır. Bileşen `Link` render ettiği için bu geçerlidir. Test eklendi. Gerçek ağaçta bulgu 0 kaldı. |
| PR #65 güvenlik düzeltmeleri | Sürüm dalında yoktu | **Aktarıldı** (`cherry-pick -x`): sergi yayın kapısı, `csv.ts`, `configuration.ts`, testler, V0.9 denetim raporu. |

## B–D. Bulgular ve düzeltmeler

| Kimlik | Önem | Bulgu | Düzeltme |
|---|---|---|---|
| SEC-V09-01 (aktarıldı) | Yüksek (gizli) | Sergi, kayıt içi `status:"published"` ve serbest metin `reviewedBy` ile kamuya açılabiliyordu | Güvenilir kimlik sağlayıcısı + politika + doğrulanmış onay şart |
| **SEC-V10-01** | Yüksek (gizli) | **Yayınlarda aynı örüntü:** `approval:{kind:"human", approvedBy:"<serbest metin>"}` taşıyan bir kayıt `/yayinlar`'da "Editör onaylı" bölümünde ve site haritasında görünürdü | `isPubliclyVisible` aynı güven bağlamını ister. Deponun `filter(isPubliclyVisible)` çağrısı dizini güven parametresi olarak geçiriyordu; düzeltildi. Bugün yayın kaydı 0, canlı etki yoktu. |
| SEC-V09-02 (aktarıldı) | Orta | Dışa aktarım CSV'sinde önekli hücre tırnaksızdı | `csv.ts` |
| **SEC-V10-02** | Orta (derinlemesine savunma) | Okuma listesi `isSafeUrl` yasak listesiydi; `java\tscript:` ve `\u0001javascript:` geçiyordu. İçe aktarılan JSON'daki URL `ArchiveRecordCard` içinde `href` olur. React 19 render anında `javascript:` adresini engelliyor, ama doğrulayıcı atlatılabiliyordu. | FORTRESS `lib/security/safe-url.ts` izin listesi: yalnız site içi `/yol` veya kullanıcı bilgisi içermeyen `http(s)` |

Testler: `web/tests/v10-backend-security.test.mjs` (6 test) ve `v09-security-audit.test.mjs` (5 test). V10 testlerinin 4'ü düzeltmeler olmadan HEAD'de kırmızı; diğer 2'si mevcut doğru davranışı sabitliyor.

### Doğrulanan alanlar (değişiklik gerekmedi)

1. **FORTRESS:** proxy, access-contract, headers ve `next.config` PR #28 ile aynı. Production sunucusunda CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy ve Permissions-Policy başlıkları görüldü.
2. **RBAC / Control Center:** `REGISTERED_ADMIN_SESSION_PROVIDER = null`. `/yonetim`, `/yonetim/incelemeler`, `/admin`, `/panel`, `/api/admin` production'da 404.
3. **Editoryal onay:** sağlayıcı ve politika `null` (tek kaynak `configuration.ts`). 168 formun 168'i `pending`. Hiçbir kayıtta sahte onay yok.
4. **Sergi kapısı:** production'da staging listelenmiyor. `/sergiler/cumhuriyetin-ilani` ve `/sergiler/milli-mucadele-ve-meclis` 404.
5. **Staging/production:** araştırma laboratuvarı ve export API, `MKA_RESEARCH_LAB=1` ile bile 404 (gövde yalnız `{"error":"not found"}`).
6. **API:** health, ready ve health-integration salt-okunur. Export biçimi izin listeli (bilinmeyen → 400).
7. **XSS / path traversal / CSV:** `dangerouslySetInnerHTML` yok. `/arsiv/..%2f..%2f…` 404. CSV korumalı.
8. **Gizli anahtar:** `tools/mka-fortress/secrets.mjs` 0 bulgu. Kodda haricî AI anahtarı yok. Qwen/DeepSeek adaptörleri `isAvailable()=false` döner ve yerel belirlenimci yedeğe düşer.
9. **Kaynak / lisans:** `integrity.mjs check` geçti. Arşiv etiketi "Kaynak denetimli · uzman onayı bekliyor"; onaylı gibi gösterilmiyor (test).
10. **Dosya sistemi:** source-reliability ve authority-registry servisleri sabit yollardan salt-okunur. Hiçbir rota bu servisleri içe aktarmıyor.

### Modül bağlantı durumu (Görev C)

| Modül | Rota/bileşen bağlantısı | Not |
|---|---|---|
| Reading Lists | Bağlı (`/okuma-listem`) | İçe aktarma: boyut, prototip ve URL koruması |
| Evidence Workbench | Bağlı; production'da kapalı | — |
| Exhibitions | Bağlı | Güven kapısı |
| Publishing | Bağlı | Güven kapısı (SEC-V10-01) |
| Explore UI (`/kesfet`) | Bağlı | Yerel öneri/arama; haricî model yok ve öyle gösteriliyor |
| Search V2, Recommendations, Authority Registry, Source Reliability, Editorial Trust, Admin v08, Publishing Integrations | **Hiçbir rota/bileşen kullanmıyor** | Yalnız kütüphane ve testler. "Çalışıyor" iddiası yok; bağlantı ilgili sahiplerin işi. |
| Cohere search evaluation, Historical Research | Araç (`tools/`) | Testler geçti |

## Çözülemeyen güvenlik ve yayın engelleri

1. **Sahte güven rozeti (Antigravity, görsel bileşen):** şu dosyalar `SourceInspector`'a sabit `isVerified: true` geçiriyor ve her sergi kaynağında "DOĞRULANMIŞ KAYNAK" yazıyor; sentetik staging dahil:
   - `web/components/exhibitions/DocumentShowcase.tsx:41`
   - `ExhibitionSectionRenderer.tsx:145,239`
   - `ExhibitionTimeline.tsx:70`
   - `VirtualGalleryRoom.tsx:253,345`

   Görsel bileşen kısıtı nedeniyle değiştirilmedi. Production'da hiçbir sergi kamuya açılamadığı için bugün dışarı yansımıyor; **sergi yayını açılmadan önce düzeltilmesi zorunlu.**
2. **`TextLink.isSafeUrl`** (`web/components/design-system/TextLink.tsx`): aynı yasak listesi zayıflığı. Görsel bileşen; `lib/security/safe-url.ts` kullanılmalı (Antigravity).
3. **İnsan onayı:** 151 teknik `published` kayıt için uzman ve editör onayı 0. `release_ready=false` doğru durum.
4. **Kimlik altyapısı:** gerçek kimlik sağlayıcısı (OIDC/MFA), editoryal politika ve kalıcı karar/audit deposu yok. Hiçbir yayın, sergi veya yönetim kararı açılamaz (kullanıcı kararı gerekir).
5. **Öneriler:**
   - `/deneysel/anycoder-audit` ve `/tasarim-sistemi` production'da 200 dönüyor (`noindex`); yayın kararı gerekir.
   - `ci.yml`, `nextjs-ci.yml` ve `release-quality.yml` aksiyonları SHA ile sabitlenmeli (workflow sahipleri).
   - `/api/health-integration` `releaseCandidate: "v0.6"` döndürüyor.
