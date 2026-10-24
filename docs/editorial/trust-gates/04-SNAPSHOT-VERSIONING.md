# 04 — Snapshot hash ve sürümleme

| Algoritma | Kullanım | Tanım |
|---|---|---|
| `legacy-record-sha256-v1` | PR #15 formlarıyla uyum, stale tespiti | `sha256(json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":")))`. Node `canonicalJson` bununla bayt düzeyinde aynıdır: 168/168 gerçek form eşleşir (F-hash). |
| `nfc-policy-sha256-v2` | Yeni arşiv ve sergi kararları | Önce alan politikası uygulanır (`SNAPSHOT_EXCLUDED_FIELDS`), sonra bütün dizgi ve anahtarlar NFC'ye çevrilir. Hash girdisi: `sha256("nfc-policy-sha256-v2\n" + subjectType + "\n" + canonicalJson(payload))`. |
| `publication-revision-v1` | Makale kararları | PR #29 `computePublicationRevision`. Prompt 03'ün özeti tek otoritedir, burada yeniden yazılmadı. |

## v2 alan politikası

| Konu | Hash dışı alanlar (inceleme sürecinin kendisi değiştirir) |
|---|---|
| `archive_record` | `verification`, `publicationApproval`, `updatedAt` |
| `exhibition_record` | `reviewStatus`, `approval`, `publishedAt`, `updatedAt` |
| `publication_record` | PR #29 izin listesi (onay ve zamanlama hariç) |

Tarih, kaynak, provenance, haklar, görsel, kişi, yer ve metin alanlarının hepsi hash içindedir.

## Belirlenimcilik ve sınırlar

- Anahtarlar Python ile aynı biçimde kod noktası sırasıyla dizilir (BMP dışı karakterlerde UTF-16 sırası farklı olurdu).
- Tam sayı dışındaki sayılar hata verir (`canonical_number_unsupported`), çünkü Python `1.0` değerini `"1.0"`, JavaScript `"1"` yazar. Arşiv kayıtlarında kesirli sayı yoktur. Sessizce farklı hash üretmek yerine açık hata verilir.
- NFC normalizasyonundan sonra iki anahtar çakışırsa hata verilir (`canonical_key_collision_after_nfc`).
- v1 hash'i NFC uygulamaz (PR #15 uyumu). Bu yüzden aynı metnin NFD biçimi v1'de farklı, v2'de aynı hash verir (C40).

## Migration

- PR #15 formları **değiştirilmez ve yeniden yazılmaz**.
- Yeni kararlar formlara değil, ayrı bir karar deposuna (`ReviewDecisionRepository`) v2 ya da publication hash'iyle bağlanır.
- Eski form verisi okunur ve sınıflandırılır (C48). İleride bir v2 form şeması gerekirse sürüm kontrollü ayrı bir şema olarak eklenmelidir.
