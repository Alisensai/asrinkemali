# SOURCE-SNAPSHOT

Aday ve iddia dosyaları bu görevde **değiştirilmedi.** Başlık, URL, tarih ve insan bayraklarına dokunulmadı.

| Dosya | SHA-256 | Kayıt |
|---|---|---|
| `data/research/candidates/pool.json` | `ca9b7671a24506970bb7134d3dc2662300c0075ef1ff7ce1632c57047cdeba26` | 32 aday |
| `data/research/candidates/claims.json` | `e0ce3f229a06…` (tam değer `reports/evidence-report.json` → `claimsSnapshotSha`) | 10 iddia |
| Arşiv (iki kök, birleşik özet) | `d545f8ab1881ab58b3ffe7a8ecf2faf10d1eea91a2dda54eb96c1aa004e42582` | 168 kayıt (18 + 150) |

Bütünlük anlık görüntüsü (`node tools/historical-research/cli.mjs integrity`) şu yolları kapsar:
- `content/archive/records`
- `data/archive/catalog`
- `docs/editorial/forms`
- `content/publications`
- `pool.json`
- `claims.json`

Rapor üretiminden önce ve sonra değişiklik yoktu (`readOnlyIntegrity.verified: true`; QA-008/078). CI iş akışı aynı karşılaştırmayı `diff` ile yapar.

Bu anlık görüntü #19 @ `e7ed5f18` içeriğiyle bayt düzeyinde aynıdır: dosyalar cherry-pick ile taşındı, değiştirilmedi.
