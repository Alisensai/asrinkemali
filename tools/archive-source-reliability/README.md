# Arşiv Kaynak Güvenilirliği (v0.7)

Bu araç, 168 kayıtlık ASRIN KEMALİ arşivinin kaynaklarını **salt okunur** biçimde inceler. Amaç yeni kayıt üretmek değil; mevcut kayıtların kaynak URL'lerini, kaynak türünü, tarih kesinliğini, görsel haklarını, insan incelemesi durumunu ve 1881-1918 dönem kapsamını görünür kılmaktır.

Araç `feature/opencode-v07-source-reliability` dalında geliştirilmiştir ve v06 arşivini (`feature/opencode-v06-archive-expansion`) temel alır. `main` dalına merge veya herhangi bir deployment yapmaz.

## Güvenlik sınırları

- `data/archive/` ve `content/archive/` **hiçbir zaman yazılmaz**. Rapor çıktıları için `assertSafeOutputDir` bu dizinleri ve `.git/` dizinini reddeder.
- `web/` ve Codex/Next.js dosyaları değiştirilmez; Copilot insan inceleme sistemiyle etkileşime girilmez.
- Varsayılan çalışma **çevrimdışıdır**. Ağ isteği yalnızca açıkça `--online` verildiğinde yapılır.
- Raporlar yalnızca `--write` verildiğinde yazılır. Varsayılan komut yalnızca terminale özet basar.
- Aday kaynaklar `status: unverified` ve `ingest: false` olarak kalır; otomatik arşivleme yoktur.
- İnsan inceleme raporu yalnızca iş listesi üretir; herhangi bir inceleme kaydını güncellemez.
- Kaynak geçmişi defteri araç tarafından yönetilir. `history --write` yalnızca bu defteri yazar; arşiv kayıtlarını değiştirmez.

## Hızlı başlangıç

```powershell
cd tools/archive-source-reliability

# 84 araç testi
node --test "tests/*.test.mjs"

# Çevrimdışı özet (yazma yok)
node src/cli.mjs report

# Makine-okunur çıktı
node src/cli.mjs report --json --generated-at 2026-10-23

# Çevrimdışı raporları reports/ altına yaz
node src/cli.mjs report --write --generated-at 2026-10-23

# Çevrimiçi bağlantı denetimiyle raporları yenile
node src/cli.mjs report --write --online --concurrency 4 --generated-at 2026-10-23

# Kritik kontrol; hata varsa çıkış kodu 1
node src/cli.mjs check --generated-at 2026-10-23
```

Repo kökünden mevcut arşiv doğrulaması:

```powershell
node scripts/archive/validate.mjs
node --test "scripts/archive/tests/*.test.mjs"
```

> Node 24'te `node --test tests` dizini modül olarak çözmeye çalışıp hata verir. Bu nedenle test komutunda `"tests/*.test.mjs"` globu kullanılmalıdır.

## Komutlar

| Komut | İşlev |
| --- | --- |
| `node src/cli.mjs report` | Tam katalog kalite raporu; varsayılan olarak özet basar. |
| `node src/cli.mjs report --json` | Tam raporu deterministik JSON olarak basar. |
| `node src/cli.mjs report --markdown` | Yönetici markdown raporunu basar. |
| `node src/cli.mjs report --write` | 16 rapor dosyasını güvenli çıktı dizinine yazar. |
| `node src/cli.mjs report --write --online` | Kaynak URL'lerini ağ üzerinden denetleyerek raporları yeniler. |
| `node src/cli.mjs inventory` | Kaynak URL envanteri. |
| `node src/cli.mjs history` | Kaynak URL geçmişi ve sapma denetimi. |
| `node src/cli.mjs candidates` | Erken dönem adaylarını listeler. |
| `node src/cli.mjs links` | Bağlantı denetimi; komut gereği çevrimiçidir. |
| `node src/cli.mjs check` | Kritik kontroller; kritik bulgu varsa çıkış kodu 1. |

Yararlı seçenekler: `--root`, `--out`, `--candidate-file`, `--history-file`, `--coverage-config`, `--concurrency`, `--timeout`, `--generated-at`.

