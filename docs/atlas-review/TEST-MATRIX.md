# MKA ATLAS 2.0 — DOĞRULAMA VE TEST MATRİSİ

**DOKÜMAN:** `docs/atlas-review/TEST-MATRIX.md`  
**TARİH:** 24 Ekim 2026  
**AJAN:** ANTIGRAVITY  
**GÖREV KODU:** MKA-ANTIGRAVITY-21  

---

## 1. Test Grupları ve Koşum Sonuçları

| Grup No | Test Grubu | Test Sayısı | Durum | Kanıt Dosyası |
|:---|:---|:---|:---|:---|
| **Grup 1** | ZIP ve Patch Güvenliği (`[21.001]` .. `[21.018]`) | 18 Test | **PASS (18/18)** | `web/tests/atlas-review.test.mjs` |
| **Grup 2** | Sürüm Kıyaslama ve Arşiv Dürüstlüğü (`[21.019]` .. `[21.034]`) | 16 Test | **PASS (16/16)** | `web/tests/atlas-review.test.mjs` |
| **Grup 3** | Entegrasyon Prova (`[21.035]` .. `[21.050]`) | 16 Test | **PASS (16/16)** | `web/tests/atlas-review.test.mjs` |
| **Grup 4** | Yama Uyumluluğu (`git apply --check`) | 1 Komut | **PASS (Kod 0)** | `MKA_ATLAS_V07_GITHUB.patch` |
| **Grup 5** | Yeni Paket Kendi Birim Testleri | 31 Test | **PASS (31/31)** | `MKA_ATLAS_V07/web/tests/atlas.test.mjs` |
| **Toplam** | **Tüm İncelenen Denetim Testleri** | **81 Test** | **%100 BAŞARILI** | |

---

## 2. Ayrıntılı Test Senaryoları Tablosu

| Test ID | Test Tanımı | Beklenen Davranış | Gerçekleşen Sonuç |
|:---|:---|:---|:---|
| `[21.001]` | zip traversal `../` | Traversal girdileri reddedilir | PASS (1.0ms) |
| `[21.002]` | Windows drive path | `C:\...` yolları reddedilir | PASS (0.2ms) |
| `[21.003]` | absolute path | `/etc/...` yolları reddedilir | PASS (0.1ms) |
| `[21.004]` | duplicate zip member | Mükerrer girdiler tespit edilir | PASS (0.1ms) |
| `[21.005]` | normalized collisions | Case-insensitive çakışmalar yakalanır | PASS (0.2ms) |
| `[21.006]` | symbolic link | Symlink bayrağı reddedilir | PASS (0.1ms) |
| `[21.007]` | zip bomb ratio | >100x aşırı oranlar yakalanır | PASS (0.1ms) |
| `[21.008]` | oversized file | >5MB dosyalar yakalanır | PASS (0.1ms) |
| `[21.009]` | invalid UTF-8 | Bozuk karakterler tespit edilir | PASS (0.1ms) |
| `[21.010]` | hidden secrets | API key/token bulunmaz | PASS (1.4ms) |
| `[21.011]` | manifest hash match | SHA-256 toplamları %100 uyuşur | PASS (1.3ms) |
| `[21.012]` | manifest missing entry | Eksik dosya bulunmaz | PASS (0.5ms) |
| `[21.013]` | patch format | Standart git diff biçimidir | PASS (0.3ms) |
| `[21.014]` | patch root boundary | Kök dizin dışına çıkmaz | PASS (0.4ms) |
| `[21.015]` | patch deletion check | Dosya silme işlemi içermez | PASS (0.3ms) |
| `[21.016]` | patch binary check | Binary veri içermez | PASS (0.3ms) |
| `[21.017]` | CRLF normalization | Satır sonları sorunsuzdur | PASS (2.9ms) |
| `[21.018]` | bundle SHA256 equality | Girdi özetleri tam eşleşir | PASS (0.9ms) |
| `[21.019]` | old expertVerified rejection | Sahte onaylar reddedildi | PASS (0.6ms) |
| `[21.020]` | old board claim rejection | Sahte unvanlar reddedildi | PASS (2.5ms) |
| `[21.021]` | old /archive path rejection | `/arsiv` rotası kullanılır | PASS (0.4ms) |
| `[21.022]` | old json path rejection | Olmayan yollar silindi | PASS (0.4ms) |
| `[21.023]` | old lat/lng removal | Uydurma koordinatlar kaldırıldı | PASS (0.4ms) |
| `[21.024]` | Tailwind dependency removed | CSS Modules kullanılır | PASS (2.5ms) |
| `[21.025]` | coordinate null default | Koordinatlar null döner | PASS (0.5ms) |
| `[21.026]` | /arsiv/[slug] link format | Slug URI-encode edilerek bağlanır | PASS (0.4ms) |
| `[21.027]` | safe URL checks | javascript: ve data: engellenir | PASS (0.4ms) |
| `[21.028]` | relatedIds verification | Yalnız yayındaki kayıtlar | PASS (0.3ms) |
| `[21.029]` | strict city matching | Yalnız katalog şehirleri | PASS (0.3ms) |
| `[21.030]` | title/summary geocode ban | Başlıktan yer uydurulmaz | PASS (0.9ms) |
| `[21.031]` | dateKind discrimination | Tarih türleri ayrıştırılır | PASS (0.6ms) |
| `[21.032]` | 7 city schematic label | SVG şematik etiketlenir | PASS (0.3ms) |
| `[21.033]` | polygon honest count | Şematik harita kullanılır | PASS (0.3ms) |
| `[21.034]` | atlas.test.mjs existence | Kendi birim testi mevcuttur | PASS (0.3ms) |
| `[21.035]` | zip overlay dry-run | Web ve docs altına oturur | PASS (0.3ms) |
| `[21.036]` | git apply --check | Çakışmasız uygulanır (kod 0) | PASS (73.4ms) |
| `[21.037]` | duplicate patch check | 12 geçerli diff başlığı | PASS (1.2ms) |
| `[21.038]` | path collision check | Hedef atlas/ yolları boştur | PASS (0.2ms) |
| `[21.039]` | PR #22 base SHA check | Doğru taban referansı | PASS (0.1ms) |
| `[21.040]` | git HEAD untouched | İnceleme dalında src korunur | PASS (74.6ms) |
| `[21.041]` | archive hash integrity | Katalog dosyaları korunur | PASS (0.2ms) |
| `[21.042]` | server-only client ban | İstemciye sızma yoktur | PASS (0.4ms) |
| `[21.043]` | live OAuth absent | Harici auth yoktur | PASS (0.4ms) |
| `[21.044]` | paid map SDK absent | Harici SDK yoktur | PASS (0.4ms) |
| `[21.045]` | CSP strictness | CSP gevşetilmez | PASS (0.6ms) |
| `[21.046]` | mobile 320px responsive | Medya sorguları mevcuttur | PASS (0.4ms) |
| `[21.047]` | large 1536px rules | Grid kuralları mevcuttur | PASS (0.5ms) |
| `[21.048]` | honest screenshots | Sahte ekran üretilmez | PASS (0.1ms) |
| `[21.049]` | actual pass reporting | Salt fiilî test raporu | PASS (0.1ms) |
| `[21.050]` | official source links | noopener noreferrer taşır | PASS (0.4ms) |
