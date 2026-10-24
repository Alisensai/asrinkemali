# Editoryal güven kapıları (V0.7, Görev 04)

Bu yazılım **insan kararı vermez**. İnsan kararları henüz yokken yayını engeller. Gerçek kararlar ancak güvenilir kimlik, etkin politika ve kalıcı audit birlikte varsa ve yalnız güncel revizyona bağlı olarak kaydedilebilir.

| Belge | İçerik |
|---|---|
| [01-INVENTORY](01-INVENTORY.md) | Taban seçimi (PR #29), incelenen modüller, gerçek veri |
| [02-THREAT-MODEL](02-THREAT-MODEL.md) | Güven sınırları, saldırgan senaryoları, kalan riskler |
| [03-STATE-MACHINES](03-STATE-MACHINES.md) | Uzman ve editör akışları, geçersizleşme, atama, düzeltme |
| [04-SNAPSHOT-VERSIONING](04-SNAPSHOT-VERSIONING.md) | v1 / v2 / publication hash, migration |
| [05-ROLE-AUTH-MATRIX](05-ROLE-AUTH-MATRIX.md) | Rol × işlem, hata → HTTP |
| [06-GATE-COMPATIBILITY](06-GATE-COMPATIBILITY.md) | PR #12 / #15 / #21 / #25 / #26 / #29 uyumu, kod eşlemeleri |
| [07-PUBLISHING-BLOCKERS](07-PUBLISHING-BLOCKERS.md) | Açık ve kapalı kapılar, kural ağacı |
| [08-AUDIT-INTEGRITY](08-AUDIT-INTEGRITY.md) | Hash zinciri ve sınırları, idempotency |
| [09-TEST-REPORT](09-TEST-REPORT.md) | Gerçek komutlar, sayımlar, 96 senaryo matrisi, ölçek |
| [10-DEPLOYMENT-PREREQUISITES](10-DEPLOYMENT-PREREQUISITES.md) | Gerçek insan onayı için insan kararları |
| [11-INTEGRATION-HANDOFF](11-INTEGRATION-HANDOFF.md) | Dosya sahipliği; Prompt 05 / 14 / 15, Codex ve Antigravity devri |
| [reports/](reports/) | `audit` komutunun gerçek çıktısı (JSON / CSV / Markdown) |

Araç kullanımı: [`tools/editorial-trust/README.md`](../../../tools/editorial-trust/README.md).