### Defter ve aday bakımı

```powershell
# Yeni arşiv kayıtları için eksik defter girdilerini ekle; yalnızca defteri yazar
node src/cli.mjs history --seed-history --write

# Uzman incelemesinden sonra kabul edilen URL değişikliklerini deftere işle
node src/cli.mjs history --accept-history --write

# AYK API'sinden aday metadata'sını yenile; adayı onaylamaz veya arşive eklemez
node src/cli.mjs candidates --refresh-candidates --write
```

`--seed-history` ve `--accept-history` yalnızca `data/source-history.json` dosyasını etkiler; arşiv kayıtları salt okunur kalır. `--refresh-candidates` aday dosyasını güncelleyebilir, ancak `ingest: false` politikasını değiştirmez.

## Rapor envanteri

`reports/` altında 16 dosya üretilir:

| Dosya | İçerik |
| --- | --- |
| `catalog-quality.md` / `.json` | Yönetici özeti, kalite puanı, öne çıkan bulgular ve tüm denetim bölümleri. |
| `source-inventory.md` / `.json` | Kayıt bazında kaynak, kurum, provenans, alıntı ve görsel URL'leri. |
| `source-classification.md` | Birincil/ikincil/referans sınıflandırması ve kurum kırılımı. |
| `shared-sources.md` | Aynı resmî kaynağa bağlı kayıt grupları. |
| `source-url-history.md` | Özgün/güncel URL'ler ve kabul edilmiş değişiklik defteri. |
| `date-and-source-audit.md` | Tarih kesinliği ve kaynak yeterliliği. |
| `unknown-rights-images.md` | Yeniden kullanım hakkı doğrulanmamış görseller. |
| `human-review-required.md` | İnsan uzman onayı olmayan 168 kaydın iş listesi. |
| `early-period-coverage.md` | 1881-1918 kapsamı, evre matrisi ve boşluklar. |
| `early-period-candidates.md` / `.json` | Doğrulanmamış erken dönem adayları. |
| `link-check.md` / `.json` | Çevrimdışı/çevrimiçi bağlantı denetimi, kırık ve yönlendirilen URL'ler. |
| `README.md` | Üretilen raporların dizini. |

## Denetim yöntemi

### Kaynak sınıflandırması

Sınıflandırma, kaydın konusunun tarihsel değerini değil, **bağlantılı kaynak sayfasının kanıt rolünü** anlatır:

- **primary**: TBMM ve İBB arşiv belgesi/fotoğrafı gibi resmî arşiv öğeleri.
- **secondary**: Atatürk Ansiklopedisi (AYK) ve ATAM yayınları gibi ikincil anlatımlar.
- **reference**: Millî Kütüphane katalog kaydı gibi bibliyografik referanslar.
- **unknown**: kurum eşleşmeyen kaynaklar.

Uzman geçersiz kılmaları `data/classification-overrides.json` üzerinden yapılabilir. Bu snapshot'ta geçersiz kılma yoktur.

### Kaynak URL geçmişi

`data/source-history.json` 168 kaydın tamamını izler. Her girdi özgün URL'yi, güncel URL'yi, kabul edilmiş değişiklikleri ve son görülme tarihini saklar. v06'dan devralınan dört URL değişikliği `data/source-history-seed.json` içinde denetlenebilir biçimde tutulur. Bu snapshot'ta 4 kabul edilmiş değişiklik, 0 sapma ve 0 yetim girdi vardır.

### Tarih denetimi

Tarih denetimi iki şeyi ayırır: kaydın kendi tarihi ve Atatürk'ün biyografik dönemi. 1881-1918 evreleri tarihsel olarak bitişiktir; evre aralıkları çakışmaz. Nokta tarihli bir kayıt tek evreye düşer; aralık tarihli bir kayıt birden fazla evreyle kesişebilir ve bu durum raporda görünür kalır:

