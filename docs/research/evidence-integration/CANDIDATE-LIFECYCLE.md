# CANDIDATE-LIFECYCLE

Durumlar (#19, değiştirilmedi): `new`, `investigating`, `insufficient_info`, `duplicate`, `awaiting_human_review`, `import_ready`, `rejected`.

`published`, `approved` veya `approved_by_ai` diye bir durum **yoktur**. `import_ready` yalnız teknik dönüşüm hazırlığıdır.

## İzin matrisi (`CANDIDATE_TRANSITIONS`, `lib/types.mjs`)

| Kaynak → | izinli hedefler |
|---|---|
| new | investigating, insufficient_info, duplicate, rejected |
| investigating | insufficient_info, duplicate, awaiting_human_review, rejected |
| insufficient_info | investigating, rejected |
| duplicate | investigating* |
| awaiting_human_review | investigating, insufficient_info, import_ready*, rejected |
| import_ready | awaiting_human_review*, rejected |
| rejected | investigating* |

\* Gerekçe (not) zorunlu.

**Kurallar:**
- İzinsiz geçiş adayı değiştirmeden reddedilir (QA-035).
- Aynı geçiş tekrarlanırsa geçmiş çoğalmaz (QA-036).
- Zaman saat dilimli ISO 8601 olmalı (QA-038).
- Geçmiş silinmez; reddedilen aday geçmişiyle birlikte yeniden açılır (QA-034).

#19 önceden her durumdan her duruma geçişe izin veriyordu (ör. `new → import_ready`). Bu Görev 07'de düzeltildi.

## İçe aktarma güveni

`importCandidatesFromJson` / `sanitizeImportedCandidate` ile şu alanlar sıfırlanır:
- `state → new`
- `verification.* → false`
- `rights.status → unknown`
- `urlStatus → unchecked`
- `approvedBy`, `publicationApproval`, `reviewedBy` vb. atılır

`importTrust: "unverified"` yazılır ve atılan iddialar `UNTRUSTED_CLAIMS_REMOVED` bulgusu olarak raporlanır. Sentetik işaret korunur; `synthetic:false` yazmak veriye güven kazandırmaz.

Toplu birleştirme (`mergeIntoPoolAtomic`) girdiyi değiştirmez ve şunu döndürür: `{pool, accepted, rejected, warnings}`.

## İnsan incelemesine iş listesi

Rapordaki `workList` her aday için şunları gösterir:
- neden beklediği,
- eksik alanlar,
- olası tekrarlar,
- ilişkili iddialar,
- dönem,
- gözlemlenen bağlantı durumu,
- `humanApprovalState: "absent"`.

Uzmanlar gerçek kararları ana kataloğu değiştirmeden ayrı bir PR'da kaydetmelidir. Bu görevde katalog yazımı yoktur.
