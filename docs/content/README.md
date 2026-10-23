# ASRIN KEMALİ Arşiv Veri Modeli

Bu dizin, ASRIN KEMALİ projesinin tarihsel arşiv kayıtlarını, doğrulama
kurallarını ve arama çekirdeğini belgeler. Web katmanı bu çalışmanın kapsamı
dışındadır; buradaki modüller yalnızca veri ve doğrulama sorumluluğu taşır.

## Kısa başlangıç

```bash
# Yapısal + iş kuralı doğrulaması (çevrimdışı)
node scripts/archive/validate.mjs

# Uyarıları da hata say (CI için sıfır uyarı politikası)
node scripts/archive/validate.mjs --strict

# Kaynak URL'lerini ağ üzerinden denetle
node scripts/archive/validate.mjs --links

# Makine tarafından okunabilir sonuç
node scripts/archive/validate.mjs --json

# Tekrarlanabilir testler
node --test "scripts/archive/tests/*.test.mjs"

# Arama ve "Tarihte Bugün" demosu
node scripts/archive/demo.mjs
```

Unix benzeri sistemlerde `scripts/archive/validate` ve Windows'ta
`scripts/archive/validate.cmd` sarmalayıcıları aynı çıkış kodunu iletir.
Çıkış kodları: `0` başarılı, `1` doğrulama hatası, `2` kullanım veya beklenmeyen
çalışma hatası.

### CI kullanımı

Mevcut CI dosyası değiştirilmeden, ayrı bir adım olarak:

```yaml
- name: Arşiv doğrulaması
  run: node scripts/archive/validate.mjs

- name: Arşiv testleri
  run: node --test "scripts/archive/tests/*.test.mjs"
```

Ağ erişimi olan ayrı bir zamanlanmış işte `node scripts/archive/validate.mjs --links`
çalıştırılabilir. `--links` başarısız bağlantıyı hata sayar ve `1` ile çıkar;
bu nedenle her commit'te değil, ayrı bir bağlantı denetimi işinde çalıştırılması
önerilir.

## Dizin yapısı

```text
content/archive/
  taxonomy.json                 # Kontrollü sözlük
  records/*.json                # Kayıtlar (dosya başına bir nesne veya dizi)
schemas/
  archive-record.schema.json    # Kayıt sözleşmesi
  archive-taxonomy.schema.json  # Taksonomi sözleşmesi
  archive-record.types.ts       # TypeScript karşılığı
scripts/archive/
  lib/json-schema.mjs           # Bağımlılıksız şema doğrulayıcı
  lib/load.mjs                  # Dosya yükleme
  lib/security.mjs              # URL/metin/görsel güvenliği
  lib/text.mjs                  # Türkçe normalizasyon
  lib/search.mjs                # Arama ve süzgeçler
  lib/today.mjs                 # Tarihte Bugün
  lib/validate.mjs              # İş kuralları ve yayın kapısı
  lib/links.mjs                 # İsteğe bağlı bağlantı denetimi
  lib/index.mjs                 # Ortak giriş noktası
  validate.mjs                  # CLI
  demo.mjs                      # Örnek kullanım
  tests/*.test.mjs              # node:test testleri
docs/content/
  README.md                     # Bu dosya
  AUDIT.md                      # İki turlu veri denetimi
  TEST-RAPORU.md                # Test ve doğrulama raporu
  TELIF-VE-AI-POLITIKASI.md     # Haklar, alıntı ve AI politikası
  KAYNAK-DUZELTME.md            # Kaynak düzeltme ve geri çekme
  INTEGRATION.md                # Web dışı entegrasyon örneği
```

## Veri girişi

### 1. Tür ve kimlik seçin

Desteklenen türler: `photograph`, `document`, `speech`, `event`, `publication`,
`place`. `id` ve `slug` küçük harf, sayı ve tek tirelerden oluşmalıdır
(`^[a-z0-9]+(?:-[a-z0-9]+)*$`). Dosya adı, kural olarak `id` ile aynı olmalıdır.

### 2. Tarihi hassasiyetine göre yazın

| `precision` | Anlamı | Örnek |
|---|---|---|
| `day` | Gün kesin | `1923-10-29` |
| `month` | Ay kesin, gün değil | `1928-07-01`, `display: "Temmuz 1928"` |
| `year` | Yalnızca yıl kesin | `1930-01-01`, `display: "1930"` |
| `range` | Başlangıç ve bitiş | `1920-04-23` – `1924-10-15` |
| `unknown` | Tarih bilinmiyor | `start: null`, `end: null` |