| Evre | Aralık |
| --- | --- |
| Doğum, Selanik ve ilk eğitim | 1881-01-01 – 1895-12-31 |
| Manastır, Harp Okulu ve Erkân-ı Harbiye | 1896-01-01 – 1904-12-31 |
| Şam ve erken subaylık | 1905-01-01 – 1907-12-31 |
| Selanik, İttihat ve Terakki, Hareket Ordusu | 1908-01-01 – 1911-09-30 |
| Trablusgarp ve Balkan Savaşları | 1911-10-01 – 1913-09-30 |
| Sofya Ataşemiliterliği | 1913-10-01 – 1915-02-02 |
| Çanakkale, Doğu ve Sina-Filistin cepheleri | 1915-02-03 – 1918-12-31 |

Doğrudan biyografik kayıt için Atatürk'ün özne rolünde olması veya başlıkta Atatürk'ün geçmesi gerekir. Metinde tesadüfen geçen "Atatürk" adı tek başına yeterli değildir. Mekân kayıtları, Atatürk'le ilişkiliyse "ilişkili mekân"; yayınlar bağlam; tarih dışındaki eğitim kurumları "erken yaşam referansı" olarak raporlanır.

### Kaynak yeterliliği

Kaynak yeterliliği yedi bileşeni puanlar: kaynak künyesi, kurum/arşiv kimliği, provenans eşleşmesi, tarih doğrulaması, kaynak erişimi işareti, hak durumu ve türe özgü kanıt. Eksik bileşenler seviyeyi sınırlar:

- Kaynak künyesi veya kaynak URL'si yoksa en fazla `partial`.
- Provenans, tarih, erişim, hak veya türe özgü kanıt eksikse en fazla `adequate`.

Bu snapshot'ta 18 kayıtta kaynak künyesi eksiktir; bu nedenle 18 kayıt `partial` düzeyindedir. Puan ortalaması yüksek görünse de seviye tavanı bu kayıtları "yeterli" saymaz.

### Görsel hakları

Rapor, görselin yeniden kullanım lisansını doğrulamaz; yalnızca mevcut beyanı denetler. 21 görselin tamamı `official_link_only` / `link_only_unverified` durumundadır. Hiçbir görsel indirilmez veya depoya eklenmez. Görseli olmayan 2 kayıtta hak durumu bilinmemektedir. Bu bölüm hukuki görüş değildir.

### İnsan incelemesi

`reviewedBy` alanındaki `OpenCode arşiv denetimi (yapay zekâ)` kaydı **insan uzman onayı sayılmaz**. Bu snapshot'ta 168 kaydın 0'ı insan tarafından onaylanmıştır; 167 kayıt yapay zekâ tarafından incelenmiş, 1 kayıt hiç incelenmemiştir. `human-review-required.md` yalnızca okunacak iş listesidir.

### Erken dönem adayları

`data/early-period-candidates.json` içindeki 13 AYK adayı doğrulanmamıştır. Adaylar arşivde aynı kaynak kimliği veya URL varsa filtrelenir; başlık çakışması adayı silmez, görünür biçimde işaretler. Aday dosyasında `ingest: true` veya onaylı durum görülürse politika ihlali olarak raporlanır ve normalize edilir. Hiçbir aday otomatik olarak arşive eklenmez.

### Bağlantı denetimi

Varsayılan mod çevrimdışıdır. `--online` verildiğinde kaynak, kurum, provenans, alıntı, görsel sayfası ve aday URL'leri denetlenir. Her yönlendirme güvenli URL allowlist'ine karşı yeniden doğrulanır. Sonuç anlık bir fotoğraftır; resmî sitelerin davranışı sonradan değişebilir.

## Bu snapshot

Raporlar `2026-10-23` tarihiyle üretilmiştir.

