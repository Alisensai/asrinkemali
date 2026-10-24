# Arşiv önerileri

Bu modül kullanıcı davranışı, çerez, IP, dış API veya yapay zekâ çağrısı kullanmadan yalnız yayımlanmış `ArchiveRecord` metadatasından deterministik ilgili-kayıt önerileri üretir.

`ASRIN_RECOMMENDATIONS=1` yalnız sunucuda verilirse arşiv detay sayfasında çalışır; URL parametresi özelliği açamaz. Kapatıldığında rota eski davranışına döner. Öneri gerekçeleri katalog alanı kesişimini açıklar; tarihî nedensellik veya insan uzman onayı iddia etmez.

İstemciye dar `RecommendationItem` DTO'su gönderilir. Taslak, reviewed, staging ve diğer yayın dışı kayıtlar hiçbir aşamada aday değildir.
