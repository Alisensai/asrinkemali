# Test Plani — Kilo V0.6 QA

## Kapsam
V0.5 uygulamasýný (integration/asrinkemali-v05-release-candidate) baðýmsýz olarak test etmek ve V0.6 geliþtirmeleri için yeniden kullanýlabilir testler hazýrlamak.

## Test Edilecek Alanlar
- Tüm temel sayfalar: /, /ataturk, /kronoloji, /arsiv, /arsiv/[slug], /yayinlar, /hakkimizda
- Arþiv aramasý, filtreler (tur, kategori, kaynak, sehir, baslangic, bitis), sayfalama
- Arþiv detaylarý (kaynak, hak, inceleme durumu, harici baðlantýlar)
- Kronoloji filtreleri ve hata yönetimi
- Mobil menü (aç/kapat, Escape, aria-expanded)
- Arama modalý (aç/kapat, odak yönetimi, Escape, dýþarý týklama)
- Dýþ kaynak baðlantýlarý (rel/noopener, indirme yok)
- Klavye eriþilebilirliði (Tab sýrasý, skip link, odak görünürlüðü)
- Ekran okuyucu etiketleri (aria-label, role, aria-live)
- Kontrast, yatay taþma (320px'ten masaüstüne)
- Kýrýk görseller, konsol hatalarý, network hatalarý

## Araçlar
- Playwright (çoklu viewport)
- @axe-core/playwright
- Lighthouse veya eþdeðer performans ölçümü

## Çýktýlar
- qa/kilo/ altýndaki otomatik testler ve scriptler
- web/e2e/ altýndaki Playwright testleri
- docs/qa/kilo/ altýndaki raporlar ve hata tablosu
