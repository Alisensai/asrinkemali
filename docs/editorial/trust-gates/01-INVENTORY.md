# 01 — Envanter ve taban

**Tarih:** 2026-10-24. **Dal:** `feature/claude-v07-editorial-trust-gates`.

## Taban seçimi

| Aday | Durum | Karar |
|---|---|---|
| Prompt 03 → PR #29 `feature/codex-v07-publishing-integration` @ `296da528eb` | Açık taslak. Teknik CI yeşil (smoke, verify-next-app, fortress-tools, production-security-e2e). `release-quality` yalnız insan onayı eksikliğiyle kırmızı. İçinde `docs/publishing-integration/HANDOFF-PROMPT-04.md` var. | **Seçildi.** Görev metni "en son doğrulanmış Prompt 03 dalı" diyor. |
| Prompt 01 → PR #33 (Claude) @ `f3da6df8dc` | Açık taslak | İlk taslak bu tabandı; Prompt 03 bulununca taşındı. Henüz commit yoktu, kayıp yok. |
| PR #22 (V0.6) @ `10cdbfd70e` | Açık taslak | Yedek; gerekmedi |

#29'un zinciri: V0.6 → #25 (hardening) → #28 (Fortress) → #29. Bu PR bu yüzden **#29'a** hedeflenir. Ana dala veya V0.6'ya doğrudan gitmez.

## İncelenen modüller (salt-okunur)

| PR | Dosya | Bu görevle ilişkisi |
|---|---|---|
| #12 | `tools/release-check/publication_guard.py`, `quality_runner.py`, `.github/workflows/release-quality.yml` | Kritik bulguları üretir: published-without-human-review, unauthorized-published-record. **Değiştirilmedi.** Uyum eşlemesi `PR12_COMPATIBILITY` içinde; F87 testi sayımları birebir karşılaştırır. |
| #15 | `tools/editorial-review/editorial_review.py`, `review-form.schema.json` (1.0.0), `audit_ledger.py`, `approval-event.schema.json`, `docs/editorial/forms/*.json` (168) | `record_snapshot_sha256` = kaydın tamamının Python kanonik JSON'unun SHA-256'sı. Node karşılığı 168/168 eşleşir. Formlar ve ledger doğrulayıcısı **değiştirilmedi**. |
| #21 / #25 | `web/lib/publishing/{model,scheduler,repository}.ts` | Yayın ekseni: draft → in_review → approved → scheduled → published. **Yeniden tanımlanmadı.** İnceleme ekseni ayrıdır. |
| #29 (Prompt 03) | `web/lib/publishing-integrations/*` (preflight, `computePublicationRevision`, fail-closed `PublishingReviewAdapter`) | Makale revizyonu için **tek otorite** olarak kullanılır. Kopya mantık yok. |
| #26 / #31 (Copilot) | `web/lib/admin-v08/{access-control,auth}.ts` (dalda; bu tabanda yok) | Roller aynı dizgilerle kullanıldı. `getCurrentAdminSession()` → `null` korunur. Hiçbir admin dosyasına dokunulmadı (Görev 14 / Copilot sınırı). |
| #27 (Antigravity) | `web/lib/exhibitions/workflow.ts` (dalda) | Sergi motoru çekilmedi. Yalnız `SubjectReadinessAdapter` sözleşmesi tanımlandı. |

## Gerçek veri (bu tabanda, dinamik ölçüm)

| Ölçüm | Değer |
|---|---|
| Arşiv kaydı (`data/archive/catalog` + `content/archive/records`) | 168 (150 + 18) |
| Teknik etiket | 151 `published` / 16 `reviewed` / 1 `draft` |
| İnceleme formu | 168. Tamamı `pending`; 0 stale, 0 geçersiz, 0 yetim |
| Makale kaydı (`content/publications/records`) | 0 |
| Editoryal audit ledger | Repoda yok |
| Güvenilir kimlik sağlayıcısı / etkin politika / kalıcı karar deposu | Yok |

## Meta veri kaybı riski

- PR #15 formları yalnız 7 alanlık `record_snapshot` taşır; hash ise kaydın tamamını kapsar. Bu yüzden `verification` ya da `updatedAt` değişikliği bile formu stale yapar.
- Yeni v2 algoritması (`nfc-policy-sha256-v2`) inceleme sürecinin değiştirdiği alanları hash dışında tutar: `verification`, `publicationApproval`, `updatedAt`. v1 hash'i ise PR #15 uyumu için olduğu gibi korunur.
