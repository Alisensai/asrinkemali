# Kaynak Envanteri

Bu belge, `data/archive/catalog/` altındaki 50 yeni kaydın kurum, tarih, tür,
doğrulama durumu, barındırma biçimi ve kaynak adresini tek tek listeler.

- **Durum = Yayımlandı** ise kayıt `verification.status: published` ve `searchRecords`
  varsayılan sonuçlarında görünür.
- **Durum = İncelendi** ise kayıt `verification.status: reviewed` durumundadır;
  yayın kapısı kapalıdır ve varsayılan aramada gösterilmez.
- **Barındırma = Yalnızca dış bağlantı (dosya yok)** ise `holding.mode:
  external_link`, `holding.filePath: null` ve `rights.status:
  official_link_only` demektir. Depoda indirilmiş PDF, görsel veya metin yoktur.
- Tarih sütunu, kaydın `date.display` değeridir. Üç Millî Kütüphane kaydında
  yayın yılı katalog yer numarasından değerlendirildiği için bu kayıtlar
  `reviewed` durumundadır.
- Kaynak bağlantıları 23.10.2026 tarihinde denetlenmiştir; 50 yeni kaydın
  tamamı HTTP 200 döndürmüştür.

## Özet

| Kurum | Kayıt | Yayımlandı | İncelendi | Barındırma |
|---|---:|---:|---:|---|
| Atatürk Ansiklopedisi (ATAM) | 24 | 24 | 0 | 24 dış bağlantı |
| TBMM Tutanak Dergisi | 10 | 10 | 0 | 10 dış bağlantı |
| İBB Atatürk Kitaplığı | 8 | 8 | 0 | 8 dış bağlantı |
| ATAM Yayınları | 5 | 5 | 0 | 5 dış bağlantı |
| Millî Kütüphane | 3 | 0 | 3 | 3 dış bağlantı |
| **Toplam** | **50** | **47** | **3** | **50 dış bağlantı** |

## Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)

24 kayıt: 21 olay, 1 konuşma, 2 yayın. Kaynak sayfaları
`ataturkansiklopedisi.gov.tr` üzerindedir; kayıtların tamamı yayımlanmıştır.

