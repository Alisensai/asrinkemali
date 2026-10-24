# MKA Authority Registry — Mimari Dokümantasyonu

## 1. Amaç ve Kapsam
MKA Authority Registry, ASRIN KEMALİ platformundaki 168 arşiv kaydı (150 katalog + 18 legacy record) üzerinde şahıs, mekân, kurum, tarihî olay ve kaynak eser varlıklarını deterministik olarak indeksleyen, takma adları (alias) çözen ve ad-adaş ayrımını güvenceye alan bağımsız otorite katmanıdır.

## 2. Temel İlkeler ve Güvenlik Kapıları
1. **Salt-Okunur İndeksleme:** Arşiv katalog ve kayıt dosyaları (`data/archive/catalog`, `content/archive/records`) salt-okunur taranır, diskteki orijinal kayıtlara asla müdahale edilmez.
2. **Deterministik ID Üretimi:** `mka:<kind>:<slug>` (ör. `mka:person:mustafa-kemal-ataturk`).
3. **Hard-Negative Güvenliği:** Adaş olan veya sıklıkla yanlış birleştirilen farklı tarihî şahsiyetler (ör. Ali Rıza Efendi ile Ali Rıza Paşa) kural bazlı olarak birleştirmeden men edilir (`score = 0`, `isHardNegative: true`).
4. **Fail-Closed İnsan Onayı:** Tüm otomatik çıkarılan varlıklar `status: "provisional"` ve `humanApproval: null` olarak işaretlenir. Doğrulanmış bağımsız aktör onayı olmadan hiçbir varlık doğrulanmış kabul edilmez.
5. **İlişki Grafı ve Soy Ağacı:** `AuthorityGraph` yönlü grafı döngü denetimi (`hasCycle`), kanıt referansları ve kayıt-varlık çift yönlü izlenebilirliğini sağlar.

## 3. Bileşen Yapısı
- `src/model.mjs`: Varlık türleri (`person`, `place`, `institution`, `event`, `source_work`), Türkçe Unicode/NFC folding ve doğrulayıcılar.
- `src/extractor.mjs`: Arşiv kayıtlarından salt-okunur varlık ve gözlem çıkarıcı (`extractEntitiesFromRecords`).
- `src/matcher.mjs`: Tarihî takma adlar (`KNOWN_ALIASES`), aday eşleştirme ve hard-negative koruması.
- `src/graph.mjs`: Varlık-kayıt yönlü ilişki grafı ve döngü tespiti.
- `src/dry-run-migration.mjs`: Disk yazımı olmadan geçiş simülasyonu ve etki analizi.
- `src/registry.mjs`: Bellek içi otorite defteri, arama, sorgu ve doğrulama motoru.
- `src/cli.mjs`: CLI komutları (`report`, `inspect`, `extract`, `resolve`, `match`, `duplicates`, `graph`, `dry-run-migration`, `validate`, `export`).
- `web/lib/authority-registry/`: Next.js sunucu tarafı DTO adaptörleri (Gemini Atlas, Kimi Kronoloji ve arama için).
