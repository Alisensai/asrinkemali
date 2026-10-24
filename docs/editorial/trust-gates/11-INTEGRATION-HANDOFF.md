# 11 — Entegrasyon devri ve dosya sahipliği

## Bu görevin sahip olduğu yollar (yalnız ekleme)

- `web/lib/editorial-trust/`: saf model, politika, kimlik çözücü, audit, karar servisi, DTO, Prompt 03 köprüsü, `server.ts` (server-only).
- `web/tests/editorial-trust.test.mjs`
- `tools/editorial-trust/`: CLI, okuyucu, rapor, bench, testler, yalnız-test yardımcıları.
- `docs/editorial/trust-gates/`
- `.github/workflows/editorial-trust.yml`: çevrimdışı, salt-okunur, ayrı iş akışı.

**Değiştirilen mevcut dosya: yok.** `tools/editorial-review/`, `tools/release-check/`, `release-quality.yml`, `web/lib/publishing*`, admin, CSS, `/sergiler` ve Atatürk deneyimi dosyalarına dokunulmadı.

## Devir notları

**Prompt 05:** Rol/oturum sözleşmesi olarak `TrustedIdentityProvider` + `ProviderSession` kullanılmalı.
- Sağlayıcı `testOnly` olmamalı.
- `provider.id` oturumdaki `provider` ile eşleşmeli.
- `expiresAt` zorunlu.
- `displayName` kimlik değildir.

**Prompt 14 (Copilot, Control Center):**
- `/yonetim/incelemeler` için `toReviewQueueItem(...)` DTO'su hazır. Dosya yolu, hash, oturum veya aktör kimliği taşımaz.
- Route yazılırken `createDecisionService` ve `parseDecisionRequest` kullanılmalı; hata → HTTP eşlemesi 05-ROLE-AUTH-MATRIX'te.
- **Bilinen engel:** #28 proxy'si `/yonetim`'i 404'ler (Görev 01 provası). Panel sayfası ile proxy kararı önce verilmeli.
- Bu görev `web/lib/admin-v08/*` dosyalarını değiştirmedi; eşzamanlı düzenleme yok.

**Prompt 03 / Codex (PR #29):**
- `runPublicationPreflight(record, { hasVerifiedHumanApproval: hasVerifiedHumanApproval(await gate.readinessFor("publication_record", id)), hasAuditStore })`
- Makale revizyonu `computePublicationRevision` olarak kalır (tek otorite).

**Antigravity (PR #27):**
- Sergi motoru `SubjectReadinessAdapter` uygulayabilir.
- `evaluateExhibitionReviewReadiness` sergi için **kendi** kararlarını ister. Arşiv kararları ödünç alınamaz.
- Arşiv kimlikleri `archiveRecordIds` alanından okunur (`archiveIdsField` ile değiştirilebilir).

**Görev 15 (backend):**
- `ReviewDecisionRepository` ve `AuditEventSink` için transaksiyonlu kalıcı uygulama (outbox) gerekir.
- Bellek içi sahte uygulamalar yalnız `tools/editorial-trust/tests/helpers/fakes.mjs` içindedir.

## Çakışma riskleri

| Dosya/alan | Risk | Not |
|---|---|---|
| `web/lib/publishing-integrations/revision.ts` | Düşük | Yalnız içe aktarılır. İmzası değişirse makale kararları bayatlar; bu bilinçli bir bağdır. |
| `schemas/*.types.ts` | Yok | Yalnız tip içe aktarımı |
| Task manifesti (`tools/integration-control/src/tasks.mjs`, PR #33) | Düşük | Orada Görev 04'ün yolları `tools/approval-gates/`, `web/lib/approval/` olarak tahmin edilmişti. Gerçek yollar bu belgede. #33 ayrı tabanda olduğu için bu PR'da güncellenmedi. |