| # | Kayıt | Tür | Tarih | Durum | Barındırma | Kaynak |
|---|---|---|---|---|---|---|
| 1 | İzmir'in İşgali (`izmirin-isgali-1919`) | olay | 15 Mayıs 1919 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/719/izmirin-isgali-1919) |
| 2 | Havza Genelgesi (`havza-genelgesi-1919`) | olay | 28 Mayıs 1919 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/768/havza-genelgesi-1919) |
| 3 | Amasya Tamimi (`amasya-tamimi-1919`) | olay | 22 Haziran 1919 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/210/amasya-tamimi-1919) |
| 4 | Erzurum Kongresi (`erzurum-kongresi-1919`) | olay | 23 Temmuz 1919 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/673/erzurum-kongresi-1919) |
| 5 | Sivas Kongresi (`sivas-kongresi-1919`) | olay | 4 Eylül 1919 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/294/sivas-kongresi-1919) |
| 6 | Amasya Mülakatı (`amasya-mulakati-1919`) | olay | 22 Ekim 1919 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/209/amasya-mulakati-1919) |
| 7 | Sevr Antlaşması (`sevr-antlasmasi-1920`) | olay | 10 Ağustos 1920 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/271/sevr-antlasmasi-1920) |
| 8 | Teşkilat-ı Esasiye Kanunu (`teskilat-i-esasiye-1921`) | olay | 20 Ocak 1921 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/3980/teskilat-i-esasiye-1921) |
| 9 | Başkomutanlık Kanunu (`baskomutanlik-kanunu-1921`) | olay | 5 Ağustos 1921 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/701/baskomutanlik-kanunu-1921) |
| 10 | Sakarya Meydan Muharebesi (`sakarya-meydan-muharebesi-1921`) | olay | 23 Ağustos 1921 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/216/sakarya-meydan-muharebesi-1921) |
| 11 | Büyük Taarruz (`buyuk-taarruz-1922`) | olay | 26 Ağustos 1922 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/4929/buyuk-taarruz-1922) |
| 12 | Mudanya Mütarekesi (`mudanya-mutarekesi-1922`) | olay | 3 Ekim 1922 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/373/mudanya-mutarekesi-1922) |
| 13 | Atatürk'ün Balıkesir Zağnos Paşa Camii'nde Verdiği Nutku (`balikesir-zagnos-pasa-nutku-1923`) | konuşma | 7 Şubat 1923 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/863/balikesir-zagnos-pasa-nutku-1923) |
| 14 | Ankara'nın Başkent Oluşu (`ankaranin-baskent-olusu-1923`) | olay | 13 Ekim 1923 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/868/ankaranin-baskent-olusu-1923) |
| 15 | Halifeliğin Kaldırılması (`halifeligin-kaldirilmasi-1924`) | olay | 3 Mart 1924 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/940/halifeligin-kaldirilmasi-1924) |
| 16 | Cumhuriyet Gazetesi (`cumhuriyet-gazetesi-1924`) | yayın | 7 Mayıs 1924 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/1230/cumhuriyet-gazetesi-1924) |
| 17 | Şapka İnkılabı (`sapka-inkilabi-1925`) | olay | 25 Kasım 1925 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/1232/sapka-inkilabi-1925) |
| 18 | Tekke, Zaviye ve Türbelerin Kapatılması (`tekke-zaviye-turbelerin-kapatilmasi-1925`) | olay | 30 Kasım 1925 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/397/tekke-zaviye-turbelerin-kapatilmasi-1925) |
| 19 | Atatürk'ün Nutuk Adlı Eseri (`ataturkun-nutuk-adli-eseri-1927`) | yayın | 1927 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/878/ataturkun-nutuk-adli-eseri-1927) |
| 20 | Menemen Olayı (`menemen-olayi-1930`) | olay | 23 Aralık 1930 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/304/menemen-olayi-1930) |
| 21 | Cumhuriyet'in Onuncu Yıl Kutlamaları (`cumhuriyetin-onuncu-yil-kutlamalari-1933`) | olay | 29 Ekim 1933 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/606/cumhuriyetin-onuncu-yil-kutlamalari-1933) |
| 22 | Soyadı Kanunu (`soyadi-kanunu-1934`) | olay | 21 Haziran 1934 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/298/soyadi-kanunu-1934) |
| 23 | Montrö Boğazlar Sözleşmesi (`montro-bogazlar-sozlesmesi-1936`) | olay | 20 Temmuz 1936 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/355/montro-bogazlar-sozlesmesi-1936) |
| 24 | Cumhuriyet'in On Beşinci Yıl Kutlamaları (`cumhuriyetin-on-besinci-yil-kutlamalari-1938`) | olay | 29 Ekim 1938 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www.ataturkansiklopedisi.gov.tr/detay/611/cumhuriyetin-on-besinci-yil-kutlamalari-1938) |

## TBMM Tutanak Dergisi

10 belge. Kaynaklar TBMM'nin resmî tutanak PDF'leridir; dosyalar depoya
indirilmemiş, yalnızca doğrudan kaynak adresi verilmiştir.

| # | Kayıt | Tür | Tarih | Durum | Barındırma | Kaynak |
|---|---|---|---|---|---|---|
| 1 | TBMM 1. Birleşim Tutanağı (23 Nisan 1920) (`tbmm-1-birlesim-tutanagi-1920`) | belge | 23 Nisan 1920 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d01/c001/tbmm01001001.pdf) |
| 2 | TBMM 135. Birleşim Tutanağı (20 Ocak 1921) (`tbmm-135-birlesim-tutanagi-1921`) | belge | 20 Ocak 1921 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d01/c007/tbmm01007135.pdf) |
| 3 | TBMM 62. Birleşim Tutanağı (5 Ağustos 1921) (`tbmm-62-birlesim-tutanagi-1921`) | belge | 5 Ağustos 1921 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d01/c012/tbmm01012062.pdf) |
| 4 | TBMM 130. Birleşim Tutanağı (1 Kasım 1922) (`tbmm-130-birlesim-tutanagi-1922`) | belge | 1 Kasım 1922 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d01/c024/tbmm01024130.pdf) |
| 5 | TBMM 35. Birleşim Tutanağı (13 Ekim 1923) (`tbmm-35-birlesim-tutanagi-1923`) | belge | 13 Ekim 1923 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d02/c002/tbmm02002035.pdf) |
| 6 | TBMM 43. Birleşim Tutanağı (29 Ekim 1923) (`tbmm-43-birlesim-tutanagi-1923`) | belge | 29 Ekim 1923 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d02/c003/tbmm02003043.pdf) |
| 7 | TBMM 2. Birleşim Tutanağı (3 Mart 1924) (`tbmm-2-birlesim-tutanagi-1924`) | belge | 3 Mart 1924 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d02/c007/tbmm02007002.pdf) |
| 8 | TBMM 57. Birleşim Tutanağı (17 Şubat 1926) (`tbmm-57-birlesim-tutanagi-1926`) | belge | 17 Şubat 1926 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d02/c022/tbmm02022057.pdf) |
| 9 | TBMM 1. Birleşim Tutanağı (1 Kasım 1928) (`tbmm-1-birlesim-tutanagi-1928`) | belge | 1 Kasım 1928 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d03/c005/tbmm03005001.pdf) |
| 10 | TBMM 71. Birleşim Tutanağı (21 Haziran 1934) (`tbmm-71-birlesim-tutanagi-1934`) | belge | 21 Haziran 1934 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://www5.tbmm.gov.tr/tutanaklar/TUTANAK/TBMM/d04/c023/tbmm04023071.pdf) |

