# PR #72 CSP düzeltmesi: güvenlik incelemesi (Claude)

- **PR:** https://github.com/Alisensai/asrinkemali/pull/72
- **Dal / commit:** `feature/codex-v11-application-security` @ `58548d3` → `integration/asrinkemali-v11-fortress-x`
- **Değişen dosyalar:** `web/lib/security/headers.ts`, `web/tests/security-headers.test.mjs`
- **İnceleme tarihi:** 2026-10-24
- **Karar (kullanıcı, 2026-10-24):** **Entegrasyona ALINMAYACAK.** Önce production `report-only` riski kapatılmalı: zorunlu `Content-Security-Policy` hiçbir production modunda kaldırılmamalı. Düzeltilmiş commit ve teknik CI kontrolleri doğrulandıktan sonra karar yeniden değerlendirilecek.

## PR'ın düzelttiği

| Production ortamı | Önce | PR #72 sonrası |
|---|---|---|
| `ASRIN_CSP_MODE` yok / `enforce` | Zorunlu CSP | Zorunlu CSP |
| `ASRIN_CSP_MODE=off` | **CSP tamamen kalkıyordu** | Zorunlu CSP (fail-closed) ✅ |
| `OFF`, `Report-Only` (büyük harf varyantı) | Zorunlu CSP | Zorunlu CSP |
| `NODE_ENV` tanımsız + `off` | CSP kalkıyordu | Zorunlu CSP ✅ |

PR'ın kendi testleri yerelde 5/5 geçti. Değişiklik doğru ve kapsamı dar.

## Kalan risk: production'da `report-only`, CSP'yi zorunlu uygulamıyor

| Production ortamı | Zorunlu `Content-Security-Policy` | `Content-Security-Policy-Report-Only` | Raporlama uç noktası |
|---|---|---|---|
| `ASRIN_CSP_MODE=report-only` | **YOK** | Var | **YOK** (`report-uri`/`report-to` tanımlı değil) |

Yerel doğrulama: PR'ın `headers.ts` dosyası üzerinde `headerOptionsFromEnv({ NODE_ENV: "production", ASRIN_CSP_MODE: "report-only" })` çalıştırıldı.

- **Etki:** Tek bir ortam değişkeni, production'da XSS, betik enjeksiyonu, dış kaynaktan betik/bağlantı, `<base>` ele geçirme ve form hedefi değiştirmeye karşı savunma katmanını kaldırıyor.
  - Report-only başlığı ihlali engellemez.
  - Raporlama uç noktası olmadığı için ihlal **görünmez** de olur.
  - Pratikte PR #72'nin kapattığı `off` açığıyla aynı sonucu doğurur.
- **Önem:** Orta/yüksek (savunma derinliği). React kaçışlama ve `dangerouslySetInnerHTML` yokluğu birincil XSS korumasını sürdürüyor. Ancak CSP, bunların atlatıldığı durumda son katman.
- **Önerilen düzeltme** (Codex, `headers.ts`):
  1. Production'da report-only **zorunlu politikanın yerine geçmemeli, onun yanına eklenmeli**. Yani `report-only` modunda production hem `Content-Security-Policy` hem de (aday katı politika için) `Content-Security-Policy-Report-Only` göndermeli. Report-only'nin tek başına kullanımı yalnız `NODE_ENV=development`'ta olmalı.
  2. Report-only'nin anlamı olması için raporlama uç noktası (`report-to` + `Reporting-Endpoints`) gerekiyor. Bu bir altyapı gereksinimi (SIEM/merkezi günlük, matris #6, #21). Uç nokta yokken report-only yalnız gözlemsiz bir başlıktır.
  3. Test: `NODE_ENV=production, ASRIN_CSP_MODE=report-only` → `Content-Security-Policy` başlığı **var** olmalı.

## CI durumu (head `58548d3`, tamamlandı)

| Workflow | Sonuç |
|---|---|
| Next.js CI (verify-next-app: lint, typecheck, build, production Playwright) | ✅: 753 geçti, 117 atlandı, 0 başarısız |
| MKA FORTRESS security (fortress-tools, production-security-e2e) | ✅ |
| Asrin Kemali CI (smoke) | ✅ |
| Release quality | ❌: 1458 test geçti, 0 başarısız. Kapı yalnız 302 insan onayı bulgusu nedeniyle kırmızı; teknik hata değil. |

**Sonuç:** CI teknik olarak yeşil. PR #72 `off` açığını kapattığı için güvenliği kesin olarak iyileştiriyor. Production `report-only` riski ise açık kalıyor. Ortak entegrasyon dalına alma kararı kullanıcıya bırakıldı. Önerilen sıra: PR #72 alınsın ve report-only düzeltmesi Codex'ten ayrı PR olarak istensin, ya da aynı PR'a eklensin.

## Yeniden inceleme: düzeltilmiş commit `042af19`

Codex, `report-only` riskini `042af19` ile kapattı: `fix(security): preserve enforced CSP with report-only`.

- **Değişiklik:** `securityHeaders` içinde `if (!development || mode === "enforce")` ile development dışında zorunlu `Content-Security-Policy` her zaman gönderiliyor. `report-only` modunda `Content-Security-Policy-Report-Only` yalnız **ek** başlık. Kural fonksiyonun içinde olduğundan `headerOptionsFromEnv` atlanıp `securityHeaders({ mode: "off" | "report-only", development: false })` doğrudan çağrılsa bile CSP kalkmıyor.
- **Yerel doğrulama:**
  - PR testleri 5/5.
  - `NODE_ENV` yok / `production` / `test` / boş × `ASRIN_CSP_MODE` yok / `enforce` / `off` / `report-only` / `OFF` / `Report-Only` / geçersiz, artı 3 doğrudan çağrı: development dışındaki **31 kombinasyonun 31'inde zorunlu CSP var**. Kalktığı durum yok.
  - Development'ta `off`/`report-only` yerel çalışma için korunuyor.
- **Açık kalan (kapsam dışı, düşük):** Raporlama uç noktası (`report-to`) hâlâ yok. Report-only başlığı gözlem verisi üretmiyor ama artık korumayı da kaldırmıyor. Altyapı gereksinimi (#6 SIEM, #21 merkezi günlük).

| Workflow (head `042af19`, push + pull_request) | Sonuç |
|---|---|
| Next.js CI (verify-next-app: lint, typecheck, build, production Playwright) | ✅ ✅: 753 geçti, 117 atlandı, 0 başarısız |
| MKA FORTRESS security | ✅ ✅ |
| Asrin Kemali CI (smoke) | ✅ ✅ |
| Release quality | ❌ ❌: 1458 test geçti, 0 başarısız. Yalnız 302 insan onayı bulgusu; teknik hata değil. |

**Yeniden değerlendirme:** Teknik engel kalmadı. Kullanıcının koşulu ("zorunlu CSP hiçbir production modunda kaldırılmamalı") kod ve testle sağlanıyor. Entegrasyon dalına alma onayı kullanıcıdan bekleniyor.
