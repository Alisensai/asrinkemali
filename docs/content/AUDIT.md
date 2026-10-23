# Arşiv Veri Denetimi (AUDIT)

- **Tarih:** 23 Ekim 2026
- **Dal:** `feature/opencode-source-archive`
- **Kapsam:** `content/archive/`, `schemas/`, `scripts/archive/`, `docs/content/`
- **Yöntem:** Şema + iş kuralı doğrulaması, iki ayrı veri inceleme turu, bağlantı
  denetimi ve tekrarlanabilir testler.
- **Denetleyen:** OpenCode arşiv denetimi (yapay zekâ). Bu bir insan uzman
  imzası değildir; yayın öncesi insan gözden geçirmesi önerilir.

## Özet

| Ölçüt | Sonuç |
|---|---|
| Toplam kayıt | 18 |
| Yayımlandı / incelendi / taslak | 15 / 2 / 1 |
| Tür dağılımı | 3 fotoğraf, 1 belge, 1 konuşma, 8 olay, 2 yayın, 3 mekân |
| Doğrulama hatası | 0 |
| Doğrulama uyarısı | 4 (beklenen) |
| Tekil kaynak URL'si | 17 |
| Erişilebilir URL | 17 / 17 (HTTP 200) |
| Kırık bağlantı | 0 |
| Yinelenen id/slug/başlık | 0 |
| NFC dışı veya mojibake metin | 0 |
| Tarihi bilinmeyen kayıt | 1 (taslak) |
| Hakkı bilinmeyen kayıt | 2 (1 incelendi, 1 taslak) |
| Doğrudan alıntı | 1 (kaynak pasajında birebir doğrulandı) |
| İndirilen görsel | 0 |
| AI/temsili tarihsel görsel | 0 |

Komutlar:

```bash
node scripts/archive/validate.mjs
node scripts/archive/validate.mjs --links
node --test "scripts/archive/tests/*.test.mjs"
```

Son doğrulama çıktısı: `0 hata, 4 uyarı`; testler: `68/68 başarılı`.
Bağlantı denetimi: `17 URL, 0 başarısız`.

## Kayıt envanteri

| Kayıt | Tür | Tarih | Durum | Kaynak kurumu | Hak durumu |
|---|---|---|---|---|---|
| `1924-anayasasi` | document | 20 Nisan 1924 | published | Atatürk Ansiklopedisi | official_link_only |
| `anitkabir` | place | 10 Kasım 1953 | published | Atatürk Ansiklopedisi | official_link_only |
| `cumhuriyetin-ilani-1923` | event | 29 Ekim 1923 | published | Atatürk Ansiklopedisi | official_link_only |
| `harf-devrimi-1928` | event | 1 Kasım 1928 | published | Atatürk Ansiklopedisi | official_link_only |
| `i-tbmm-binasi` | place | 23 Nisan 1920 – 15 Ekim 1924 | published | TBMM | official_link_only |
| `ii-inonu-zaferi-fotografi-1921` | photograph | 10 Nisan 1921 | reviewed | TBMM | official_link_only |
| `kadinlara-secme-secilme-hakki-1934` | event | 5 Aralık 1934 | published | Atatürk Ansiklopedisi | official_link_only |
| `lozan-baris-antlasmasi-1923` | event | 24 Temmuz 1923 | published | Atatürk Ansiklopedisi | official_link_only |
| `meclis-onunde-dua-1920` | photograph | 6 Mayıs 1920 | published | TBMM | official_link_only |
| `nutuk-1928` | publication | Temmuz 1928 | published | Atatürk Ansiklopedisi | official_link_only |
| `onuncu-yil-nutku-1933` | speech | 29 Ekim 1933 | published | Atatürk Ansiklopedisi | official_link_only |
| `saltanatin-kaldirilmasi-1922` | event | 1 Kasım 1922 | published | Atatürk Ansiklopedisi | official_link_only |
| `samsun-cikarmasi-1919` | event | 19 Mayıs 1919 | published | Atatürk Ansiklopedisi | official_link_only |
| `selanikteki-ataturk-evi` | place | Tarih bilinmiyor | draft | Atatürk Ansiklopedisi | unknown |
| `tbmm-acilis-fotografi-1920` | photograph | 23 Nisan 1920 | published | TBMM | official_link_only |
| `tbmm-acilisi-1920` | event | 23 Nisan 1920 | published | TBMM | official_link_only |
| `tevhid-i-tedrisat-1924` | event | 3 Mart 1924 | published | Atatürk Ansiklopedisi | official_link_only |
| `vatandas-icin-medeni-bilgiler-1930` | publication | 1930 | reviewed | Atatürk Ansiklopedisi | unknown |

