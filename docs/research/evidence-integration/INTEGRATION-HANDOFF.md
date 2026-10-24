# INTEGRATION-HANDOFF — Prompt 08 (PR #24) ve diğerleri

## Prompt 08 için kararlı API

İçe aktarma yolu: `tools/historical-research/lib/integration/index.mjs`. Ağ, ücretli API veya OpenAI/Anthropic bağımlılığı **yoktur.**

| Sözleşme (görev metni) | Gerçek ad | Not |
|---|---|---|
| `loadArchiveContext(): Readonly<ArchiveContext>` | `loadArchiveContext(root)` | async; deepFreeze; `collisions`, `limit`, `archiveSnapshotSha` |
| `readCandidatePool(): CandidatePoolSnapshot` | `readCandidatePool(poolPath)` (#19 `loadPool`) | |
| `validateCandidate(input): Issues` | `validateCandidate` (#19) + `candidateIssues` | `{code, severity, path, message, sourceId}` |
| `analyzeGaps(records, options): GapReport` | `analyzeGaps` (#19) + `periodCoverage` | |
| `findDuplicates(pool, archive)` | `classifyDuplicates(pool, archive)` | #19 `findDuplicates` korunuyor (O(n²)) |
| `evaluateClaim(claim, sources)` | `assessClaimEvidence(claim, candidates)` | #19 `evaluateClaim` korunuyor; pasaj ayrımı yok |
| `dryRunCandidate(id, context)` | `dryRunCandidate(candidate, archiveRecords, { now })` (#19 `convertCandidateToDraft`) | `convertAndValidate` gerçek `validateArchive` ile |
| `renderResearchReports(snapshot)` | `buildResearchSnapshot` + `snapshotToMarkdown` / `stableStringify` / `workListToCsv` | |
| — | `buildEvidenceGraph`, `independenceRoots`, `transitionCandidate`, `mergeIntoPoolAtomic`, `sanitizeImportedCandidate`, `checkUrlReachability`, `assertSafeOutputPath`, `writeFileAtomic` | Ek sözleşmeler |

### Prompt 08'in kendi katmanı olarak kalanlar (burada uygulanmadı)

- Claim v2, pasaj locator doğrulaması, bibliyografya, notebook, staging.
- `assessClaimEvidence` pasajı yalnız `passage_cited_unverified` olarak işaretler. Pasajın kaynakta gerçekten bulunduğunu Prompt 08 veya insan doğrulamalıdır.
- İddia metni ya da kaynak başlığı değişince eski kanıtın bayatlaması (PR #24 sözleşmesi): `stableStringify` ve SHA alanları buna hazır, ama olay/DTO üretimi Prompt 08'de.
- PR #24'ün production'da 404 dönen export API'si bu tabanda yok (QA-103 uygulanamaz).

## Diğer modüller

| Modül | Durum | Bağlantı |
|---|---|---|
| PR #20 Source Reliability | Bu tabanda yok | `loadSourceReliabilityAdapter({root})` mevcut değilse `available:false` döner. Sınıf eşlemesi açık: `reference → secondary` önerisi uyarılı ve insan kararı ister. |
| Prompt 06 Authority Registry | Yok | `createAuthorityResolver(registry)` yoksa `unresolved`, çoklu eşleşmede `ambiguous` döner |
| Prompt 03 / Codex yayın | Bağlantı yok | Motor scheduler'ı çalıştırmaz, ledger'a yazmaz |
| Prompt 04 / Claude güven kapıları (PR #39) | Ayrı zincir | Araştırma notu veya yazar adı tarihçi onayı sayılmaz. İleride aday → arşiv dönüşümü #39 kararlarına bağlanmalı. |
| Prompt 14 / Copilot Control Center | Bağlantı yok | Laboratuvar için auth gelene kadar production 404 kalır |

## Dosya sahipliği (bu PR'ın dokunduğu yollar)

- `tools/historical-research/**`: #19 port + Görev 07
- `data/research/candidates/**`, `docs/research/perplexity/**`, `web/app/arastirma-laboratuvari/**`, `web/lib/research-evidence/**`: yalnız #19'dan taşındı, değiştirilmedi
- `docs/research/evidence-integration/**`, `.github/workflows/research-evidence.yml`, `web/tests/research-evidence-gate.test.mjs`: yeni

Dokunulmayanlar:
- `data/archive/**`, `content/archive/**`, `docs/editorial/**`, `content/publications/**`
- `web/lib/publishing/**`, admin dosyaları, CSS
- `release-quality.yml`, `scripts/archive/**`

**PR #24 notu:** Bu PR birleşirse #24'ün tabanı (#19) V0.6'ya taşınmış olur. #24, #19'u yeniden getirmeden yeniden hedeflenmeli ve Görev 07 düzeltmeleriyle çakışma provası yapılmalıdır. `lib/candidates.mjs`, `lib/importers.mjs` ve `cli.mjs` iki tarafta da değişmiş olabilir.
