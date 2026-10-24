# 05 — Rol / işlem matrisi

Roller PR #26 ile aynı dizgilerdir. **Repoda etkin politika yoktur** (`ACTIVE_EDITORIAL_POLICY = null`), bu yüzden bugün her yazma işlemi `policy_unconfigured` döner. Aşağıdaki tablo `RECOMMENDED_DECISION_ROLES` önerisidir; etkinleştirmek insan kararıdır.

| İşlem | system_admin | chief_editor | historian | content_editor | researcher | readonly_auditor |
|---|---|---|---|---|---|---|
| Rapor/DTO okuma (gelecek UI) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `historian_review` kararı | ✗ | ✗ | ✓* | ✗ | ✗ | ✗ |
| `publication_editor` kararı | ✗ | ✓* | ✗ | ✗ | ✗ | ✗ |
| Karar geri çekme | ✗ | ✓* (editör kararı) | ✓* (uzman kararı) | ✗ | ✗ | ✗ |
| Audit karar olayı | Yalnız doğrulanmış aktör. `researcher` ve `readonly_auditor` karar olayı üretemez (`decision_role_forbidden`). | | | | | |

\* Yalnız şu koşulların hepsi sağlanınca:
- güvenilir sağlayıcıdan çözülmüş, süresi dolmamış oturum;
- etkin politika;
- yazar ya da diğer karar türünün sahibi olmama;
- güncel snapshot belirteci.

`system_admin` hiçbir uzmanlık kararını otomatik almaz (B26). `content_editor`, politika açıkça izin vermedikçe tarih uzmanı yerine geçemez (B27).

## Hata → HTTP eşlemesi (`decisions.ts`)

| Hata | HTTP |
|---|---|
| `not_configured`, `policy_unconfigured`, `test_provider_forbidden_in_production` | 503 |
| `identity_unavailable`, `session_invalid`, `session_expired`, `actor_not_server_resolved` | 401 |
| `unknown_role`, `role_not_permitted`, `conflict_of_interest_author`, `separation_of_duties` | 403 |
| `subject_not_found` | 404 |
| `revision_token_required`, `stale_snapshot`, `revision_conflict`, `idempotency_key_conflict`, `historian_review_required` | 409 |
| `invalid_request`, `untrusted_identity_field` | 400 |
| `partial_write_requires_reconciliation`, `write_failed` | 500 |

Bu görevde HTTP route **eklenmedi**. Eşleme, Görev 14 (Control Center) route'u yazıldığında bilgi sızdırmadan kullanılmak içindir.
