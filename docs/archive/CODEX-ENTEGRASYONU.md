# Codex Entegrasyonu

Bu belge, Codex'in Next.js çalışmasının güncel arşiv kataloğunu nasıl
tüketebileceğini açıklar. Bu dalda `web/`, CSS veya Codex'in Next.js dosyaları
değiştirilmemiştir.

## 1. Dal ve PR

- Çalışma dalı: `feature/opencode-v06-archive-expansion`
- Hedef PR tabanı: `integration/asrinkemali-v05-release-candidate`
- `main` dalına birleştirme veya canlı yayın bu çalışmanın kapsamı dışındadır.
- Daha önce açılan PR #5 `main` hedeflidir; bu çalışma için kullanılmamalıdır.
- PR #9 farklı bir entegrasyon hattına (`integration/nextjs-visual-v03`)
  aittir; bu çalışmanın PR'ı değildir.
- Bu çalışma için `integration/asrinkemali-v05-release-candidate` tabanlı yeni
  bir **draft** PR açılmalıdır.

Codex iki yoldan biriyle ilerleyebilir:

1. **Önerilen:** PR birleştirildikten sonra
   `integration/asrinkemali-v05-release-candidate` dalını güncellemek.
2. PR birleşmeden denemek için yalnızca şu dosyaları kendi dalına almak:
   - `data/archive/catalog/*.json`
   - `schemas/archive-record.schema.json`
   - `schemas/archive-record.types.ts`
   - `scripts/archive/lib/load.mjs`
   - `scripts/archive/lib/validate.mjs`
   - `scripts/archive/lib/security.mjs`
   - `scripts/archive/lib/search.mjs`
   - `scripts/archive/validate.mjs`
   - ilgili testler

`content/archive/records/` altındaki 18 mevcut kayıt korunmalıdır; yeni
katalog onların yerine geçmez, yanlarına eklenir.

## 2. Veri yükleme

`loadArchive()` iki dizini birlikte okur:

```js
import { loadArchive } from "../scripts/archive/lib/index.mjs";

const archive = await loadArchive();

if (archive.errors.length > 0) {
  throw new Error(archive.errors.join("\n"));
}

const records = archive.records; // 18 eski + 150 yeni = 168
```

Yükleme sırası:

1. `content/archive/records/` (eski kayıtlar, `source: "legacy"`)
2. `data/archive/catalog/` (yeni kayıtlar, `source: "catalog"`)

Codex kendi loader'ını kullanıyorsa aynı iki dizini birleştirmeli ve dosya
adı çakışmalarını `id`/`slug` ile kontrol etmelidir. Yeni kayıtların dosya
adları `id` ile aynıdır.

## 3. Şema v1.1.0

Yeni kayıtlar `schemaVersion: "1.1.0"` taşır. Eklenen alanlar:

```json
{
  "holding": {
    "mode": "external_link",
    "filePath": null,
    "note": "Kaynak yalnızca kurum sayfasında sunulur; dosya indirilmedi."
  },
  "source": {
    "citation": "Atatürk Ansiklopedisi, “Havza Genelgesi”, erişim 23.10.2026."
  }
}
```

- `holding.mode`: `external_link`, `hosted_file` veya `metadata_only`.
- `holding.filePath`: yalnızca `hosted_file` modunda ve
  `data/archive/files/` altında dolu olabilir.
- `source.citation`: kaynak künyesi; arama alanlarına dahildir.

Mevcut v1.0.0 kayıtları geçerlidir; `holding` ve `citation` opsiyoneldir.
TypeScript tarafında `schemas/archive-record.types.ts` güncellenmiştir.

## 4. UI eşlemesi

Önerilen kart/detay alanları:

| Arşiv alanı | Next.js'te kullanım |
|---|---|
| `id`, `slug` | Route parametresi, anahtar |
| `title` | Başlık |
| `type` | Tür rozeti; `event`, `speech`, `document`, `publication`, `photograph`, `place` |
| `date.display` | Görünen tarih |
| `date.certainty` | `estimated` ise "tahmini" etiketi |
| `summary` | Kart özeti |
| `description` | Detay metni |
| `people`, `locations`, `categories` | Etiket ve filtreler |
| `source.institution` | Kaynak kurum |
| `source.citation` | Künye bloğu |
| `source.url` | "Kaynağı aç" bağlantısı |
| `holding.mode` | "Dış bağlantı" / "Barındırılan dosya" / "Yalnızca künye" |
| `rights.status` | "Yalnızca resmî bağlantı" rozeti |
| `image.sourcePageUrl` | Görsel için kaynak sayfa bağlantısı |
| `verification.status` | `published` / `reviewed` / `draft` |
| `quotation` | Varsa alıntı bloğu ve kanıt bağlantısı |

### Görsel ve dosya davranışı

Yeni eklenen 150 kaydın tamamı `holding.mode: "external_link"` ve
`rights.status: "official_link_only"` kullanır. Bu nedenle:

- `image.url` ve `image.localPath` boştur; görsel dosyası sunulmamalıdır.
- Kartlarda `<img src={image.url}>` kullanılmamalıdır.
- Görsel için `image.sourcePageUrl` adresine giden bir bağlantı gösterilmelidir.
- PDF/görsel indirme düğmesi eklenmemelidir.
- Dış bağlantılar `target="_blank" rel="noopener noreferrer"` ile açılmalıdır.
- 21 kayıtta görsel vardır; tamamı `rights.imageReuse: "link_only"` ve
  `image.displayPolicy: "source_link_only"` durumundadır.

### Yayın durumu

- `verification.status === "published"`: normal listede gösterilebilir (151
  kayıt).