## Birinci tur — yapısal ve veri bütünlüğü

### Bulgular

1. **Taksonomi şema hatası:** Hak durumu kimlikleri (`public_domain`,
   `official_link_only` vb.) alt çizgi içeriyor; taksonomi şemasındaki desen
   yalnızca tire kabul ediyordu. Bu, 6 geçersiz `TAKSONOMI_SEMA` hatası
   üretiyordu. Desen `^[a-z0-9]+(?:[-_][a-z0-9]+)*$` olarak düzeltildi.
2. **Alıntı kapısı çelişkisi:** Yayın kapısı, doğrudan alıntı içermeyen
   kayıtlarda da `quoteVerified: true` istiyordu. Alıntısız kayıtlar
   `quoteVerified: false` taşıdığı için bu kayıtlar yayımlanamıyordu. Kural,
   `quoteVerified` yalnızca `quotation` nesnesi varsa aranacak şekilde
   düzeltildi; alıntı yokken `true` değeri ayrıca hata sayılıyor.
3. **Eksik tarihler:** 1 kayıtta tarih tamamen bilinmiyor
   (`selanikteki-ataturk-evi`, taslak). 3 kayıtta gün hassasiyeti yok:
   `i-tbmm-binasi` aralık, `nutuk-1928` ay, `vatandas-icin-medeni-bilgiler-1930`
   yıl. Yayımlanmış tüm `event` kayıtları gün hassasiyetinde ve kesindir.
4. **Yinelenen kayıt:** id, slug, başlık ve başlık/tür/tarih bileşimi
   denetimlerinde yinelenen kayıt bulunmadı. `relatedIds` bağlantılarının
   tamamı mevcut kayıtlara işaret ediyor.
5. **Unicode:** Tüm metinler NFC biçiminde; mojibake, değiştirme karakteri
   (U+FFFD) veya kontrol karakteri bulunmadı. Türkçe karakterler korunuyor.
6. **Yayın durumları:** 15 `published`, 2 `reviewed`, 1 `draft`. Yayımlanan
   kayıtların tamamında kurumsal kaynak, provenans, uygun hak durumu,
   inceleyen/inceleme tarihi ve yayın kapısı kontrolleri tamam.

### Düzeltmeler

- `schemas/archive-taxonomy.schema.json`: kimlik deseni alt çizgiyi kabul eder.
- `scripts/archive/lib/validate.mjs`: `quoteVerified` koşullu hale getirildi.
- `scripts/archive/lib/text.mjs` + `search.mjs`: `exact` aramada token'ların
  yanlışlıkla `folded` modda üretilmesi düzeltildi; `Işık`/`ışık` ayrımı artık
  korunuyor.
- `scripts/archive/lib/links.mjs`: yönlendirme sonrası `finalUrl` ve 3xx
  davranışı netleştirildi; güvenli olmayan yönlendirmeler reddediliyor.

## İkinci tur — kaynak, künye ve yayın kapısı

### Bağlantı denetimi

`node scripts/archive/validate.mjs --links` ile 17 tekil URL denetlendi.
Tümü 23 Ekim 2026 tarihinde HTTP 200 döndü; kırık bağlantı yok. Kaynaklar
Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi) ve TBMM Kurtuluş Savaşı
Müzesi'dir. Bağlantı denetimi ağa bağlıdır; sonuç bir nokta-atışıdır ve
ileride değişebilir.

### Kaynak ve künye incelemesi

