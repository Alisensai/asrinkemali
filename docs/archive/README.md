# Doğrulanmış Arşiv Kataloğu

Bu dizin, `feature/opencode-verified-catalog` dalında eklenen 50 gerçek kurumsal
kaynağın kataloğunu, hak/barındırma kararlarını, doğrulama yöntemini ve Codex'in
Next.js çalışmasına bağlanma biçimini belgeler.

## Özet

| Ölçüt | Sonuç |
|---|---:|
| Yeni katalog kaydı | 50 |
| Toplam arşiv kaydı (eski 18 + yeni 50) | 68 |
| Yeni kayıtlarda `published` | 47 |
| Yeni kayıtlarda `reviewed` | 3 |
| Yeni kayıtlarda `draft` | 0 |
| Yalnızca dış bağlantı (`holding.mode: external_link`) | 50 |
| Depoda barındırılan dosya/görsel/PDF | 0 |
| Yalnızca metadata (`metadata_only`) | 0 |
| Yeni görselli kayıt (tamamı link-only) | 8 |
| Yeni doğrulanmış alıntı | 1 |
| Kaynak URL denetimi | 72 benzersiz URL, 0 başarısız |
| Test | 74 / 74 geçti |

Doğrulama komutu sonucu: **68 kayıt, 62 yayımlandı, 5 incelendi, 1 taslak,
0 hata, 7 uyarı**. Uyarıların 3'ü yeni Millî Kütüphane kayıtlarındaki tahmini
yayın yılından, 4'ü önceden var olan kayıtlardan gelir.

## Kaynak dağılımı

| Kurum | Kayıt | Tür dağılımı | Durum |
|---|---:|---|---|
| Atatürk Ansiklopedisi (ATAM) | 24 | 21 olay, 1 konuşma, 2 yayın | 24 yayımlandı |
| TBMM Tutanak Dergisi | 10 | 10 belge | 10 yayımlandı |
| İBB Atatürk Kitaplığı | 8 | 6 fotoğraf, 2 belge | 8 yayımlandı |
| ATAM Yayınları | 5 | 5 yayın | 5 yayımlandı |
| Millî Kütüphane | 3 | 3 yayın | 3 incelendi |
| **Toplam** | **50** | **21 olay, 1 konuşma, 12 belge, 10 yayın, 6 fotoğraf** | **47 yayımlandı, 3 incelendi** |

Türlerin toplam arşivdeki karşılığı: 29 olay, 2 konuşma, 13 belge, 12 yayın,
9 fotoğraf ve 3 mekân.

## Barındırma kararı

50 kaydın tamamı **yalnızca dış bağlantı** olarak sunulur:

- `holding.mode`: `external_link`
- `holding.filePath`: `null`
- `rights.status`: `official_link_only`
- Görselli 8 İBB kaydında `rights.imageReuse`: `link_only`
- Görselsiz 42 kayıtta `rights.imageReuse`: `not_downloaded`
- `data/archive/files/` altında dosya yoktur.
- `data/archive/catalog/` altında yalnızca 50 JSON dosyası vardır; PDF, JPEG,
  PNG veya metin dosyası indirilmemiştir.

Nedenleri ve ileride dosya barındırma koşulları için
[HAKLAR-VE-BARINDIRMA.md](HAKLAR-VE-BARINDIRMA.md) dosyasına bakın.

## Dizinler

```text
data/archive/catalog/*.json          # 50 yeni kayıt (schemaVersion 1.1.0)
content/archive/records/*.json       # 18 mevcut kayıt (schemaVersion 1.0.0)
schemas/archive-record.schema.json   # v1.0.0 + v1.1.0 sözleşmesi
schemas/archive-record.types.ts      # TypeScript karşılığı
scripts/archive/lib/load.mjs         # iki dizini birlikte yükler
scripts/archive/lib/validate.mjs     # yayın kapısı + holding/citation kuralları
docs/archive/README.md               # bu dosya
docs/archive/KAYNAK-ENVANTERI.md     # 50 kaydın tek tek kaynak/barındırma tablosu
docs/archive/HAKLAR-VE-BARINDIRMA.md # telif, link-only ve dosya politikası
docs/archive/DOGRULAMA-RAPORU.md     # doğrulama, link ve test sonuçları
docs/archive/CODEX-ENTEGRASYONU.md   # Next.js/Codex bağlantı talimatı
```

## Komutlar

```bash
# Yapısal ve iş kuralı doğrulaması (çevrimdışı)
node scripts/archive/validate.mjs

# Kaynak URL'lerini sırayla denetle (kurumların hız sınırına saygılı)
node scripts/archive/validate.mjs --links

# Testler
node --test "scripts/archive/tests/*.test.mjs"
```

`--links` denetimi, Millî Kütüphane ve benzeri kurumların hızlı ardışık HEAD
isteklerine 400 dönebilmesi nedeniyle CLI içinde `concurrency: 1` ile çalışır.
Bu, yanlış negatifleri önler; 23.10.2026 tarihli çalıştırmada 72 URL'nin
tamamı başarılı oldu.

## Kapsam ve sınırlar

- Bu çalışma `web/`, CSS veya Codex'in Next.js dosyalarına dokunmaz.
- Mevcut 18 kayıt, testler ve veri modeli korunmuştur; şema yalnızca geriye
  uyumlu biçimde genişletilmiştir.
- Kayıtların `reviewedBy` alanı `OpenCode arşiv denetimi (yapay zekâ)` olarak
  tutulur. Bu, insan uzman onayı değildir.
- 3 Millî Kütüphane kaydında katalog sayfasındaki `Yayın Tarihi` alanı boştur;
  yayın yılı yer numarasındaki yıl önekinden değerlendirilmiştir. Bu nedenle
  bu kayıtlar `published` değil `reviewed` durumundadır.
- Canlı yayın veya `main` dalına birleştirme bu çalışmanın kapsamında değildir.

## İlgili belgeler

- [Kaynak envanteri](KAYNAK-ENVANTERI.md)
- [Haklar ve barındırma](HAKLAR-VE-BARINDIRMA.md)
- [Doğrulama raporu](DOGRULAMA-RAPORU.md)
- [Codex entegrasyonu](CODEX-ENTEGRASYONU.md)
