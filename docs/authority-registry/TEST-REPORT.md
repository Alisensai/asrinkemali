# MKA Authority Registry — Test Raporu

## 1. Birim Testleri (`tools/archive-authority-registry/tests/`)
- Komut: `node --test tests/*.test.mjs`
- Test Sayısı: 14 test
- Başarılı: 14 test (%100)
- Başarısız: 0 test
- Kapsam:
  - `model.test.mjs`: Türkçe normalizasyon (I/İ/ı/i), slug üretimi, ID doğrulaması, sahte insan onayı reddi.
  - `extractor.test.mjs`: Şahıs, mekân, kurum, olay, kaynak eser ve gözlem çıkarımı.
  - `matcher.test.mjs`: Takma ad çözümleme, hard negative çift engellemesi, parçalı eşleştirme skorlaması.
  - `registry.test.mjs`: Otorite indeksi, arama, graf oluşturma ve döngü denetimi.
  - `security.test.mjs`: Salt-okunur disk garantisi (`diskWritesAttempted: 0`) ve `data/archive` / `content/archive` path traversal engeli.

## 2. Web Entegrasyon Testleri (`web/tests/`)
- Komut: `node --test tests/authority-registry.test.mjs`
- Test Sayısı: 5 test
- Başarılı: 5 test (%100)
- Başarısız: 0 test
- Kapsam: `getRegistrySummary`, `getAuthorityEntity`, `searchAuthorities`, `getAtlasPlaces` (null coords doğrulaması), `getChronologyEvents`.

## 3. Genel Web Test Paketi
- Komut: `npm test` (web dizininde)
- Toplam Test: 86 test
- Başarılı: 86 test (%100)
- Süre: ~520 ms
