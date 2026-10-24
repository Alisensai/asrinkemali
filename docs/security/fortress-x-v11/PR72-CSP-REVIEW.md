# PR #72 CSP düzeltmesi: güvenlik incelemesi (Claude)

- **PR:** https://github.com/Alisensai/asrinkemali/pull/72
- **Dal / commit:** `feature/codex-v11-application-security` @ `58548d3` → `integration/asrinkemali-v11-fortress-x`
- **Değişen dosyalar:** `web/lib/security/headers.ts`, `web/tests/security-headers.test.mjs`
- **İnceleme tarihi:** 2026-10-24
- **Karar:** **Entegrasyona alınmadı.** CI tamamlanmadı (aşağıda). Ayrıca `report-only` riski kapatılmadan alınmaması önerilir.

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
  2. Report-only'nin anlamı olması için raporlama uç noktası (`report-to` + `Reporting-Endpoints`) gerekiyor. Bu bir altyapı gereksinimi (SIEM/günlük deposu, matris #11, #96). Uç nokta yokken report-only yalnız gözlemsiz bir başlıktır.
  3. Test: `NODE_ENV=production, ASRIN_CSP_MODE=report-only` → `Content-Security-Policy` başlığı **var** olmalı.

## CI durumu (head `58548d3`, inceleme anı)

| Workflow | Sonuç |
|---|---|
| MKA FORTRESS security (fortress-tools, production-security-e2e) | ✅ ✅ |
| Asrin Kemali CI (smoke) | ✅ |
| Next.js CI (verify-next-app) | ⏳ Sürüyor |
| Release quality | ⏳ Sürüyor. Tamamlansa da 302 insan onayı bulgusu nedeniyle kırmızı kalması beklenir; bu teknik bir hata değil. |

CI doğrulanmadan PR #72 entegrasyon dalına alınmadı.
