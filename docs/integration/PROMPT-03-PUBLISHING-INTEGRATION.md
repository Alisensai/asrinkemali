# Prompt 03 — yayın motoru entegrasyon kaydı

## Kaynak ve stack

- Çalışma ağacı: `C:\Users\Ali\AsrinKemaliCalisma\codex-v07-publishing-integration`
- Yeni dal: `feature/codex-v07-publishing-integration`
- Gerçek taban: Claude Fortress PR #28 başı `d6c6c282be978754c3fe7ed5f92f7d9629d6132b`.
- PR #28, PR #25'in güncel başı `97d9efd63f35c3d12102df3cefceb3c2d22a34c9` üstüne stack edilmiştir. Bu yüzden #25 düzeltmeleri yeniden uygulanmamış veya gölgelenmemiştir.
- Prompt 01 (`feature/copilot-v07-integration-control-plane`) ve Prompt 02 (`feature/copilot-v07-qa-unification`) uzakta bulunamadı; bu görev onların varlığını varsaymaz.

## İncelenen modüller

| PR | Baş | Sonuç |
|---|---|---|
| #21 Codex yayın motoru | `bfdf7424249985b0940f3a5406ad795937454b8b` | `PublicationRecord`, repository, deterministic draft, Tarihte Bugün ve salt-okunur scheduler bu stack'te mevcuttur. |
| #25 Claude hardening | `97d9efd63f35c3d12102df3cefceb3c2d22a34c9` | Tekrar yayın, future approval, bozuk JSON, HTTPS URL, takvim ve 404 korumaları korunur. |
| #26 Copilot kontrol merkezi | `875bca18eca5e4db1e6e01a2c5d06ad13e670a6e` | Bu stack'te değil; `web/app/yonetim` ve `web/lib/admin-v08` değiştirilmedi. İncelenen review sözleşmesiyle uyumlu salt-okunur adapter üretildi. |
| #28 Claude Fortress | `d6c6c282be978754c3fe7ed5f92f7d9629d6132b` | CSP, kapalı-başarısız erişim, ledger CAS ve güvenlik E2E korunur. |

## Eklenen uygulama yüzeyleri

- `web/lib/publishing-integrations/preflight/publication.ts`: yayın şeması, arşiv `id` ilişkileri, haklar, otomasyon kaynak seti, insan onayı bağımlılığı ve ledger için sınıflandırılmış blocker/warning üreten salt-okunur preflight.
- `web/lib/publishing-integrations/revision.ts`: içerik, kaynakça, hak ve arşiv ilişkilerinin kanonik SHA-256 revizyonu. Bu özet imza veya insan onayı değildir.
- `web/lib/publishing-integrations/adapters/publishing-review-adapter.ts`: gerçek auth/audit olmadığında tüm privileged transition'ları reddeden review adapter.
- `scripts/publishing-integration/preflight.mjs`: ağ isteği yapmayan, JSON veya Markdown üreten dry-run CLI. `--out` yalnız ignored `reports/publishing-integration/` altında yeni bir dosya oluşturabilir; ledger ve içerik köklerine yazamaz.
- `web/lib/publishing/model.ts`: takvimsel olarak imkânsız kaynak erişim tarihini, aşırı büyük gövdeyi ve bozuk nested otomasyon nesnesini güvenle reddeder.

## İnsan onayı ve yayın sınırı

Teknik `published` durumunun insan uzmanı ya da editör onayı olduğu varsayılmaz. `approval.kind = "human"` metni tek başına yetki üretmez. Gerçek kimlik sağlayıcı, revizyona bağlı imza ve kalıcı denetim deposu olmadığı için preflight `AUTH_PROVIDER_UNAVAILABLE` ve `AUDIT_STORE_UNAVAILABLE` blocker'larıyla kapalı-başarısızdır. Bu çalışma gerçek cron, yayın mutasyonu, deploy, DNS, veritabanı veya yeni insan onayı oluşturmaz.

## Gerçek doğrulama

| Komut | Sonuç |
|---|---|
| `npm ci` (root) | geçti, 0 audit bulgusu |
| `npm ci` (`web`) | geçti |
| `npm run typecheck` (`web`) | geçti |
| `npm run lint` (`web`) | geçti |
| `npm test` (`web`) | 72/72 geçti; yeni preflight/ledger/adapter negatif testleri dahil |
| `npm run build` (`web`) | geçti, 163 route üretildi |
| `node scripts/archive/validate.mjs --json` | 168 kayıt, 0 hata, 7 mevcut uyarı |
| `node --test "scripts/archive/tests/*.test.mjs"` | 74/74 geçti |
| `node scripts/publishing-integration/preflight.mjs --now=2026-10-24T10:00:00.000Z --format=markdown` | geçti; 0 ready, 0 yayın mutasyonu |
| Production Playwright (`publishing-platform` + `security/fortress`, port 49303) | 40 geçti, 40 koşullu atlandı (Fortress yalnız tek viewportta çalışır) |
| `python -m unittest discover -s tools/release-check/tests -v` | 129/129 geçti |
| `python tools/release-check/quality_runner.py --web-root web --output-dir release-check-reports/prompt03` | Teknik testler 275 geçti, 0 başarısız; `release_ready=false` (302 kritik insan-onayı bulgusu, 11 uyarı, 168 uzman incelemesi) |
| `npm audit --omit=dev` (`web`) | 0 açık |

Arşiv sayıları kodda sabitlenmedi: validator anlık olarak 151 `published`, 16 `reviewed`, 1 `draft` gösterdi. Bu teknik durumlar insan tarihçi/editör onayı değildir.

## Kalan zorunlu işler

1. Gerçek kimlik sağlayıcı, MFA, insan uzman ve editör için ayrı yetki/aktör doğrulaması.
2. Kalıcı, atomik ledger ve audit store; dosya tabanlı ledger çok kullanıcılı transaction değildir.
3. İnsan kararları ile `computePublicationRevision` özetinin imzalı bağlanması ve içerik değişince stale inceleme süreci.
4. Release-quality kapısındaki insan inceleme bulguları gerçek kişilerce tamamlanmadan `release_ready=false` korunmalıdır.

`docs/publishing-integration/HANDOFF-PROMPT-04.md` bu sözleşmelerin bir sonraki göreve devir notudur.
