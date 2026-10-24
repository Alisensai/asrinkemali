# V0.6 içerik hazırlığı

## Katalog

- Toplam: 168
- Teknik `published`: 151
- Teknik `reviewed`: 16
- Teknik `draft`: 1
- Türler: 9 fotoğraf, 35 belge, 2 konuşma, 69 olay, 35 yayın, 18 mekân
- İnsan uzman incelemesi tamamlanan: 0
- İnsan editör yayın onayı bulunan: 0
- Bekleyen editör formu: 168

`published` burada yalnız mevcut katalog iş akışı etiketidir. Arayüz bunu “Kaynak denetimli · uzman onayı bekliyor” olarak açıklar. Teknik katalog durumunu insan onayı gibi gösteren sayaç veya metin kullanılmaz.

## Bilinen içerik riskleri

- `selanikteki-ataturk-evi`: tarih ve hak durumu belirsiz; taslak/yayın dışı.
- `vatandas-icin-medeni-bilgiler-1930`: hak durumu belirsiz; incelenmiş olsa da yayın kapalı.
- Üç Millî Kütüphane kaydında tahmini tarih ve ağ kontrolünde HTTP 400 vardır.
- Katalogdaki bütün kayıtlar insan uzman incelemesi bekler; AI `reviewedBy` insan onayı değildir.
- Tarihte Bugün yalnız gün hassasiyetli, teknik olarak yayımlanmış kaynak kayıtlarını seçer; eşleşme yoksa açık boş durum verir.
- Yayın veri kümesi boştur; sahte makale oluşturulmamıştır.

Preview için en azından yayın görünürlüğü politikası kararlaştırılmalı: insan onayı gelene kadar arşiv metadata'sı açık uyarıyla araştırma önizlemesi olarak mı kalacak, yoksa tüm 151 ayrıntı da kapatılacak mı? Mevcut uygulama ilk yaklaşımı açık uyarıyla uygular; release gate ikinci, daha katı üretim koşulunu korur.
