# Web Dışı Entegrasyon Örneği

Bu belge, arşiv çekirdeğinin `web/` dizinine dokunmadan nasıl kullanılacağını
gösterir. Örnekler Node 22+ içindir; tarayıcıya özgü API kullanmaz. Web katmanı
bu modülleri kendi build/test hattına bağlayabilir.

## 1. Build veya test sırasında doğrulama

```js
// scripts/build-archive.mjs (örnek)
import {
  loadArchive,
  validateArchive,
} from "../scripts/archive/lib/index.mjs";

const archive = await loadArchive();
const result = await validateArchive(archive);

if (!result.ok) {
  for (const error of result.errors) {
    console.error(`[${error.code}] ${error.recordId ?? "-"} ${error.path}: ${error.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`${result.stats.total} kayıt doğrulandı.`);
}
```

Web uygulaması bu betiği build öncesi adım olarak çalıştırabilir. `web/`
dosyalarını değiştirmek gerekmez.

## 2. Arama sonuçlarını veri olarak almak

```js
import { loadArchive, searchRecords } from "../scripts/archive/lib/index.mjs";

const { records } = await loadArchive();

const hits = searchRecords(records, {
  q: "kategori:egitim yil:1924",
  limit: 20,
});

const cards = hits.map(({ record, snippet, matchedFields }) => ({
  id: record.id,
  title: record.title,
  date: record.date.display,
  type: record.type,
  summary: snippet,
  matchedFields,
  href: `/arsiv/${record.slug}`,
}));
```

- Varsayılan olarak yalnızca `published` kayıtlar döner.
- `includeNonPublished: true` yalnızca yönetim/önizleme ekranlarında
  kullanılmalıdır; herkese açık aramada kullanılmamalıdır.
- `matchedFields` alanı, sonuçta hangi alanların eşleştiğini göstermek için
  kullanılabilir.

### Süzgeçler

```js
searchRecords(records, { q: "meclis", year: 1920 });
searchRecords(records, { q: "meclis", yearFrom: 1919, yearTo: 1923 });
searchRecords(records, { q: "fotoğraf", type: "photograph" });
searchRecords(records, { q: "eğitim", category: "egitim" });
searchRecords(records, { q: "TBMM", tags: ["TBMM"] });
searchRecords(records, { q: "İSTİKLAL", mode: "exact" });
```

## 3. Kayıt detayı

```js
import { getRecordById } from "../scripts/archive/lib/index.mjs";

const record = getRecordById(records, "tbmm-acilisi-1920");
if (!record) {
  // 404
}
```

Detay ekranında:

- `record.summary` ve `record.description` düz metin olarak gösterilmelidir.
  HTML olarak yorumlanmamalıdır; gerekirse `escapeHtml` kullanılmalıdır.
- `record.source.url` ve `record.provenance[].url` yalnızca doğrulanmış dış
  bağlantı olarak render edilmelidir.
- `record.quotation` varsa `text`, `work`, `date`, `context` ve `sourceUrl`
  birlikte gösterilmelidir; alıntı tek başına gösterilmez.

```js
import { escapeHtml } from "../scripts/archive/lib/index.mjs";

const safeTitle = escapeHtml(record.title);
const safeSummary = escapeHtml(record.summary);
```

## 4. Görsel gösterimi

Görsel politikası veri katmanında uygulanır; web katmanı da buna uymalıdır:

```js
function imageView(record) {
  const image = record.image;
  if (!image) return null;
  if (record.rights.imageReuse === "link_only" || image.displayPolicy === "source_link_only") {
    return {
      kind: "source-link",
      href: image.sourcePageUrl,
      label: "Görseli kaynak sayfada aç",
      alt: image.alt,
      credit: image.credit,
    };
  }
  if (record.rights.imageReuse === "permitted" && image.url) {
    return {
      kind: "image",
      src: image.url,
      alt: image.alt,
      credit: image.credit,
    };
  }
  return null;
}
```

Kurallar:

- `link_only` görselde `image.url` zaten `null` olmalıdır; yine de savunmacı
  olarak kontrol edin.
- AI/temsili görsel (`image.kind: "ai_representative"`) tarihsel fotoğraf
  olarak gösterilmemelidir; yalnızca açık "temsili" etiketiyle ve yayımlanmamış
  önizlemelerde kullanılabilir.
- Görsel yüklenemezse alt metin ve kaynak bağlantısı korunmalıdır.

## 5. "Tarihte Bugün"

```js
import { todayInHistory, NO_RECORDS_MESSAGE } from "../scripts/archive/lib/index.mjs";

const result = todayInHistory(records, new Date());

if (result.records.length === 0) {
  // result.message === "Bugün için doğrulanmış kayıt eklenmedi"
  renderEmptyState(result.message);
} else {
  renderTimeline(result.records);
}
```

- Fonksiyon yalnızca `published`, `event`, `day` ve `exact` kayıtları seçer.
- Yıl serbesttir; 29 Ekim her yıl 29 Ekim'dir, ancak 23 Ekim için kayıt yoksa
  **hiçbir kayıt uydurulmaz**. Boş mesajı web katmanı kendi metniyle
  değiştirmemelidir.
- `includeNonPublished: true` yalnızca önizleme/QA içindir.
- `types` seçeneğiyle konuşma gibi ek türler dahil edilebilir; varsayılan
  yalnızca `event`'tir.

## 6. Alıntı gösterimi

```js
function quotationView(record) {
  const quote = record.quotation;
  if (!quote) return null;
  return {
    text: quote.text,
    speaker: quote.speaker,
    work: quote.work,
    date: quote.date,
    context: quote.context,
    source: { title: quote.sourceTitle, href: quote.sourceUrl },
    verified: quote.verified === true,
  };
}
```

Alıntı yalnızca `verified: true` ise gösterilmelidir. `quoteVerified` kontrolü
veri doğrulayıcı tarafından yapılır; web katmanı ayrıca `quote.verified` ve
`record.verification.status` alanlarını kontrol edebilir.

## 7. Önbellek ve güncelleme

- Kayıtlar küçük JSON dosyalarıdır; build sırasında bir kez yüklenip bellekte
  tutulabilir.
- Geliştirme sırasında dosya değişikliklerini izleyip `loadArchive()` yeniden
  çağrılabilir.
- Üretimde doğrulama çıktısı CI'da tutulmalı; çalışma zamanında her istekte
  tüm arşivi yeniden doğrulamak gerekmez.
- `--links` ağ erişimi gerektirir; çalışma zamanı isteklerinde değil,
  zamanlanmış bir işte çalıştırılmalıdır.

## 8. Hata durumları

| Durum | Öneri |
|---|---|
| `loadArchive().errors` dolu | Build'i durdur; eksik/bozuk JSON'u düzelt |
| `validateArchive().ok === false` | Yayına alma; hata kodlarını göster |
| Kayıt bulunamadı | 404 |
| Görsel `link_only` | Görseli gömme; kaynak bağlantısı ver |
| "Tarihte Bugün" boş | Sabit boş mesajı göster |
| Kaynak URL'si kırık | Kaydı `reviewed`/`draft` yap; [KAYNAK-DUZELTME.md](KAYNAK-DUZELTME.md) |

## 9. Kapsam sınırı

Bu örnekler `web/`, CSS, bileşen veya rota dosyalarını değiştirmez. Web
katmanının hangi framework'ü kullandığından bağımsızdır; yalnızca
`scripts/archive/lib/index.mjs` sözleşmesine bağlıdır.
