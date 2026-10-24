# MKA Authority Registry — Entegrasyon Kılavuzu

## 1. Web Uygulaması ve Sunucu Köprüsü
Authority Registry web katmanına `web/lib/authority-registry/` üzerinden sunulur:
- `getRegistrySummary()`: İstatistik ve sağlık durumu.
- `getAuthorityEntity(id)`: Tekil varlık ve takma ad detayları.
- `searchAuthorities(query, kind)`: Filtrelenmiş varlık araması.
- `getAtlasPlaces()`: Gemini Atlas 2.0 için DTO. Kanıtsız koordinat uydurmaz (`coords: null`), tarihsel mekân etiketlerini sağlar.
- `getChronologyEvents()`: Kimi Kronoloji için tarihli olay DTO'su.

## 2. Diğer Modüllerle Sözleşme Sınırları
- **Source Reliability (Prompt 05 / PR #20 / PR #58):** Kaynak kalitesi ve URL geçmişi sözleşme üzerinden tüketilir. Kaynak puanı doğrudan otorite güven puanı sayılmaz.
- **Evidence Workbench (Prompt 07-08):** İddia ve pasajlar authority varlıklarına yönlendirilebilir; iddia ID'leri ile authority ID'leri karıştırılmaz.
- **Admin & Onay Mekanizması (Prompt 04 / PR #26):** Bağımsız ve doğrulanmış kimlik sağlayıcı aktif olana kadar otomatik onay üretilmez.
