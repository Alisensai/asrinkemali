# MKA Arama Kalitesi ve Değerlendirme Laboratuvarı (Search Evaluation Lab)

## 1. Amaç
ASRIN KEMALİ arama altyapısının (yerel sözlüksel sıralayıcı, semantik rerank adaptörü ve gelecekteki arama modelleri) arama doğruluğunu; Precision@K, Recall@K, MRR ve nDCG@K metrikleri üzerinden ölçen, haricî API bağımlılığı ve maliyet getirmeyen, çevrimdışı ve deterministik kalite değerlendirme laboratuvarıdır.

## 2. Mimari ve Güvenlik İlkeleri
1. **Haricî API ve Ücretli Servis Yoktur:** Sistem Cohere veya başka bir ücretli servise canlı istek atmaz. Haricî rerank ihtiyaçları `MockExternalReranker` ile simüle edilir ve açıkça `external_mock / simulated` olarak etiketlenir.
2. **ReDoS Koruması:** Kullanıcı ve test sorguları asla filtrelenmeden RegExp nesnelerine enjekte edilmez; deterministik Türkçe tokenizasyon (`normalizeTurkish` ve `tokenize`) kullanılır.
3. **CSV Formül Enjeksiyonu Koruması:** Dışa aktarılan dosyalarda `=` , `+` , `-` , `@` veya sekme ile başlayan hücreler otomatik tek tırnak (`'`) ile öneklenir.
4. **Salt-Okunur İndeks:** `data/archive` ve `content/archive` kayıtları değiştirilmez; path traversal girişimleri CLI seviyesinde engellenir.
