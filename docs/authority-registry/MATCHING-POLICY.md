# MKA Authority Registry — Eşleştirme ve Hard-Negative Politikası

## 1. Puanlama Skalası ve Neden Kodları (Reason Codes)
Eşleştirme motoru açıklanabilir (explainable) kurallara dayanır:
- **100 Puan (`EXACT_STRING_MATCH`):** Sorgu dizesi ve varlık etiketi harfiyen eşleşir. `requiresHumanReview: false`.
- **95 Puan (`TURKISH_FOLD_MATCH`):** Türkçe harf normalizasyonu (İ/I/i/ı, Ş/s, Ç/c vb.) ve aksan temizleme sonrasında eşleşir. `requiresHumanReview: false`.
- **90 Puan (`KNOWN_ALIAS_MATCH`):** Kayıtlı ve kanıtlanmış tarihî takma ad tablosundaki değerle eşleşir (ör. 'Gazi Paşa' -> 'Mustafa Kemal Atatürk'). `requiresHumanReview: false`.
- **10–80 Puan (`TOKEN_OVERLAP_MATCH`):** Sözcük düzeyinde parçalı benzerlik. `requiresHumanReview: true` (Zorunlu insan incelemesi).
- **0 Puan (`HARD_NEGATIVE_DISTINCT_ENTITY`):** Farklı şahsiyetlerin yanlış birleştirilmesi kural bazlı engellenir.

## 2. Hard-Negative Kuralları
Aşağıdaki çiftler benzer isimler taşımalarına rağmen sistem tarafından asla birleştirilmez:
1. `mka:person:ali-riza-efendi` vs `mka:person:ali-riza-pasa`: Atatürk'ün babası Ali Rıza Efendi ile Sadrazam Ali Rıza Paşa farklı şahsiyetlerdir.
2. `mka:person:ahmet-izzet-pasa` vs `mka:person:izzet-pasa`: Farklı askeri dönemlerdeki İzzet Paşalar birleştirilemez.
3. `mka:place:selanik` vs `mka:place:thessaloniki-modern`: Osmanlı dönemi Selanik sancağı ile modern şehir yönetimi doğrudan tek varlık yapılamaz.

## 3. fail-closed Davranışı
Eşleşme skoru eşiğin altında kaldığında veya birden fazla çelişkili aday bulunduğunda sistem kesin birleştirme yapmaz, `requiresHumanReview: true` etiketiyle inceleme kuyruğuna aktarır.