- **TBMM açılışı ve fotoğrafları:** Kurumsal müze sayfalarındaki tarihler ve
  fotoğraf açıklamaları karşılaştırıldı. `tbmm-acilisi-1920`,
  `tbmm-acilis-fotografi-1920` ve `meclis-onunde-dua-1920` yayımlandı.
- **II. İnönü fotoğrafı:** Albümde 10 Nisan 1921 tarihi veriliyor; II. İnönü
  Muharebeleri'nin bilinen aralığı 31 Mart – 1 Nisan 1921'dir. Bu çelişki
  giderilmediği için kayıt `reviewed` bırakıldı; insan uzman denetimi gerekir.
- **Nutuk:** Metin 15–20 Ekim 1927'de okundu; kayıt, Temmuz 1928'deki ilk
  baskıyı tarihler. Bu ayrım kayıt notunda ve `date.note` alanında açıklandı.
- **Vatandaş İçin Medenî Bilgiler:** 1930 ilk baskısı ve Afet İnan imzası
  kurumsal maddeyle doğrulandı; metin/görsel yeniden kullanım hakkı
  doğrulanmadığı için kayıt `reviewed` ve hak durumu `unknown`.
- **Selanik'teki Atatürk Evi:** Evin inşa tarihi ve Atatürk'ün burada yaşadığı
  dönem kesinleştirilmedi; hak durumu da bilinmiyor. Kayıt `draft`.
- **Onuncu Yıl Nutku:** Tek doğrudan alıntı bu kayıtta. Alıntı, Atatürk
  Ansiklopedisi'ndeki konuşma metninden birebir alındı; eser, tarih, bağlam ve
  kaynak pasajı kayıtta mevcut. Görsel tasarım metni kaynak olarak
  kullanılmadı.
- **Diğerleri:** 1924 Anayasası, Anıtkabir, Cumhuriyet'in ilanı, Harf Devrimi,
  kadınlara seçme/seçilme hakkı, Lozan, Saltanatın kaldırılması, Samsun'a
  çıkış ve Tevhid-i Tedrisat kayıtları kurumsal ansiklopedi maddeleriyle
  karşılaştırıldı.

### Yayın kapısı sonucu

- Yayımlanan 15 kaydın tamamı kurumsal kaynaklı, provenanslı ve
  `official_link_only` hak durumundadır.
- Hiçbir görsel indirilmedi; üç fotoğraf kaydı yalnızca kaynak sayfaya
  bağlantı veriyor (`image.url: null`, `displayPolicy: "source_link_only"`).
- Hiçbir AI/temsili görsel tarihsel kayıt olarak kullanılmadı.
- Hak durumu `unknown` olan iki kayıt yayımlanmadı.
- Tarihi bilinmeyen tek kayıt taslakta kaldı.

## Kalan riskler ve öneriler

1. **İnsan uzman incelemesi:** Özellikle `ii-inonu-zaferi-fotografi-1921`
   tarih çelişkisi ve `vatandas-icin-medeni-bilgiler-1930` hak durumu için
   uzman/insan doğrulaması gerekir.
2. **Bağlantı çürümesi:** Kurumsal sayfalar taşınabilir. `--links` düzenli
   aralıklarla çalıştırılmalı; kırılan bağlantıda kayıt derhal
   `reviewed`/`draft` durumuna alınmalıdır.
3. **URL kodlaması:** Atatürk Ansiklopedisi URL'lerinde Türkçe karakterler
   bulunur. Tarayıcılar bunları kodlar; yeni kayıt eklerken URL'nin gerçekten
   açıldığı doğrulanmalıdır.
4. **AI denetiminin sınırı:** `reviewedBy` alanı yapay zekâ denetimini açıkça
   belirtir. Bu, kurumsal veya akademik insan onayı yerine geçmez.
5. **Gelecekteki kayıtlar:** Yeni bir kayıt eklendiğinde aynı iki turlu denetim
   (yapısal + kaynak/künye) tekrarlanmalı ve bu dosyaya tarihli bir bölüm
   eklenmelidir.
