# Doğrulama Raporu

Tarih: **23.10.2026**

Kapsam: `data/archive/catalog/` altındaki 150 yeni kayıt, mevcut 18 kayıt ve
4 eski kayıtta kaynak URL düzeltmesi

Dal: `feature/opencode-v06-archive-expansion`

Hedef PR tabanı: `integration/asrinkemali-v05-release-candidate`

## 1. Sonuç özeti

| Denetim | Sonuç |
|---|---:|
| Toplam kayıt | 168 |
| Yayımlandı (`published`) | 151 |
| İncelendi (`reviewed`) | 16 |
| Taslak (`draft`) | 1 |
| Hata | 0 |
| Uyarı | 7 |
| v06 genişletmesinde eklenen kayıt | 100 |
| v06 kayıtlarında yayımlandı | 89 |
| v06 kayıtlarında incelendi | 11 |
| v06 kayıtlarında taslak | 0 |
| Yalnızca dış bağlantı | 150 |
| Barındırılan dosya | 0 |
| Metadata-only | 0 |
| Test | 74 / 74 geçti |
| Kaynak URL denetimi | 176 benzersiz URL, 0 başarısız |

Tür dağılımı (toplam arşiv): **69 olay, 2 konuşma, 35 belge, 35 yayın,
9 fotoğraf, 18 mekân**.

Ek istatistikler: `withQuotation: 2`, `withImage: 21`, `unknownDates: 1`,
`linkOnly: 150`, `hostedFiles: 0`, `metadataOnly: 0`.

v06 genişletmesinin tür dağılımı: **40 olay, 17 belge, 13 yayın, 15 mekân**.
Bu 100 kaydın 61'i gün, 16'sı tarih aralığı, 23'ü yıl hassasiyetindedir;
tamamında `date.certainty: "exact"` kullanılır.

## 2. Çalıştırılan komutlar

```bash
node scripts/archive/validate.mjs
node scripts/archive/validate.mjs --links
node --test "scripts/archive/tests/*.test.mjs"
```

### `validate.mjs` çıktısı

```text
ASRIN KEMALİ arşiv doğrulaması
Kayıt: 168 | Yayımlandı: 151 | İncelendi: 16 | Taslak: 1
Türler: fotoğraf 9, belge 35, konuşma 2, olay 69, yayın 35, mekân 18
Alıntılı kayıt: 2 | Görselli kayıt: 21 | Tarihi bilinmeyen: 1

UYARILAR (7):
  [TARIH_EKSIK] selanikteki-ataturk-evi $.date: Tarih bilinmiyor; yayın için ek doğrulama gerekir.
  [HAK_BELIRSIZ] selanikteki-ataturk-evi $.rights.status: Hak/lisans durumu bilinmiyor; kayıt yayımlanmamalı.
  [HAK_BELIRSIZ] vatandas-icin-medeni-bilgiler-1930 $.rights.status: Hak/lisans durumu bilinmiyor; kayıt yayımlanmamalı.
  [INCELEME_HAK] vatandas-icin-medeni-bilgiler-1930 $.rights.status: İncelenmiş kayıtta hak durumu hâlâ bilinmiyor; yayın kapısı kapalı.
  [TARIH_TAHMINI] milli-kutuphane-ataturk-donemi-maliye-politikasi-1982 $.date: Tarih tahmini; yayın için kaynak teyidi gerekir.
  [TARIH_TAHMINI] milli-kutuphane-ataturk-ve-canakkale-2006 $.date: Tarih tahmini; yayın için kaynak teyidi gerekir.
  [TARIH_TAHMINI] milli-kutuphane-inonu-diyor-ki-1933 $.date: Tarih tahmini; yayın için kaynak teyidi gerekir.

Sonuç: başarılı (uyarılar var).
```

Uyarıların 4'ü önceden var olan kayıtlardan, 3'ü Millî Kütüphane
kayıtlarındaki tahmini yayın yılından gelir. Hata yoktur.

### `--links` çıktısı

```text
Bağlantı denetimi: 176 URL, 0 başarısız
Sonuç: başarılı (uyarılar var).
```

Bağlantı denetimi, Millî Kütüphane'nin hızlı ardışık HEAD isteklerine 400
dönebilmesi nedeniyle CLI içinde `concurrency: 1` ile sırayla çalıştırılır.
Bu ayar `scripts/archive/validate.mjs` içinde belgelenmiştir.

### Test çıktısı

```text
74 tests
74 pass
0 fail
```

Testler; şema v1.0.0/v1.1.0 uyumluluğu, iki dizinli yükleme, `holding` ve
`source.citation` kuralları, barındırılan dosya politikası, Türkçe künye
araması, "Tarihte Bugün" ve mevcut arşiv davranışlarını kapsar.

## 3. Kaynak doğrulama yöntemi

### Atatürk Ansiklopedisi (107 kayıt)

- 70 yeni kayıt için kurumun herkese açık `apiko.ayk.gov.tr` arama ve
  `itemPublic/byId` uç noktaları kullanıldı.
- Başlık, özet, madde metni, yazar ve `releaseDate` alanları alındı; kaynak
  URL'si `ataturkansiklopedisi.gov.tr/detay/{id}/{slug}` biçiminde üretildi.
- Gün hassasiyetindeki 61 kayıt `published`; tarih aralığı veya yıl
  hassasiyetindeki 11 kayıt `reviewed` durumundadır.