Kurallar:

- `day` hassasiyetinde `end` ya `null` ya da `start` ile aynı olmalıdır.
- `range` hassasiyetinde `end` zorunludur.
- `unknown` yalnızca `draft` kayıtlarda kullanılmalıdır; yayın kapısı tarihi
  bilinmeyen kaydı reddeder.
- `event` türündeki bir kayıt yayımlanacaksa `precision: "day"` ve
  `certainty: "exact"` olmalıdır.
- "Tarihte Bugün" yalnızca `event`, `published`, `day` ve `exact` kayıtları
  takvim gününe göre eşler. Yıl serbesttir; 23 Ekim için doğrulanmış kayıt
  yoksa sistem **aynen** `Bugün için doğrulanmış kayıt eklenmedi` mesajını
  döndürür. Hiçbir kayıt rastgele bir yıla veya güne atanmaz.

### 3. Kaynak ve provenans

`source`, kaydın dayandığı kurumsal sayfadır. `provenance`, aynı kaynağın
koleksiyon/arşiv bilgisini ve erişim kaydını taşır.

Yayın için:

- `source.institutionType` şu değerlerden biri olmalıdır: `official`,
  `institutional`, `archive`, `library`, `academic`.
- `source.url`, ana sayfa değil belirli bir kayıt sayfası olmalıdır.
- `source.url`, `provenance` listesinde yer almalıdır.
- `source.accessedAt` ve `provenance[].accessedAt` `YYYY-MM-DD` olmalıdır.
- Uydurma bağlantı, tahmini arşiv numarası veya doğrulanmamış künye
  kullanılamaz.

Kurumsal kaynak yoksa kayıt `draft` kalır. Kaynak sayfa değişirse
[KAYNAK-DUZELTME.md](KAYNAK-DUZELTME.md) izlenir.

### 4. Haklar ve görsel politikası

`rights.status` değerleri:

| Değer | Yayın |
|---|---|
| `public_domain` | Kaynakta açıkça kamu malı ise |
| `open_license` | `license` + `licenseUrl` doğrulanmışsa |
| `official_link_only` | Yalnızca kaynak sayfaya bağlantı |
| `institutional_terms` | Kurum koşulları doğrulanmış, kopyalama yok |
| `unknown` | Yayımlanamaz |
| `permission_required` | Yayımlanamaz |
| `ai_representative` | Tarihsel kayıt olarak yayımlanamaz |

Görsel kuralı:

- Lisansı belirsiz görsel **indirilmez, kopyalanmaz, yeniden barındırılmaz**.
- `image.kind: "digitized_original"` + `rights.imageReuse: "link_only"` ise
  `image.url` boş olmalı, `image.sourcePageUrl` kaynak sayfayı göstermeli ve
  `displayPolicy: "source_link_only"` olmalıdır.
- `imageReuse: "permitted"` yalnızca doğrulanmış lisansla kullanılabilir.
- `image.kind: "ai_representative"` görseller `reviewed` veya `published`
  olamaz; alt metinde "temsili" veya "AI" etiketi zorunludur.
- Yerel görsel kullanılacaksa yalnızca `content/archive/images/` altında,
  JPEG/PNG/WebP imzası, boyut ve yol güvenliği denetiminden geçerek.

### 5. Doğrudan alıntı

Atatürk'e ait doğrudan alıntı yalnızca şu durumda eklenir:

- Alıntının ait olduğu eser/konuşma, tarih ve özgün bağlam bellidir.
- Kurumsal veya birincil kaynakta birebir pasaj bulunmaktadır.
- `quotation.evidence.sourceExcerpt` alıntı metnini birebir içerir.
- `quotation.verified` `true` ve yayın için
  `verification.checks.quoteVerified` `true` olur.
- Görsel tasarımdaki metin, sosyal medya alıntısı veya ikincil derleme
  kaynak sayılmaz.

Alıntı yoksa `quoteVerified: false` kalır; bu bir eksiklik değildir. Doğrulayıcı
`quoteVerified` alanını yalnızca `quotation` nesnesi varsa yayın kapısında arar.

