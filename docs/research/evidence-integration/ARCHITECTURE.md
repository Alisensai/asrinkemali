# ARCHITECTURE — veri akışı

```
content/archive/records ─┐                       ┌─ classifyDuplicates (indeksli, 3 kademe)
data/archive/catalog ────┼─ scripts/archive/lib/  │
                         │  load.mjs (OpenCode,   ├─ assessClaimEvidence / buildEvidenceGraph
                         │  tek okuyucu)          │
                         ▼                        ├─ periodCoverage + analyzeGaps (#19)
           loadArchiveContext (frozen, SHA,       │
           id/slug çakışması, limit bayrağı) ─────┼─ convertCandidateToDraft (#19, draft-only)
data/research/candidates/pool.json  ──────────────┤
data/research/candidates/claims.json ─────────────┘
                         │
                         ▼
          buildResearchSnapshot → JSON (stableStringify) / Markdown / CSV iş listesi
                         │
                         ▼
          writeFileAtomic → yalnız izinli rapor dizinleri veya geçici dizin
```

## Katmanlar

| Katman | Dosya | Sahip |
|---|---|---|
| Çekirdek motor | `tools/historical-research/lib/*.mjs` (#19) | Perplexity; Görev 07 dar düzeltmeler |
| Entegrasyon | `tools/historical-research/lib/integration/*.mjs` | Görev 07 (yeni) |
| CLI | `tools/historical-research/cli.mjs` | #19 + Görev 07 komutları |
| Web (sunucu) | `web/lib/research-evidence/candidates.ts` (server-only), `web/app/arastirma-laboratuvari/page.tsx` | #19; değiştirilmedi |
| Arşiv okuyucu | `scripts/archive/lib/load.mjs` | OpenCode; değiştirilmedi |

## İlkeler

- **Tek arşiv.** Okuma yalnız OpenCode okuyucusundan yapılır; motor JSON'u kendisi okumaz. MAX_RECORDS (500) sessizce yükseltilmez. Aşılırsa `limit.complete=false` olur ve rapor `ARCHIVE_INCOMPLETE` engeli verir.
- **Salt-okunur.** Rapor, arşiv/form/yayın/aday dosyalarının SHA-256'sını işlemden önce ve sonra karşılaştırır; fark varsa `READ_ONLY_VIOLATION`.
- **Ağsız.** Erişim denetimi (`checkUrlReachability`) yalnız `fetchImpl` ve `resolver` açıkça enjekte edilirse çalışır. CLI bunu hiçbir komutta çağırmaz.
- **İnsan kararı yok.** Hiçbir fonksiyon insan onayı, `published` aday durumu veya `verified` iddia üretmez.
- **Web sınırı.** Laboratuvar production'da bayraktan bağımsız olarak 404 döner. Aday okuyucu `server-only`; entegrasyon katmanı web'e bağlanmadı (Prompt 08/14 işi).
