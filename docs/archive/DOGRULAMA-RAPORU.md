# Doğrulama Raporu

Tarih: **23.10.2026**

Kapsam: `data/archive/catalog/` altındaki 50 yeni kayıt ve mevcut 18 kayıt

Dal: `feature/opencode-verified-catalog`

Hedef PR tabanı: `integration/nextjs-visual-v03`

## 1. Sonuç özeti

| Denetim | Sonuç |
|---|---|
| Toplam kayıt | 68 |
| Yayımlandı (`published`) | 62 |
| İncelendi (`reviewed`) | 5 |
| Taslak (`draft`) | 1 |
| Hata | 0 |
| Uyarı | 7 |
| Yeni kayıt | 50 |
| Yeni kayıtlarda yayımlandı | 47 |
| Yeni kayıtlarda incelendi | 3 |
| Yeni kayıtlarda taslak | 0 |
| Yalnızca dış bağlantı | 50 |
| Barındırılan dosya | 0 |
| Metadata-only | 0 |
| Test | 74 / 74 geçti |
| Kaynak URL denetimi | 72 benzersiz URL, 0 başarısız |

Tür dağılımı (toplam arşiv): **29 olay, 2 konuşma, 13 belge, 12 yayın,
9 fotoğraf, 3 mekân**.

Ek istatistikler: `withQuotation: 2`, `withImage: 11`, `unknownDates: 1`,
`linkOnly: 50`, `hostedFiles: 0`, `metadataOnly: 0`.

## 2. Çalıştırılan komutlar

```bash
node scripts/archive/validate.mjs
node scripts/archive/validate.mjs --links
node --test "scripts/archive/tests/*.test.mjs"
```

### `validate.mjs` çıktısı

```text
ASRIN KEMALİ arşiv doğrulaması
Kayıt: 68 | Yayımlandı: 62 | İncelendi: 5 | Taslak: 1
Türler: fotoğraf 9, belge 13, konuşma 2, olay 29, yayın 12, mekân 3
Alıntılı kayıt: 2 | Görselli kayıt: 11 | Tarihi bilinmeyen: 1

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

Uyarıların 4'ü önceden var olan kayıtlardan, 3'ü yeni Millî Kütüphane
kayıtlarındaki tahmini yayın yılından gelir. Hata yoktur.

### `--links` çıktısı

```text
Bağlantı denetimi: 72 URL, 0 başarısız
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

### Atatürk Ansiklopedisi (24 kayıt)

- Her kayıt için kurumun herkese açık ansiklopedi sayfaları ve arama
  sonuçlarından başlık, tarih, özet ve detay bağlantısı doğrulandı.
- Detay sayfalarının HTTP 200 döndürdüğü doğrulandı.
- Sayfalar tek sayfa uygulaması (SPA) biçiminde çalışır; künye ve tarih
  bilgileri kurumun herkese açık ansiklopedi verisi ve görünür sayfa içeriğiyle
  karşılaştırıldı.
- 1 konuşma kaydında (Balıkesir Zağnos Paşa Nutku) kaynak metinden kısa bir
  alıntı doğrulandı; `quotation.verified: true` ve kanıt alanları dolduruldu.

### TBMM Tutanak Dergisi (10 kayıt)

- Dönem, cilt ve birleşim numaraları resmî tutanak diziniyle eşleştirildi.
- PDF adresleri `https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/...`
  biçiminde üretildi ve HEAD/GET ile erişilebilirlikleri denetlendi.
- PDF'ler indirilmedi, metin çıkarımı yapılmadı. Kayıtlar birleşim tarihi ve
  resmî tutanak kimliğiyle sınırlıdır; tam metin analizi iddiası taşımaz.

### İBB Atatürk Kitaplığı (8 kayıt)

- Sayısal Arşiv öğe sayfalarındaki demirbaş numarası, başlık, tarih ve
  kurum bilgisi doğrulandı.
- 6 fotoğraf ve 2 belge için yalnızca öğe sayfası bağlantısı tutuldu;
  görsel dosyaları indirilmedi.
- Tarihi yalnızca yıl olan kayıtlarda `precision: "year"`, gün aralığı olan
  kayıtlarda `precision: "range"` kullanıldı.

### ATAM Yayınları (5 kayıt)

- Kitap tanıtım sayfalarından başlık, yazar, yayın yılı ve ISBN bilgisi
  doğrulandı.
- Tam metin veya PDF indirilmedi; `source.citation` alanına bibliyografik
  künye yazıldı.

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

## 4. Tarih ve alıntı doğruluğu

- 50 yeni kaydın 47'sinde tarih kesindir.
- 3 Millî Kütüphane kaydında yayın yılı tahminidir; yukarıda açıklandı.
- 1 yeni alıntı yalnızca kaynak metinde birebir bulunduğu için doğrulanmıştır.
- Alıntılar yalnızca `verification.status: "published"` kayıtlarda ve
  `quotation.evidence` alanlarıyla birlikte kullanılır.

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
- **Görsel/PDF dosyası yoktur.** Tüm kayıtlar dış bağlantıdır; depoda
  barındırılan dosya sayısı 0'dır.

## 6. Yeniden üretim

```bash
cd <repo>
node scripts/archive/validate.mjs
node scripts/archive/validate.mjs --links
node --test "scripts/archive/tests/*.test.mjs"
```

Beklenen sonuç: 68 kayıt, 0 hata, 7 uyarı; 72 URL'de 0 başarısız; 74 test
geçer. Bağlantı denetimi sırasında kurum hız sınırına takılırsa komut birkaç
dakika sonra yeniden çalıştırılmalı; kayıtların kendisi değiştirilmemelidir.
