# MKA 150 Maddelik Bağımsız Sürüm Denetim Matrisi (Görev 30)

**PROJE:** ASRIN KEMALİ (MKA)  
**DENETİM:** Nihai Mobil, WCAG 2.2 ve Görsel Sürüm Adayı Denetimi (T001 – T150)  
**TARİH:** 24 Ekim 2026

---

## 1. 150 Maddelik Denetim Özeti

Matris 15 ana temada 150 bağımsız kriteri kapsamaktadır:

1. **T001 – T010: Home & Shell**: Ana sayfa bileşenleri, hero, navigasyon, 320px taşmasızlık, ARIA etiketleri. (**PASS**)
2. **T011 – T020: Header & Navigation**: Klavye döngüsü (Tab/Shift+Tab), Escape ile menü kapatma, touch target >= 44px. (**PASS**)
3. **T021 – T030: Archive Listing**: 6 kayıt türü, filtreleme, sayfalama, XSS koruması, URL arama parametreleri. (**PASS**)
4. **T031 – T040: Archive Details**: Provenans, kurum bağlantısı, telif durumu, lisanssız resim embed yasağı. (**PASS**)
5. **T041 – T050: Exhibitions**: Sanal galeri, vitrin anlatımları, staging veri izolasyonu, 320px mobil uyum. (**PASS**)
6. **T051 – T060: Atlas & Map**: Mekân koordinatları, coğrafi harita, şehir filtreleri, touch etkileşimi. (**PASS**)
7. **T061 – T070: Historical Periods**: 4 ana tarihsel dönem, kronolojik sıralama, açıklayıcı metinler. (**PASS**)
8. **T071 – T080: Document Comparison**: Yan yana birincil kaynak karşılaştırma, diff görünürlüğü, metin güvenliği. (**PASS**)
9. **T081 – T090: Publications**: Araştırma makaleleri, editoryal onay kapısı, kaynakça doğrulaması. (**PASS**)
10. **T091 – T100: Today in History**: Gün/ay takvim hassasiyeti, 29 Şubat artık yıl desteği, 31 Şubat ret. (**PASS**)
11. **T101 – T110: Personal Collections**: SSR hydration güvenliği, yerel depolama kotası (500KB), JSON import/export. (**PASS**)
12. **T111 – T120: Research Workbench**: Production fail-closed koruması, CSV formül enjeksiyonu engeli. (**PASS**)
13. **T121 – T130: Explore & Recommendations**: Deterministik puanlama, gerekçe paneli, Qwen stub fallback. (**PASS**)
14. **T131 – T140: WCAG 2.2 & Accessibility**: Kontrast oranları, heading seviyeleri (h1-h3), reduced motion. (**PASS**)
15. **T141 – T150: Responsive & Visual**: 9 Viewport genelinde sıfır yatay taşma (`scrollWidth <= innerWidth + 1`). (**PASS**)

Tüm 150 madde bağımsız testler ve Playwright E2E ile kanıtlanmıştır.
