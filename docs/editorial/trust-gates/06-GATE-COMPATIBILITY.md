# 06 — Kapı uyumluluğu (PR #12 / #15 / #21 / #25 / #26 / #29)

## Değiştirilmeyen sözleşmeler

| PR | Sözleşme | Bu görevde |
|---|---|---|
| #12 | `publication_guard.py` kritik bulguları, `quality_runner.py` çıkış kodu, `release-quality.yml` | Dokunulmadı. `if: always()`, `continue-on-error`, `\|\| true` eklenmedi. F87 testi PR #12'nin hâlâ engel ürettiğini doğrular. |
| #15 | Form şeması 1.0.0, `record_snapshot_sha256`, `audit_ledger.py` | Dokunulmadı. Node hash'i 168/168 eşleşir. F88: CLI çalıştıktan sonra form dizini özeti aynı, `validate-forms` 0 çıkış verir. |
| #21 / #25 | Yayın ekseni, scheduler dry-run, yeniden yayın engeli | Dokunulmadı. Mevcut testler (`publishing-platform`, `publishing-hardening`, `security-publishing`) regresyonda koşuldu (09). |
| #26 | Roller, `getCurrentAdminSession() → null` | Aynı rol dizgileri kullanıldı. Admin dosyalarına dokunulmadı. |
| #29 | `computePublicationRevision`, `runPublicationPreflight({ hasVerifiedHumanApproval, hasAuditStore })`, fail-closed adapter | Makale revizyonu doğrudan buradan alınır. `hasVerifiedHumanApproval(readiness)` köprüsü preflight'a verilir (web testi). |

## Bulgu kodu eşlemesi

**PR #12 → güven kodu** (`PR12_COMPATIBILITY`, `policy.ts`):

| PR #12 | Güven kodu |
|---|---|
| `published-without-human-review`, `human-expert-review-required` | `missing_historian_review` |
| `unauthorized-published-record`, `unauthorized-scheduled-publication`, `schedule-publishes-unapproved-record` | `missing_editor_approval` |
| `approval-after-schedule` | `approval_timestamp_invalid` |
| `unpublishable-rights-status`, `missing-rights-status` | `rights_unclear` |
| `published-ai-representation` | `ai_representation_as_original` |
| `missing-catalog-provenance`, `source-not-in-provenance` | `evidence_location_missing` |
| `duplicate-catalog-record` | `duplicate_record_id` |
| `invalid-catalog-date`, `invalid-publication-json` | `schema_invalid` |

**PR #29 → güven kodu** (`PR29_COMPATIBILITY`, `publication-gate.ts`):

| PR #29 | Güven kodu |
|---|---|
| `HUMAN_APPROVAL_UNVERIFIED` | `missing_editor_approval` |
| `AUTH_PROVIDER_UNAVAILABLE` | `credential_provider_unavailable` |
| `AUDIT_STORE_UNAVAILABLE` | `audit_chain_invalid` |
| `APPROVAL_REVISION_STALE` | `stale_record_snapshot` |
| `ARCHIVE_REFERENCE_MISSING`, `PUBLICATION_INVALID` | `schema_invalid` |
| `ARCHIVE_REFERENCE_DUPLICATE` | `duplicate_record_id` |

## Çift sayım kuralı

- Güven raporu her kaydı ve her kodu **bir kez** sayar.
- Kayıttan bağımsız bulgular (kimlik sağlayıcısı, audit deposu, yinelenen kayıt, yetim form, okunamayan dosya) `globalFindings` altında **ayrı** listelenir.
- PR #12 aynı kayıt için iki ayrı kritik kod üretir (151 + 151 = 302). Güven raporu bunları iki ayrı kapı olarak gösterir: `missing_historian_review` ve `missing_editor_approval`. F87 testi bu iki sayının PR #12 ile birebir eşleştiğini doğrular.
- Güven raporunda bu iki kod 168'er adettir. Fark, `reviewed` ve `draft` kayıtlardan gelir: PR #12 bu kayıtları yalnız `expert_review` olarak sayar, güven raporu ise her kaydın kapısını gösterir.

## Kapsam ve hedef kayıt türü

- `archive_record`: 168 gerçek kayıt.
- `publication_record`: bu tabanda 0 kayıt.
- `exhibition_record`: yalnız sözleşme düzeyinde. PR #27 bu tabanda yok.