- `verification.status === "reviewed"`: "İnceleniyor" etiketiyle gösterilmeli
  ve varsayılan olarak yayımlanmış sayılmamalıdır. 16 kayıt bu durumdadır:
  12 Atatürk Ansiklopedisi, 1 TBMM ve 3 Millî Kütüphane kaydı.
- `verification.status === "draft"`: yalnızca editör/geliştirme görünümünde.
  1 Atatürk Ansiklopedisi kaydı bu durumdadır.

`searchRecords()` varsayılan olarak yalnızca `published` kayıtları döndürür.
İnceleme ekranı için `includeNonPublished: true` kullanılabilir.

## 5. Örnek veri dönüşümü

```js
import { loadArchive } from "../scripts/archive/lib/index.mjs";

const { records } = await loadArchive();
const visible = records.filter((record) => record.verification.status === "published");

const cards = visible.map((record) => ({
  id: record.id,
  href: `/arsiv/${record.slug}`,
  title: record.title,
  type: record.type,
  date: record.date.display,
  estimatedDate: record.date.certainty === "estimated",
  summary: record.summary,
  institution: record.source.institution,
  citation: record.source.citation ?? null,
  sourceUrl: record.source.url,
  holding: record.holding?.mode ?? "external_link",
  rights: record.rights.status,
  imagePageUrl: record.image?.sourcePageUrl ?? null,
  verification: record.verification.status,
}));
```

Detay sayfasında `description`, `people`, `locations`, `categories`,
`provenance` ve varsa `quotation` gösterilebilir. `provenance` alanı kaynağın
erişim tarihini ve doğrulama izini taşır.

## 6. Arama ve filtreler

`searchRecords(records, query, options)` Türkçe küçük/büyük harf, `ı/i`,
`İ/i` ve `ş/s` eşitlemesini destekler. `source.citation` da arama alanlarına
eklenmiştir. Örnek:

```js
import { searchRecords } from "../scripts/archive/lib/search.mjs";

const hits = searchRecords(records, {
  q: "meclis",
  type: "document",
  includeNonPublished: false,
});
```

Filtreler için mevcut `type`, `category`, `year` ve `tag` seçenekleri
kullanılabilir. Güncel katalogda 168 kayıt vardır: 107 Atatürk Ansiklopedisi,
25 TBMM Tutanağı, 18 İBB Atatürk Kitaplığı, 15 ATAM Yayını ve 3 Millî
Kütüphane kaydı. Bunların 150'si yeni, 18'i eski kayıttır.

## 7. Doğrulama ve test

Codex, birleştirme öncesi şu komutları çalıştırmalıdır:

```bash
node scripts/archive/validate.mjs
node scripts/archive/validate.mjs --links
node --test "scripts/archive/tests/*.test.mjs"
```

Beklenen sonuçlar:

- 168 kayıt, 151 yayımlandı, 16 incelendi, 1 taslak
- 0 hata, 7 uyarı
- 176 benzersiz URL, 0 başarısız
- 74 test geçer

`--links` ağ erişimi gerektirir ve kurum hız sınırları nedeniyle sırayla
çalışır. CI'da ağ erişimi yoksa yalnızca çevrimdışı `validate.mjs` ve testler
çalıştırılmalıdır.

## 8. Çakışma ve sınırlar

- Bu dal `web/` altına dokunmaz; Codex'in Next.js bileşenleri, stilleri ve
  route'ları değiştirilmemiştir.
- Ortak değişen dosyalar: `scripts/archive/lib/load.mjs`,
  `scripts/archive/lib/validate.mjs`, `scripts/archive/lib/search.mjs`,
  `schemas/archive-record.schema.json`, `schemas/archive-record.types.ts`.
  Codex bu dosyalarda kendi değişikliklerini yaptıysa merge sırasında iki
  dizinli yükleme ve v1.1.0 alanları korunmalıdır.
- `data/archive/catalog/` kayıtları elle düzenlenmemelidir; düzeltme
  gerekiyorsa kayıt `reviewed`/`draft` durumuna alınmalı ve doğrulama
  çalıştırılmalıdır.
- Yeni kayıt eklemek için gerçek, doğrulanabilir kurum kaynağı kullanılmalıdır;
  sayıyı doldurmak için uydurma kayıt veya bağlantı eklenmemelidir.
- İndirilmiş PDF/görsel eklenmemelidir; bu çalışma yalnızca dış bağlantı
  politikasıyla hazırlanmıştır.

## 9. Teslim sonrası kontrol listesi

- [ ] `loadArchive()` 168 kayıt döndürüyor.
- [ ] `published` 151, `reviewed` 16, `draft` 1.
- [ ] 16 `reviewed` kayıt (12 Atatürk Ansiklopedisi, 1 TBMM, 3 Millî Kütüphane)
      varsayılan listede görünmüyor.
- [ ] 11 tarih aralığı/yıl hassasiyetli Atatürk Ansiklopedisi kaydı ile
      1 TBMM kaydı `reviewed` durumunda.
- [ ] Kartlarda görsel URL'si yerine `sourcePageUrl` bağlantısı kullanılıyor.
- [ ] Dış bağlantılar yeni sekmede ve `noopener noreferrer` ile açılıyor.
- [ ] `source.citation` detay sayfasında gösteriliyor.
- [ ] `date.certainty === "estimated"` için "tahmini" etiketi var.
- [ ] `data/archive/files/` altında dosya yok.
- [ ] `validate.mjs`, `--links` ve testler geçiyor.
- [ ] PR `integration/asrinkemali-v05-release-candidate` tabanlı ve draft.
