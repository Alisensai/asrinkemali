# V0.7 arşiv içe aktarma sözleşmesi

## Sınır

`tools/archive-ingest` yalnız offline staging üretir. UI, admin, yayın, arşiv katalogları, şemalar ve insan inceleme formları bu görevin yazma alanı değildir. `verification.status`, insan adı, `approved` veya `published` girdiden güvenilir durum türetemez.

## Veri hattı

`RawImportRow → normalized input → staging candidate → insanın tamamlayacağı ArchiveRecord taslağı`

Tam şemaya uymayan adayın `proposedArchiveDraft` alanı `null` kalır. Çıktıdaki `ingest`, `publishEligible`, `sourceVerifiedByHuman` her zaman `false`; `humanApproval` her zaman `null`dır. Teknik kaynak URL denetimi tarihî doğruluk, lisans izni veya insan uzman onayı değildir.

## Güvenlik ve geri alma

Araç dış URL fetch etmez, API/LLM çağırmaz ve staging kökü dışına yazmaz. Çıktı hedefinde traversal, mutlak yol ve mevcut sembolik bağlar reddedilir. Atomik dosya yazımı kullanılır; hedefte farklı içerik varsa overwrite yerine çakışma hatası döner. Staging veri paketleri `.gitignore` ile sürüm kontrolü dışındadır; yalnız sentetik fixture ve belgeler commit edilir.

## Entegrasyon notu

Araç PR #25/#28 Fortress güvenlik sınırlarını değiştirmez ve `scripts/archive/lib/security.mjs` yardımcılarını kullanır. Arşiv kaynağı salt okunur iki kökten (`content/archive/records`, `data/archive/catalog`) taranır; ID çakışması bloklanır, slug ve kaynak URL çakışmaları insan inceleme uyarısıdır.