| Ölçüt | Sonuç |
| --- | --- |
| Kayıt | 168 (151 published, 16 reviewed, 1 draft) |
| Kaynak URL'si | 168 / 168 |
| Birincil kaynak payı | %25,6 (43 / 168) |
| Kaynak dağılımı | AYK 107, TBMM 25, İBB 18, ATAM 15, Millî Kütüphane 3 |
| Paylaşılan resmî kaynak grubu | 1 grup / 2 kayıt (`AYK-878`) |
| Tarih sorunu | 3 kayıt (2 medium, 1 low; yüksek yok) |
| Kaynak yeterliliği | 149 strong, 1 adequate, 18 partial; 18 kayıtta künye eksik |
| Görsel hakları | 21 görselin 21'i doğrulanmamış; 0 doğrulanmış yeniden kullanım |
| İnsan onayı | 0 / 168 |
| 1881-1918 | 4 dönem içi, 0 doğrudan biyografik, 3 ilişkili mekân, 1 bağlam, 2 tarih dışı erken yaşam referansı, 1 tarihsiz, 161 dönem dışı |
| Kapsam evreleri | 7 evre; 4 evrede dönem içi kayıt, 0 doğrudan kayıtlı evre, 1 yalnızca referans, 2 kayıt kanıtı olmayan evre |
| Erken dönem adayları | 13 uygun (9 high, 4 medium); 0 filtreli, 0 politika ihlali |
| Çevrimiçi bağlantı | 189 benzersiz URL; 189 OK, 0 kırık, 0 yönlendirme |
| Kalite puanı | 58,6 / 100 çevrimiçi; 54 / 100 çevrimdışı |

Ayrıntılı sayılar ve kayıt listeleri `reports/catalog-quality.json` içindedir. Raporlar arşiv büyüdükçe aynı komutla yeniden üretilebilir; bu dizindeki dosyalar son çalıştırmanın anlık görüntüsüdür.

## Veri dosyaları

| Dosya | Amaç |
| --- | --- |
| `data/coverage-periods.json` | 1881-1918 evreleri, tarih aralıkları ve anahtar sözcükler. |
| `data/early-period-candidates.json` | Doğrulanmamış AYK adayları; tamamı `ingest: false`. |
| `data/classification-overrides.json` | Uzman sınıflandırma geçersiz kılmaları; snapshot'ta boş. |
| `data/source-history.json` | 168 kaydın kaynak URL geçmişi defteri. |
| `data/source-history-seed.json` | v06'dan devralınan dört URL değişikliğinin denetlenebilir tohumu. |

## Test ve doğrulama

- Araç testleri: **84 / 84 geçti** (`node --test "tests/*.test.mjs"`).
- Mevcut arşiv testleri: **74 / 74 geçti** (`node --test "scripts/archive/tests/*.test.mjs"`).
- Arşiv doğrulaması: **168 kayıt, 0 hata, 7 uyarı** (`node scripts/archive/validate.mjs`). Uyarılar mevcut arşivdeki tarih/hak belirsizlikleridir; araç bunları düzeltmez.
- `node --check` tüm araç modülleri, scriptleri ve testleri için geçti.
- Read-only hash testleri; `report`, `history`, `candidates` ve `check` komutlarından sonra `data/archive/` ile `content/archive/` ağaçlarının değişmediğini doğrular.
- Çıktı yazımı yalnızca güvenli dizinlerde test edilir; `data/archive`, `content/archive` ve `.git` reddedilir.

## Bilinen sınırlamalar ve CI notu

- Sınıflandırma ve kapsam sezgiseldir; insan uzman değerlendirmesinin yerini almaz.
- Çevrimiçi bağlantı sonuçları anlık görüntüdür; sonraki çalıştırmada değişebilir.
- Görsel hak raporu hukuki görüş değildir; kurum koşulları ayrıca incelenmelidir.
- Aday metadata'sı AYK API'sinden yenilenebilir, ancak adayın doğruluğu veya arşive uygunluğu bu araç tarafından onaylanmaz.
- v06'dan devralınan web E2E beklentileri (`68 kayıt / 62 yayın`) güncel arşivle (`168 / 151`) uyuşmadığı için tam `release-quality` CI kırmızıdır. Bu dosyalar Codex/Next.js sahibinin alanındadır ve bu dalda değiştirilmemiştir.
- Bu dal `main` hedefli değildir ve deployment içermez. PR, `feature/opencode-v06-archive-expansion` hedefli taslak olarak açılır.