### 6. Doğrulama ve yayın durumu

| Durum | Anlamı |
|---|---|
| `draft` | Kaynak/tarih/hak alanlarından biri açık |
| `reviewed` | Kaynak ve tarih incelendi; bazı yayın koşulları açık |
| `published` | Tüm yayın kapısı koşulları sağlandı |

`published` için:

- `reviewedBy` ve `reviewedAt` dolu olmalı.
- `verification.checks` içindeki `sourceReachable`, `dateVerified`,
  `rightsVerified`, `duplicateChecked` `true` olmalı.
- `quotation` varsa `quoteVerified` da `true` olmalı.
- Tarih bilinmemesi, uygun olmayan hak durumu, genel ana sayfa kaynağı,
  gün hassasiyeti olmayan olay ve görselsiz fotoğraf yayını engeller.

İnceleme kaydı şeffaflık içindir. Bu depodaki örneklerde `reviewedBy` alanı
`OpenCode arşiv denetimi (yapay zekâ)` olarak tutulur; bu, insan uzman
incelemesinin yerini aldığı anlamına gelmez.

## İnceleme ve yayın akışı

1. **Taslak:** Kaynak bulunur, künye ve tarih yazılır. Emin olunmayan alanlar
   `draft` ve `unknown` kalır.
2. **İnceleme:** Kaynak sayfa açılır; tarih, kurum, arşiv numarası ve hak
   bilgisi karşılaştırılır. `reviewedBy`, `reviewedAt` ve kontrol bayrakları
   doldurulur.
3. **Yayın kapısı:** `node scripts/archive/validate.mjs --strict` çalıştırılır.
   Yalnızca sıfır hata ve kabul edilebilir uyarılarla `published` yapılır.
4. **Yayın:** Kayıt `published` olur; `AUDIT.md` ve gerekirse test raporu
   güncellenir.
5. **Geri çekme:** Kaynak çürürse veya bilgi yanlışsa kayıt `reviewed`/`draft`
   durumuna alınır; silmek yerine düzeltme kaydı tutulur.

## Arama ve "Tarihte Bugün"

```js
import {
  loadArchive,
  searchRecords,
  todayInHistory,
  getRecordById,
} from "./scripts/archive/lib/index.mjs";

const { records } = await loadArchive();

const hits = searchRecords(records, "kategori:egitim yil:1924");
const today = todayInHistory(records, "2026-10-23");
const record = getRecordById(records, "tbmm-acilisi-1920");
```

- Varsayılan arama `published` kayıtları arar; `includeNonPublished: true` ile
  taslak/incelenmiş kayıtlar da görülebilir.
- `folded` mod `ı/i`, `İ/i`, `ş/s`, `ğ/g`, `ü/u`, `ö/o`, `ç/c` eşitler.
  `exact` mod Türkçe harf ayrımını korur.
- Süzgeçler: `yil:1923`, `yil:1920-1924`, `kategori:egitim`, `tur:event`,
  `etiket:TBMM`; programatik olarak `year`, `yearFrom`, `yearTo`, `category`,
  `type`, `tags`, `limit`.
- `todayInHistory` boş sonuçta `message` alanında sabit metni döndürür.

## Güvenlik sınırları

- Dış URL'ler yalnızca `https`, izinli kurumsal alan adları, 443 portu ve
  kimlik bilgisi içermeyen adresler olabilir.
- Metinlerde HTML/script, olay işleyicisi, `javascript:`/`data:` şeması,
  mojibake ve kontrol karakterleri reddedilir.
- JSON dosyaları 512 KiB, yerel görseller 2 MiB ve toplam kayıt sayısı 500 ile
  sınırlıdır.
- Prototip kirliliği anahtarları (`__proto__`, `prototype`, `constructor`)
  reddedilir.
- `--links` yönlendirmeleri elle izler; her yeni konak yeniden allowlist'e
  karşı denetlenir. Ağ isteği yalnızca bu seçenek verildiğinde yapılır.

## Katkı ve kapsam

Bu çalışma `content/`, `schemas/`, `scripts/archive/` ve `docs/content/`
dizinleriyle sınırlıdır. `web/`, CSS ve mevcut PR dosyaları değiştirilmez.
Yeni bir kaynak türü veya alan eklenirse önce şema, taksonomi, doğrulayıcı ve
testler birlikte güncellenir.
