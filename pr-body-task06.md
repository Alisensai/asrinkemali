### Amaç
MKA Authority Registry (Görev 06 / MKA-AUTHORITY-REGISTRY-06): Atatürk/Cumhuriyet tarihi arşiv ve dijital müze platformunda şahıs, mekân, kurum, tarihî olay ve kaynak eser kimliklerini deterministik olarak modelleyen, ad-adaş ayrımını hard-negative kurallarıyla koruyan, takma adları (alias) çözen ve web tüketimi için DTO adaptörleri sunan bağımsız otorite sisteminin kurulması.

### Etkilenen Dosyalar
- `tools/archive-authority-registry/package.json`
- `tools/archive-authority-registry/src/model.mjs`
- `tools/archive-authority-registry/src/extractor.mjs`
- `tools/archive-authority-registry/src/matcher.mjs`
- `tools/archive-authority-registry/src/graph.mjs`
- `tools/archive-authority-registry/src/dry-run-migration.mjs`
- `tools/archive-authority-registry/src/registry.mjs`
- `tools/archive-authority-registry/src/cli.mjs`
- `tools/archive-authority-registry/data/authority-registry.json`
- `tools/archive-authority-registry/tests/model.test.mjs`
- `tools/archive-authority-registry/tests/extractor.test.mjs`
- `tools/archive-authority-registry/tests/matcher.test.mjs`
- `tools/archive-authority-registry/tests/registry.test.mjs`
- `tools/archive-authority-registry/tests/security.test.mjs`
- `schemas/authority-registry.types.ts`
- `schemas/authority-registry.schema.json`
- `web/lib/authority-registry/types.ts`
- `web/lib/authority-registry/service.ts`
- `web/lib/authority-registry/index.ts`
- `web/tests/authority-registry.test.mjs`
- `docs/authority-registry/ARCHITECTURE.md`
- `docs/authority-registry/BASELINE.md`
- `docs/authority-registry/MATCHING-POLICY.md`
- `docs/authority-registry/INTEGRATION.md`
- `docs/authority-registry/TEST-REPORT.md`
- `docs/authority-registry/LIMITATIONS.md`

### Çalıştırılan Komutlar ve Test Sonuçları
- `npm --prefix tools/archive-authority-registry test`: 14/14 test GEÇTİ.
- `node --test web/tests/authority-registry.test.mjs`: 5/5 test GEÇTİ.
- `npm --prefix web test`: 86/86 test GEÇTİ.
- `node tools/archive-authority-registry/src/cli.mjs report`: 370 varlık, 957 gözlem, 538 düğüm / 789 kenar başarıyla raporlandı.
- `node tools/archive-authority-registry/src/cli.mjs dry-run-migration`: 0 disk yazımı garantisiyle 168 kayıt simüle edildi.

### Güvenlik ve Uyumluluk
- `main` veya prod ortamına doğrudan müdahale yoktur.
- Orijinal arşiv katalog kayıtları (`data/archive/catalog`, `content/archive/records`) salt-okunur kalmıştır; hash değerleri değişmemiştir.
- 370 varlığın tamamı `status: "provisional"` ve `humanApproval: null` olarak işaretlenmiştir.
- Coğrafi koordinatlar uydurulmamıştır (`coords: null`).

### Kalan Eksikler
- Dış otorite servisleri (Wikidata/VIAF) için canlı API bağlantısı (tasarım gereği offline tutuldu).
- Bağımsız uzman paneli onay iş akışı (Görev 04 ve RBAC altyapısına tabidir).
