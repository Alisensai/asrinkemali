# Güvenlik ve Bağımsızlık Beyanı (Görev 05)

1. **Salt Okunur Garanti:** Bu araç katalog, arşiv veya içerik dosyalarında hiçbir mutasyon yapmaz. Hash denetimi ile doğrulanmıştır.
2. **Sahte Onay Engeli:** Hiçbir fonksiyon otomatik olarak 'tarihçi onayladı' veya 'yayınlanabilir' üretmez. humanApproved: false ve canPublishAutomatically: false invaryantları korunur.
3. **SSRF ve URL Güvenliği:** Ağ kontrolleri yalnızca güvenli HTTPS hedefleri üzerinde yürütülür; localhost, loopback, özel IPv4/IPv6 ve metadata adresleri engellenmiştir.
4. **Bağımsızlık:** Platform resmî bir kamu kurumu değildir; bağımsız tarihsel araştırma projesidir.