## İBB Atatürk Kitaplığı

8 kayıt: 6 fotoğraf, 2 belge. Sayısal Arşiv'deki öğe sayfalarına bağlantı
verilir; görseller indirilmemiştir. 8 kaydın tamamında `rights.imageReuse:
link_only` ve `holding.mode: external_link` kullanılır.

| # | Kayıt | Tür | Tarih | Durum | Barındırma | Kaynak |
|---|---|---|---|---|---|---|
| 1 | TBMM İstanbul Temsilcisi Refet Paşa'nın Yemekli Toplantısı (1923) (`ibb-refet-pasa-ziyafeti-fotografi-1923`) | fotoğraf | 1923 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://sayisalarsiv.ibb.gov.tr/yordambt/yordam.php?aDemirbas=Krt_013518) |
| 2 | Lozan Görüşmelerinde İsmet İnönü'nün Fransız Murahhasına Mektubu (`ibb-lozan-mektubu-1923`) | belge | 24 Temmuz 1923 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://sayisalarsiv.ibb.gov.tr/yordambt/yordam.php?aDemirbas=Bel_Mtf_070690) |
| 3 | Erzincan'da Şapka İnkılabı Üzerine Çekilen Grup Fotoğrafı (`ibb-erzincan-sapka-fotografi-1926`) | fotoğraf | 1926 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://sayisalarsiv.ibb.gov.tr/yordambt/yordam.php?aDemirbas=Krt_014792) |
| 4 | Atatürk'ün Ertuğrul Yatında Fotoğrafı (1927) (`ibb-ertugrul-yati-fotografi-1927`) | fotoğraf | 1927 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://sayisalarsiv.ibb.gov.tr/yordambt/yordam.php?aDemirbas=Krt_016917) |
| 5 | Atatürk'ün Nutuk'u Okurken Çekilen Fotoğraf (`ibb-nutuk-okuma-fotografi-1927`) | fotoğraf | 15-20 Ekim 1927 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://sayisalarsiv.ibb.gov.tr/yordambt/yordam.php?aDemirbas=Bel_Mtf_026164) |
| 6 | Çanakkale'de Atatürk ve Bir Grup Fotoğrafı (1928) (`ibb-canakkale-fotografi-1928`) | fotoğraf | 1928 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://sayisalarsiv.ibb.gov.tr/yordambt/yordam.php?aDemirbas=Krt_014877) |
| 7 | Taksim Cumhuriyet Abidesi Komisyonu Tutanağı (29 Mart 1928) (`ibb-taksim-abide-komisyonu-tutanagi-1928`) | belge | 29 Mart 1928 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://sayisalarsiv.ibb.gov.tr/yordambt/yordam.php?aDemirbas=Bel_Mtf_070929) |
| 8 | Cumhuriyet'in 10. Yıldönümünde TBMM'den Çıkarken Fotoğraf (`ibb-10-yildonumu-meclis-fotografi-1933`) | fotoğraf | 29 Ekim 1933 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://sayisalarsiv.ibb.gov.tr/yordambt/yordam.php?aDemirbas=Bel_Mtf_026166) |

## ATAM Yayınları

5 yayın. Kaynaklar Atatürk Araştırma Merkezi'nin kitap tanıtım sayfalarıdır;
PDF veya tam metin indirilmemiştir.

