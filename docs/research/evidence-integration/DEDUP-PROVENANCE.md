# DEDUP-PROVENANCE

## Tekrar sınıflandırması (`classifyDuplicates`)

| Kademe | Koşul |
|---|---|
| `exact_duplicate` | Aynı normalleştirilmiş URL. Host küçük harf; fragment, kullanıcı bilgisi ve izleme parametreleri atılır. **http/https ayrı tutulur.** Yüzde kodlaması çözülmez. |
| `possible_duplicate` | Aynı kurum + aynı arşiv kimliği (farklı URL), **veya** aynı kurum + aynı olay yılı + başlık benzerliği ≥ 0,75. Farklı baskı olabilir. |
| `independent_or_unknown` | Diğerleri. Bağımsızlık kanıtlanmış değildir. |

**Kurallar:**
- Hiçbir sonuç silme veya birleştirme yapmaz.
- Farklı kurumda aynı kimlik eşleşme sayılmaz.
- Atılan izleme parametreleri kanıt olarak saklanır (`removedParams`).

**Karmaşıklık:** URL ve kimlik için hash indeksleri kullanılır. Başlık karşılaştırması yalnız "kurum + olay yılı" kovasında, ortak token varsa yapılır. 10.000 sentetik adayda tam değerlendirme yaklaşık 2,2 sn sürer (QA-048/112). Tek bir kovada çok sayıda aday toplanırsa o kova içinde karesel karmaşıklık kalır; bu durum belgelenmiş bir sınırdır.

#19'un `findDuplicates` fonksiyonu geriye uyumluluk için korundu. Çift döngülüdür (O(n²)); ölçümü için bkz. `scripts/bench-dedupe.mjs`.

## Provenans (`assessClaimEvidence`, `buildEvidenceGraph`)

**Düğümler:** `archive_record`, `candidate_source`, `historical_claim`, `institution`, `original_document`.

**Kenarlar:** `cites`, `supports`, `partially_supports`, `contradicts`, `derived_from`, `held_by`. Her kenar bir `degree` taşır: `declared` / `unresolved` / `passage_cited_unverified` / `metadata_only`.

**Bağımsız kök** birleşim-bul ile hesaplanır:
- aynı normalleştirilmiş URL,
- aynı kurum + arşiv kimliği,
- farklı kurumda aynı olay yılı + başlık benzerliği ≥ 0,8 (ayna/türev).

Aynı kurumun farklı fonları ayrı kök kalır (QA-057).

**Durum kuralı:**
- Çelişki varsa `contested_needs_review` (inceleme kuyruğu; otomatik hüküm yok).
- Yoksa, pasaj alıntılı ≥ 2 bağımsız kök varsa `provisional_support`.
- Aksi hâlde `unverified`.

**#19 farkı (QA-056 kanıtı):** `evaluateClaim`, pasajsız iki "supports"u farklı kurumlardan geldiği için `corroborated` sayar. Yeni değerlendirme aynı girdiyi `unverified` sayar ve `PASSAGE_MISSING` iş kalemi açar.

**Gerçek veride:**
- 10 iddianın 10'u `unverified`.
- Bütün kanıtlar künye düzeyinde; pasajlı destek 0.
- Grafikte 75 kenar var, 7'si `unresolved`: 7 adayın kurum arşiv kimliği yok.

PR #24 `evidence/independence.mjs` kopyalanmadı. Prompt 08 kendi pasaj doğrulama katmanını bu sözleşmenin üstüne koyar.
