# 08 — Audit olayları ve bütünlük sınırları

**Şema:** `editorial-trust-audit/1` (`web/lib/editorial-trust/audit.ts`). PR #15'in `audit_ledger.py` doğrulayıcısı ve `approval-event.schema.json` değiştirilmedi. İki zincir ayrıdır.

## Olay türleri

`review_requested`, `review_assigned`, `review_opened`, `review_note_added`, `review_changes_requested`, `review_submitted_claim`, `actor_verified`, `review_accepted_by_trusted_system`, `review_rejected`, `editor_decision_requested`, `editor_decision_recorded`, `approval_revoked`, `record_changed`, `snapshot_stale_detected`, `publication_gate_evaluated`, `publication_attempt_denied`.

## Olay gövdesi

**Alanlar:**
- `sequence`, `eventId`, `idempotencyKey`, `type`, `timestamp`, `requestId`
- `actorId`, `actorRole`, `actorVerified`
- `subjectType`, `recordId`, `snapshotHash`, `decisionRef`
- `payload`, `payloadDigest`, `prevHash`, `hash`

**Yazılmayanlar:**
- `displayName` (kimlik değildir; B31)
- IP, user agent, token, parola, TC kimlik numarası (E74). Hassas anahtar adları yazma anında reddedilir, doğrulamada bulgu üretir.

**Boyut:** payload sınırı 8 KiB (`MAX_AUDIT_PAYLOAD_BYTES`).

## Doğrulama (`verifyAuditChain`)

Kontroller:
- şema;
- sıra (`invalid_sequence`);
- `prevHash` (`broken_prev_hash`);
- olay hash'i (`event_hash_mismatch`);
- payload digest;
- katı zaman: geçerli takvim, saat dilimi, geleceğe ait olmama, ters sıra yasağı;
- tür ve konu enum'ları;
- rol enum'u;
- karar olayları için doğrulanmış aktör (`decision_without_verified_actor`), yasak rol (`decision_role_forbidden`), revizyon bağı (`decision_without_revision_link`);
- payload boyutu;
- hassas alan;
- yinelenen `eventId`;
- idempotency anahtarı: aynı içerikle tekrar `duplicate_idempotent_event`, farklı içerikle `idempotency_key_conflict`.

| Zayıflık | Durum |
|---|---|
| İlk olay eksik | Yakalanır: ikinci olayın `prevHash`'i genesis değil |
| Ortadan olay silinmesi | Yakalanır: sıra ve `prevHash` kırılır |
| Sıranın ters dönmesi | Yakalanır |
| Tek olayın düzenlenmesi | Yakalanır: hash uyuşmaz |
| **Zincirin tamamen yeniden yazılması** | **Kendi içinde tutarlı görünür.** Yalnız harici çapa (`anchor: { sequence, hash }`) yakalar. Repoda harici çapa veya imzalı/değiştirilemez depo **yok**. |
| Son olayların kesilmesi (truncation) | Harici çapa yoksa yakalanmaz |
| Aktörün gerçekten o kişi olduğu | `identityAuthenticityProven: false`. Hash zinciri imza değildir. |

**Bütünlük seviyesi:** `hash_chain_tamper_evident` (çapa verilirse `hash_chain_with_external_anchor`). Sahte imza veya yerel özel anahtar üretilmedi.

## İdempotency ve transaksiyon

- Aynı istek iki kez gelirse ikinci yanıt `replayed: true` olur, yeni olay yazılmaz (C46).
- Eşzamanlı iki farklı karar: biri `revision_conflict` alır (C43). Audit CAS ile `expectedPrevHash`, karar deposu `expectedCount` kullanır.
- Audit yazıldı ama karar yazılamadıysa `partial_write_requires_reconciliation` döner. Aynı anahtarla tekrar denemede de aynı hata gelir ve uzlaştırma ister (C-partial). **Üretim gereksinimi:** audit ve karar tek transaksiyonda (veya outbox deseniyle) yazılmalıdır.