| # | Kayıt | Tür | Tarih | Durum | Barındırma | Kaynak |
|---|---|---|---|---|---|---|
| 1 | Doğumundan Ölümüne Kadar Kaynakçalı Atatürk Günlüğü (`atam-ataturk-gunlugu-2025`) | yayın | 2025 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://atam.gov.tr/kitaplar/dogumundan-olumune-kadar-kaynakcali-ataturk-gunlugu/) |
| 2 | Atatürk Orman Çiftliği'nin Tarihi (`atam-ataturk-orman-ciftligi-tarihi-2025`) | yayın | 2025 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://atam.gov.tr/kitaplar/ataturk-orman-ciftliginin-tarihi-2/) |
| 3 | Gazi Mustafa Kemal Atatürk'ün Hayatı (`atam-gazi-mustafa-kemal-ataturkun-hayati-2025`) | yayın | 2025 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://atam.gov.tr/kitaplar/gazi-mustafa-kemal-ataturkun-hayati-3/) |
| 4 | Nutuk – Özgün Dille (Orijinal, Ciltli) (`atam-nutuk-ozgun-dille-2025`) | yayın | 2025 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://atam.gov.tr/kitaplar/nutuk-ozgun-dille-orijinal-ciltli/) |
| 5 | Milletin Sesi Mehmet Akif Ersoy (`atam-milletin-sesi-mehmet-akif-ersoy-2026`) | yayın | 2026 | Yayımlandı | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://atam.gov.tr/kitaplar/milletin-sesi-mehmet-akif-ersoy/) |

## Millî Kütüphane

3 yayın. Katalog sayfalarında `Yayın Tarihi` alanı boştur; yayın yılları yer
numarasındaki yıl önekinden değerlendirilmiştir. Bu nedenle üç kayıt da
`published` değil `reviewed` durumundadır ve varsayılan aramada görünmez.

| # | Kayıt | Tür | Tarih | Durum | Barındırma | Kaynak |
|---|---|---|---|---|---|---|
| 1 | İnönü Diyor Ki (`milli-kutuphane-inonu-diyor-ki-1933`) | yayın | 1933 | İncelendi | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://dijital-kutuphane.mkutup.gov.tr/tr/books/catalog/details/105276) |
| 2 | Atatürk Dönemi Maliye Politikası (`milli-kutuphane-ataturk-donemi-maliye-politikasi-1982`) | yayın | 1982 | İncelendi | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://dijital-kutuphane.mkutup.gov.tr/tr/books/catalog/details/136684) |
| 3 | Atatürk ve Çanakkale (`milli-kutuphane-ataturk-ve-canakkale-2006`) | yayın | 2006 | İncelendi | Yalnızca dış bağlantı (dosya yok) | [kaynak](https://dijital-kutuphane.mkutup.gov.tr/tr/books/catalog/details/109289) |

## Kaynak türü notları

- **Atatürk Ansiklopedisi:** Kayıt sayfaları tek sayfa uygulaması (SPA)
  biçiminde çalışır; bağlantılar HTTP 200 döndürür. Künye ve tarih bilgileri
  kurumun herkese açık ansiklopedi verisi ve görünür sayfa içeriğiyle
  doğrulanmıştır.
- **TBMM:** Bağlantılar doğrudan resmî tutanak PDF'lerinedir. PDF'ler
  indirilmemiş, yalnızca HEAD/GET ile erişilebilirlik denetlenmiştir.
- **İBB:** Bağlantılar Sayısal Arşiv öğe sayfalarıdır; görsel dosyaları
  indirilmemiştir. `image.sourcePageUrl` aynı öğe sayfasına işaret eder.
- **ATAM Yayınları:** Bağlantılar kitap tanıtım sayfalarıdır; tam metin veya
  PDF depolanmamıştır.
- **Millî Kütüphane:** Bağlantılar katalog detay sayfalarıdır; sayfalar zaman
  zaman hızlı ardışık isteklere 400 döndüğü için bağlantı denetimi sırayla
  yapılmıştır.

Ayrıntılı hak ve barındırma gerekçeleri için
[HAKLAR-VE-BARINDIRMA.md](HAKLAR-VE-BARINDIRMA.md), doğrulama yöntemi için
[DOGRULAMA-RAPORU.md](DOGRULAMA-RAPORU.md) dosyalarına bakın.
