# DATA-CONTRACTS

## SourceCandidate v1.0.0 (#19, değiştirilmedi)

Şema alanları korunur. Görev 07 yalnız çalışma zamanı denetimi ekledi. Yeni alan olarak yalnız içe aktarılan adaylara `importTrust: "unverified"` yazılır; bu alan bir sözleşme değişikliği değil, ek bilgidir.

| Alan | Görev 07 denetimi |
|---|---|
| `id` | `src-YYYY-NNNN`; boş/yinelenen kimlik reddi |
| `sourceNature` | Yalnız `primary` / `secondary` / `unknown`. Geçersiz değer `BAD_SOURCE_NATURE` olur; primary varsayılmaz. |
| `publishedAt` | `YYYY`, `YYYY-MM` veya takvimde var olan `YYYY-MM-DD` (2025-02-29 reddedilir) |
| `accessedAt` | Takvim tarihi |
| `eventYear`, `periodStart`, `periodEnd` | Tam sayı yıl veya null; başlangıç > bitiş ise `PERIOD_REVERSED` |
| `authors` | `{name}` dizisi; boş ad yer tutucu olarak yazılmaz |
| `rights`, `verification` | Nesne olmalı; değilse çökme yok, sorun üretilir |
| `state` | `CANDIDATE_TRANSITIONS` matrisi (CANDIDATE-LIFECYCLE.md) |

Sorun biçimi: `{ code, severity, path, message, sourceId }`.

## HistoricalClaim (#19 `claims.json`)

Okunur ama değiştirilmez. Dosyada `status` alanı yoktur. Değerlendirme ayrı bir nesnedir:

`assessClaimEvidence(claim, candidates)` şunları döndürür:
- `status`: `unverified` | `provisional_support` | `contested_needs_review`
- `edges[]`, kanıt derecesiyle: `passage_cited_unverified` | `metadata_only`
- `unresolvedEdges[]`, `independentRoots[]`, `reviewQueue[]`, `limitations[]`
- `humanVerified: false`

## ArchiveRecord ↔ Candidate ↔ Claim eşlemesi

| Kavram | ArchiveRecord v1.x | SourceCandidate v1.0.0 | Not |
|---|---|---|---|
| Kimlik | `id` (slug'dan bağımsız olabilir) | `id` (`src-…`) | Ad alanları ayrı: grafikte `archive:` / `candidate:` / `claim:` |
| Kaynak URL | `source.url` | `url` | Dedupe aynı normalleştirmeyi kullanır |
| Kurum arşiv no | `source.archiveIdentifier` | `archiveIdentifier` | Yoksa uydurulmaz; özgün belge düğümü `unresolved` olur |
| Tarih | `date.start/end/precision` | `eventYear`, `periodStart/End`, `publishedAt` | Yayın tarihi olay tarihi değildir |
| Haklar | `rights.status` | `rights.status` | Bilinmiyorsa dry-run engellenir |
| İnceleme | `verification.status` (teknik) | `verification.humanReviewed` (iddia) | İkisi de güvenilir insan kararı değildir |
| Dry-run çıktısı | `schemaVersion 1.1.0`, `verification.status: "draft"` | — | Kataloğa yazılmaz |

## Rapor sözleşmesi (`evidence-integration-report/1.0.0`)

Alanlar:
- Kimlik ve sürüm: `schemaVersion`, `engineVersion`, `generatedAt`
- Girdi özetleri: `archiveSnapshotSha`, `candidateSnapshotSha`, `claimsSnapshotSha`
- Sayılar ve onay: `metrics`, `humanApprovalState`, `importEligibleCount`, `unknownFieldsCount`
- Kapsam: `sourceLinkStatus` (gözlemlenen), `periodCoverage`, `gapAnalysis`
- Analiz: `duplicates`, `claimAssessments`, `dryRuns`, `workList`
- Durum: `findings`, `warnings`, `blockers`, `readOnlyIntegrity`, `limitations`

Aynı girdi ve aynı `--generated-at` bayt düzeyinde aynı JSON üretir (QA-076/113).