- 1 konuşma kaydında (Balıkesir Zağnos Paşa Nutku) kaynak metinden kısa bir
  alıntı doğrulandı; `quotation.verified: true` ve kanıt alanları dolduruldu.

### TBMM Tutanak Dergisi (25 kayıt)

- Dönem, cilt ve birleşim numaraları resmî tutanak diziniyle eşleştirildi.
- 10 yeni PDF adresi `https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/...`
  biçiminde üretildi ve HEAD/GET ile erişilebilirlikleri denetlendi.
- 1934-12-05 ve 1938-11-11 tarihleri, eski OWA birleşim fihristindeki
  görünen tarihlerle ayrıca doğrulandı.
- PDF'ler indirilmedi, metin çıkarımı yapılmadı. Kayıtlar birleşim tarihi ve
  resmî tutanak kimliğiyle sınırlıdır; tam metin analizi iddiası taşımaz.

### İBB Atatürk Kitaplığı (18 kayıt)

- 10 yeni kayıt için YordamBT `php/sorgu.php` JSON arama uç noktası kullanıldı;
  demirbaş numarası, başlık, tarih ve katalog bilgisi doğrulandı.
- 7 belge ve 3 yayın için yalnızca öğe sayfası bağlantısı tutuldu; görsel
  dosyaları indirilmedi.
- Tarihi yalnızca yıl olan albüm kayıtlarında `precision: "year"` kullanıldı.

### ATAM Yayınları (15 kayıt)

- 10 yeni kitap tanıtım sayfasından başlık, yazar/editoryal kurul, yayın yılı,
  ISBN ve yayın numarası bilgisi doğrulandı.
- Tam metin veya PDF indirilmedi; `source.citation` alanına bibliyografik
  künye yazıldı.
- Daha önce kullanılan 5 ATAM kitap sayfası tekrar edilmedi.

### Millî Kütüphane (3 kayıt)

- Katalog detay sayfalarından başlık, yazar, yayın bilgisi ve yer numarası
  alındı.
- Üç kayıtta da katalogdaki `Yayın Tarihi` alanı boştur. Yayın yılı, yer
  numarasındaki yıl önekinden değerlendirildi:
  - `1982 AD 2826` → 1982
  - `2006 AD 5745` → 2006
  - `1933 AD 3595` → 1933
- Bu nedenle kayıtlar `date.certainty: "estimated"` ve
  `verification.status: "reviewed"` olarak tutuldu; varsayılan aramada
  görünmezler.

## 4. Tarih, alıntı ve URL doğruluğu

- v06 genişletmesindeki 100 kaydın tamamında tarih bilgisi kurumsal kaynaktan
  alınmıştır; 61 kayıt gün, 16 kayıt aralık, 23 kayıt yıl hassasiyetindedir.
- 3 Millî Kütüphane kaydında yayın yılı tahminidir; yukarıda açıklandı.
- 2 alıntı yalnızca kaynak metinde birebir bulunduğu için doğrulanmıştır.
- Alıntılar yalnızca `verification.status: "published"` kayıtlarda ve
  `quotation.evidence` alanlarıyla birlikte kullanılır.
- 168 kayıtta 176 benzersiz kaynak URL'si vardır; yinelenen URL yoktur. Eski
  TBMM müzesi kayıtlarından dördünün kaynağı, aynı kurumun tarihçe sayfasına
  veya doğrudan CDN görsel adresine güncellenmiştir. Kayıt kimlikleri,
  açıklamaları ve diğer alanları korunmuştur; yalnızca kaynak adresi ve künye
  bilgisi kesinleştirilmiştir.

## 5. Bilinen sınırlamalar

- **İnsan uzman onayı yoktur.** `reviewedBy` değeri
  `OpenCode arşiv denetimi (yapay zekâ)` olup makine denetimini gösterir.
- **TBMM PDF'leri okunmadı.** Kayıtlar resmî tutanak dizini ve birleşim
  kimliğiyle doğrulandı; PDF içeriğinden alıntı yapılmadı.
- **Atatürk Ansiklopedisi SPA'dır.** HTML meta verisi yerine kurumun arama
  uç noktası kullanıldı.
- **Millî Kütüphane yayın yılları tahminidir.** Katalogda tarih alanı boş
  olduğu için yer numarası öneki kullanıldı; bu kayıtlar yayımlanmadı.
- **Bağlantı denetimi ağa bağlıdır.** Kurumlar zaman zaman 400/429/5xx
  döndürebilir; `--links` bu nedenle sırayla çalışır ve sonuç tarihini
  belgelemek gerekir.
- **Görsel/PDF dosyası yoktur.** Tüm yeni kayıtlar dış bağlantıdır; depoda
  barındırılan dosya sayısı 0'dır.

## 6. Yeniden üretim

```bash
cd <repo>
node scripts/archive/validate.mjs
node scripts/archive/validate.mjs --links
node --test "scripts/archive/tests/*.test.mjs"
```

Beklenen sonuç: 168 kayıt, 0 hata, 7 uyarı; 176 URL'de 0 başarısız; 74 test
geçer. Bağlantı denetimi sırasında kurum hız sınırına takılırsa komut birkaç
dakika sonra yeniden çalıştırılmalı; kayıtların kendisi değiştirilmemelidir.
