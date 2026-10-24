# 03 — Uzman ve editör akışları

İki ayrı insan kararı vardır. Biri diğerinin yerine geçmez.

| Karar | `DecisionKind` | Önerilen rol (etkin değil) | Audit olayı |
|---|---|---|---|
| Tarih uzmanı kaynak incelemesi | `historian_review` | `historian` | `review_accepted_by_trusted_system` / `review_changes_requested` / `review_rejected` |
| Yayın editörü kararı | `publication_editor` | `chief_editor` | `editor_decision_recorded` |

**Kurallar:**
- Editör onayı yalnız aynı revizyonda geçerli bir uzman onayı varsa yazılabilir (`historian_review_required`).
- Aynı aktör aynı revizyonda iki karar türünü veremez.
- Kaydı oluşturan aktör karar veremez.

## İnceleme ekseni (`REVIEW_TRANSITIONS`, `web/lib/editorial-trust/forms.ts`)

```
not_started → pending → assigned → in_progress → submitted → awaiting_identity_verification → awaiting_editor → completed
                 ↑            ↘ changes_requested ↗                  ↘ rejected → pending (yeni tur)
   stale / superseded / invalid : her aşamadan kayıt değişince veya bozuk veride
```

- `rejected → completed` veya `rejected → awaiting_editor` **yasak** (A07). Yeni bir tur `pending`'den başlar.
- Yayın ekseni (`draft → in_review → approved → scheduled → published`, PR #21/#25) değiştirilmedi. İki eksen bağımsızdır.

## PR #15 formlarının sınıflandırması (`classifyLegacyForm`)

| Form | `reviewState` | En yüksek güven sınıfı |
|---|---|---|
| Yok | `not_started` | — |
| Şema dışı | `invalid` | — |
| Hash güncel kayıtla uyuşmuyor | `stale` | `structural_valid` |
| `pending` | `pending` | `structural_valid` |
| `submitted` + `correction_required` | `changes_requested` | `submitted_claim_unverified` |
| `submitted` + `rejected` | `rejected` | `submitted_claim_unverified` |
| `submitted` + `approved` + editör alanı | `awaiting_identity_verification` | `submitted_claim_unverified` |

Formdaki isim ve tarih bir **iddiadır**. Formda kimlik kanıtı olmadığından form `authenticated_actor_required` üstüne çıkamaz.

## Karar geçersizleşmesi

`revoked`, `superseded`, `needs_revalidation`, `expired_by_policy`, `stale`.

- Süre (`approvalValidityMs`) yalnız politika tanımlarsa uygulanır.
- Repoda süre uydurulmadı (`null`); D63 testi her iki durumu sınar.
- Geri çekme (`revokeDecision`) de güvenilir aktör ve politika ister. Üretimde kapalıdır.

**Kamu sayfalarında geri çekme taslağı (uygulanmadı):** karar geçersizleşince yayın kapısı kapanır, scheduler (PR #21/#29) yeni yayını atlar. Zaten yayınlanmış sayfa için ayrı, insan onaylı bir "yayından kaldırma" işlemi gerekir. Otomatik içerik değişikliği yapılmaz.

## Atama ve düzeltme önerisi (`workflow.ts`)

- `planAssignment` yalnız plan üretir (`dryRun: true`). Yazar, diğer karar türüne atanmış kişi ve talep eden atanamaz.
- `CorrectionRequest` varsayılan olarak `dryRun: true`'dur. Eski snapshot'a bağlı öneri `409 stale_snapshot` ile korunur, sessizce uygulanmaz.
- Tarih, `archiveIdentifier`, provenance, kişi ve yer yolları "korumalı" işaretlenir.
