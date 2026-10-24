# Doğrulanmış Arşiv Kataloğu

Bu dizin, ASRIN KEMALİ arşivinin doğrulanmış kurumsal kaynaklarla
genişletilmesini, hak/barındırma kararlarını, doğrulama yöntemini ve Codex'in
Next.js çalışmasına bağlanma biçimini belgeler.

- İlk genişletme: `feature/opencode-verified-catalog` dalında 50 kayıt.
- v06 genişletmesi: `feature/opencode-v06-archive-expansion` dalında 100 kayıt.
- Toplam: 18 eski kayıt + 150 yeni kayıt = **168 kayıt**.

## Özet

| Ölçüt | Sonuç |
|---|---:|
| v06 genişletmesinde eklenen kayıt | 100 |
| Toplam arşiv kaydı (eski 18 + yeni 150) | 168 |
| Yayımlandı (`published`) | 151 |
| İncelendi (`reviewed`) | 16 |
| Taslak (`draft`) | 1 |
| v06 kayıtlarında yayımlandı | 89 |
| v06 kayıtlarında incelendi | 11 |
| Yalnızca dış bağlantı (`holding.mode: external_link`) | 150 |
| Depoda barındırılan dosya/görsel/PDF | 0 |
| Yalnızca metadata (`metadata_only`) | 0 |
| Görselli kayıt (tamamı link-only) | 21 |
| Doğrulanmış alıntı | 2 |
| Kaynak URL denetimi | 176 benzersiz URL, 0 başarısız |
| Test | 74 / 74 geçti |

Doğrulama komutu sonucu: **168 kayıt, 151 yayımlandı, 16 incelendi, 1 taslak,
0 hata, 7 uyarı**. Uyarıların 3'ü Millî Kütüphane kayıtlarındaki tahmini yayın
yılından, 4'ü önceden var olan kayıtlardan gelir.

## Kaynak dağılımı

| Kurum | Kayıt | Tür dağılımı | Durum |
|---|---:|---|---|
| Atatürk Ansiklopedisi (ATAM) | 107 | 68 olay, 14 yayın, 6 belge, 17 mekân, 2 konuşma | 94 yayımlandı, 12 incelendi, 1 taslak |
| TBMM Tutanak Dergisi | 25 | 20 belge, 3 fotoğraf, 1 olay, 1 mekân | 24 yayımlandı, 1 incelendi |
| İBB Atatürk Kitaplığı | 18 | 9 belge, 6 fotoğraf, 3 yayın | 18 yayımlandı |
| ATAM Yayınları | 15 | 15 yayın | 15 yayımlandı |
| Millî Kütüphane | 3 | 3 yayın | 3 incelendi |
| **Toplam** | **168** | **69 olay, 35 belge, 35 yayın, 18 mekân, 9 fotoğraf, 2 konuşma** | **151 yayımlandı, 16 incelendi, 1 taslak** |

### v06 genişletmesinin dağılımı

| Kurum | Kayıt | Tür dağılımı | Durum |
|---|---:|---|---|
| Atatürk Ansiklopedisi | 70 | 40 olay, 15 mekân, 10 yayın, 5 belge | 59 yayımlandı, 11 incelendi |
| TBMM Tutanak Dergisi | 10 | 10 belge | 10 yayımlandı |
| İBB Atatürk Kitaplığı | 10 | 7 belge, 3 yayın | 10 yayımlandı |
| ATAM Yayınları | 10 | 10 yayın | 10 yayımlandı |
| **Toplam** | **100** | **40 olay, 17 belge, 13 yayın, 15 mekân** | **89 yayımlandı, 11 incelendi** |

## Barındırma kararı

Yeni eklenen 150 kaydın tamamı **yalnızca dış bağlantı** olarak sunulur:

- `holding.mode`: `external_link`
- `holding.filePath`: `null`
- `rights.status`: `official_link_only`
- Görselli İBB kayıtlarında `rights.imageReuse`: `link_only`
- Görselsiz kayıtlarda `rights.imageReuse`: `not_downloaded`
- `data/archive/files/` altında dosya yoktur.
- `data/archive/catalog/` altında yalnızca JSON kayıtları vardır; PDF, JPEG,
  PNG veya metin dosyası indirilmemiştir.

Nedenleri ve ileride dosya barındırma koşulları için
[HAKLAR-VE-BARINDIRMA.md](HAKLAR-VE-BARINDIRMA.md) dosyasına bakın.

## Dizinler

```text
data/archive/catalog/*.json          # 150 yeni kayıt (schemaVersion 1.1.0)
content/archive/records/*.json       # 18 mevcut kayıt (schemaVersion 1.0.0)
schemas/archive-record.schema.json   # v1.0.0 + v1.1.0 sözleşmesi
schemas/archive-record.types.ts      # TypeScript karşılığı
scripts/archive/lib/load.mjs         # iki dizini birlikte yükler
scripts/archive/lib/validate.mjs     # yayın kapısı + holding/citation kuralları
docs/archive/README.md               # bu dosya
docs/archive/KAYNAK-ENVANTERI.md     # kaynak/barındırma envanteri
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
Bu, yanlış negatifleri önler; 23.10.2026 tarihli çalıştırmada 176 URL'nin
tamamı başarılı oldu.

## Kapsam ve sınırlar

- Bu çalışma `web/`, CSS veya Codex'in Next.js dosyalarına dokunmaz.
- Mevcut 18 kayıt, testler ve veri modeli korunmuştur; şema yalnızca geriye
  uyumlu biçimde genişletilmiştir.
- Kayıtların `reviewedBy` alanı `OpenCode arşiv denetimi (yapay zekâ)` olarak
  tutulur. Bu, insan uzman onayı değildir.
- v06 genişletmesinde 70 Atatürk Ansiklopedisi kaydı, 10 TBMM tutanağı,
  10 İBB Atatürk Kitaplığı kaydı ve 10 ATAM yayını eklendi.
- 3 Millî Kütüphane kaydında katalog sayfasındaki `Yayın Tarihi` alanı boştur;
  yayın yılı yer numarasındaki yıl önekinden değerlendirilmiştir. Bu nedenle
  bu kayıtlar `published` değil `reviewed` durumundadır.
- Canlı yayın veya `main` dalına birleştirme bu çalışmanın kapsamında değildir.

## İlgili belgeler

- [Kaynak envanteri](KAYNAK-ENVANTERI.md)
- [Haklar ve barındırma](HAKLAR-VE-BARINDIRMA.md)
- [Doğrulama raporu](DOGRULAMA-RAPORU.md)
- [Codex entegrasyonu](CODEX-ENTEGRASYONU.md)
