# MKA Sürüm Ekran Görüntüleri ve Görsel Kanıt Envanteri (Görev 30)

**PROJE:** ASRIN KEMALİ (MKA)  
**DENETİM:** Görsel Regresyon ve 9-Viewport Uyumu

---

## 1. 9 Viewport Ekran Görüntüsü Matrisi

Görev 30 kapsamında 8 ana senaryonun her biri 9 farklı viewportta test edilmekte ve ekran görüntüleri `docs/screenshots/` altına kaydedilmektedir.

### Başlıca Görsel Kanıt Setleri:
- `v09-release-home-[viewport].png` (Ana sayfa, kahraman banner, vitrin ve navigasyon)
- `v09-release-ataturk-[viewport].png` (Atatürk yaşam deneyimi ve kronoloji)
- `v09-release-archive-[viewport].png` (Dijital arşiv listesi ve 1923 Cumhuriyet detayı)
- `v09-release-exhibitions-[viewport].png` (Küratöryel sergiler ve tarihsel dönemler)
- `v09-release-explore-[viewport].png` (Keşfet & açıklanabilir kaynaklı öneriler)
- `v09-release-publishing-[viewport].png` (Yayınlar ve Tarihte Bugün deneyimi)
- `v09-release-workbench-[viewport].png` (Belge karşılaştırma ve Araştırma Laboratuvarı)
- `v09-release-design-system-[viewport].png` (Hakkımızda ve tasarım sistemi tokenları)

---

## 2. Sıfır Yatay Taşma Tescili

Her ekran görüntüsü alınmadan önce `scrollWidth <= innerWidth + 1` formülü assert edilmiştir. 320px mobil sınırından 1536px masaüstü ekranına kadar hiçbir rotada yatay kaydırma çubuğu (horizontal scrollbar) veya taşan içerik gözlenmemiştir.
