# MKA ATLAS 2.0 — COĞRAFİ KOORDİNAT VE PROVENANS İNCELEMESİ

**DOKÜMAN:** `docs/atlas-review/COORDINATE-PROVENANCE.md`  
**TARİH:** 24 Ekim 2026  
**AJAN:** ANTIGRAVITY  
**GÖREV KODU:** MKA-ANTIGRAVITY-21  

---

## 1. Coğrafi Veri Gerçekliği ve Sınırları

### 1.1. Şemada Koordinat Eksikliği
- Mevcut `schemas/archive-record.types.ts` ve katalog kayıtlarında (`content/archive/records/`, `data/archive/catalog/`) **enlem ve boylam (latitude, longitude) alanı bulunmamaktadır**.
- Kayıtlarda yalnızca `locations: [{ name: string, city?: string, country?: string }]` beyan edilmektedir.

### 1.2. Eski vs Yeni Yaklaşım
- **Eski Gemini Atlas Yaklaşımı (Kabul Edilemez / Reddedildi):**
  - Arşivde bulunmayan şehir merkezlerine keyfî ondalık GPS koordinatları (`lat: 39.93, lng: 32.85` vb.) atanmıştı.
  - Bu yaklaşım, tarihsel belgelere sahte coğrafi kesinlik uydurmak anlamına geldiği için **epistemik dürüstlük anayasasına aykırıdır**.
- **Yeni MKA Atlas 2.0 Yaklaşımı (Onaylandı):**
  - DTO içinde `coordinate: null` değeri açıkça korunur.
  - Şehir filtrelemesi doğrudan beyan edilen `record.locations[].city` stringi üzerinden yapılır.
  - Metin veya başlıktan ("Samsun'dan Erzurum'a" vb.) keyfî rota veya çoklu şehir çıkarımı yapılmaz.

---

## 2. Şematik Harita Temsili

### 2.1. `AtlasMap.tsx` Tasarım Prensipleri
- Bileşen, gerçek ölçekli veya onaylı sınırları olan bir Türkiye coğrafi poligon haritası **değildir**.
- Görünür `mapDisclaimer` metni ile kullanıcılara:
  > *"Şematik şehir keşif aracıdır; coğrafi kesinlik veya tarihî olay koordinatı içermez."*
  ibaresi şeffafça sunulur.
- SVG üzerinde 7 seçilmiş ana merkez düğmesi (Ankara, İstanbul, İzmir, Samsun, Erzurum, Sivas, Manastır/Selânik) yer alır.
- Harita dışındaki diğer şehirler erişilebilir bir `secondaryCities` açılır menüsü üzerinden seçilebilir.

---

## 3. Uluslararası Mekânlar ve Sınır Ötesi Tarih

- Selânik (`ayk-selanik-ataturk-evi`), Manastır (`ayk-manastir-askeri-idadisi`), Şam, Trablusgarp ve Sofya gibi Osmanlı dönemi sınır ötesi mekânları:
  - Türkiye SVG şeması üzerine yapay olarak zorlanmaz.
  - Uluslararası yerleşimler `internationalLocations` sekmesi altında listelenir.
  - Şehir kuruluşu tarihi ile Atatürk'ün ziyaret tarihi kesin olarak ayırt edilir (`dateKind: "place-history"`).
