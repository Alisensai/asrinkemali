# MKA Authority Registry — Bilinen Kısıtlar ve Gelecek Geliştirmeler

## 1. Geçici (Provisional) Durum
Otorite çıkarımı tamamen deterministik kurallara ve mevcut arşiv kayıtlarına dayanır. Bu varlıkların hiçbiri bir tarih uzmanı heyetince onaylanmamıştır; tüm kayıtlar `status: "provisional"` ve `humanApproval: null` olarak işaretlenmiştir.

## 2. Coğrafi Koordinatlar
Mevcut arşiv kayıtlarında harita koordinatları bulunmamaktadır. Gemini Atlas DTO'su koordinat alanını `null` (`geoStatus: "unknown"`) olarak döndürür; dış kaynaktan teyit edilmemiş yapay koordinat türetilmez.

## 3. Haricî Otorite Kaynakları (Wikidata, VIAF, GND vb.)
Sistem dış ağlara kapalı (offline) ve deterministik olarak çalışmaktadır. Dış otorite API'lerine canlı istek yapılmaz. İleride dış kimlik bağlayıcıları eklenecektir.

## 4. Kayıt Dosyalarına Yazma Yasağı
Bu sürümde hiçbir arşiv dosyası değiştirilmez; geçiş sadece `dry-run-migration` simülasyonu ile incelenebilir.
