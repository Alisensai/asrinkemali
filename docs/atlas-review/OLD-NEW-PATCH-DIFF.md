# ESKİ VE YENİ GEMINI ATLAS KARŞILAŞTIRMALI FARK VE DEĞİŞİKLİK ANALİZİ

**DOKÜMAN:** `docs/atlas-review/OLD-NEW-PATCH-DIFF.md`  
**TARİH:** 24 Ekim 2026  
**AJAN:** ANTIGRAVITY  
**GÖREV KODU:** MKA-ANTIGRAVITY-21  

---

## 1. Paket Özeti ve Karşılaştırma Matrisi

| Kriter | Eski Paket (`asrinkemali-v07-history-atlas-paket gemini.zip`) | Yeni Paket (`MKA_ATLAS_V07_KAYNAK_KOD.zip` / Patch) | Değerlendirme & Karar |
|:---|:---|:---|:---|
| **Veri Kaynağı** | `fallback-data.ts` içinde sentetik 22 olay/mekân | `getPublishedArchiveRecords()` üzerinden canlı 168 kayıt | **KABUL (YENİ)**: Sentetik sabit veri kaldırıldı, gerçek arşiv loaderına bağlandı. |
| **Koordinat ve Harita** | `lat`, `lng` ondalık koordinat uydurması (ör. 39.93, 32.85) | `coordinate: null`, SVG şematik 7 şehir keşif aracı | **KABUL (YENİ)**: Arşivde bulunmayan enlem-boylam uydurulmadı; şematik doğası açıkça belirtildi. |
| **İnceleme Durumu** | `expertVerified: true` rozeti (sahte insan tarihçi onayı) | `published` katalog durumu, uzman onayı iddiası yok | **KABUL (YENİ)**: Epistemik dürüstlük sağlandı; sahte tarihçi onayı kaldırıldı. |
| **Rota Uyumu** | Eski `/archive` rotası | Mevcut `/arsiv/[slug]` rotası | **KABUL (YENİ)**: V0.6 katalog rota sözleşmesine uyuldu. |
| **CSS Mimarisi** | Tailwind utility sınıfları (`className="flex flex-col..."`) | Kapsüllenmiş CSS Module (`atlas.module.css`) | **KABUL (YENİ)**: Global stil kirliliği önlendi, bordo/altın/siyah MKA tokenlarına bağlandı. |
| **JSON Yolları** | `/data/atlas.json` (olmayan yol) | Server Component DTO (`toAtlasDataset`) | **KABUL (YENİ)**: Olmayan dosya yolu hataları giderildi. |
| **İlişki Grafı** | İsim benzerliğinden uydurma ilişki | `record.relatedIds` açık katalog bağlantıları | **KABUL (YENİ)**: Yalnızca yayımdaki gerçek kayıtlar bağlandı. |
| **Kurumsal İddialar** | "Yönetim Kurulu Başkanı", "Resmî Kurul" | Bağımsız tarih ve kültür platformu | **KABUL (YENİ)**: Hukuken var olmayan unvanlar temizlendi. |

---

## 2. Dosya Bazında Satır Satır Değişim Analizi

### 2.1. `web/lib/atlas/model.ts` (Yeni) vs `web/lib/atlas/engine.ts` & `adapter.ts` (Eski)
- **Eski Durum:** İki ayrı dosya (`engine.ts` ve `adapter.ts`) arasında bölünmüş, `fallback-data.ts` içindeki sahte koordinatları (`lat: 39.93, lng: 32.85`) Leaflet/Google haritasına taşımaya çalışan bir yapı vardı.
- **Yeni Durum:** Tekil, saf TypeScript `model.ts` (13.174 B) dosyası.
  - `coordinate: null` garantisi.
  - Şehir adı doğrudan `record.locations[].city` alanından gelir; metin veya başlıktan coğrafi çıkarım yapılmaz.
  - `date.start` ve `type` alanlarına göre tarih rolü (`historical-event`, `place-history`, `publication-date`, `document-date`) açıkça etiketlenir.
  - Çoklu filtreleme (şehir, kişi, kurum, kategori, tür, yıl aralığı, metin araması) O(n) deterministik mantıkla çalışır.

### 2.2. `web/components/atlas/AtlasMap.tsx` (Yeni) vs `web/components/atlas/TurkiyeSvgMap.tsx` (Eski)
- **Eski Durum:** Gerçek coğrafi poligon iddiası taşıyan, ancak enlem-boylam doğrulaması bulunmayan 12 KB'lık SVG harita.
- **Yeni Durum:** `AtlasMap.tsx` (2.843 B) erişilebilir, klavye uyumlu, 7 seçilmiş şehir butonuna sahip şematik Türkiye temsilidir. Görünür `mapDisclaimer` ile coğrafi kesinlik iddiası taşımadığı açıkça kullanıcıya sunulur.

### 2.3. `web/components/atlas/AtlasExplorer.tsx`
- **Eski Durum:** 41 KB boyutunda, karmaşık, Tailwind utility sınıflarıyla yazılmış ve dış kütüphaneler isteyen monolitik arayüz.
- **Yeni Durum:** 19 KB boyutunda, Next.js 15 Client Component (`"use client"`), CSS Modules ile modülerleştirilmiş, arama/filtreleme/kıyaslama/ilişki sekmelerine sahip sade ve yüksek performanslı arayüz.

### 2.4. `web/components/atlas/atlas.module.css` (Yeni)
- Bordo (`#36090c`, `#6e1423`), altın (`#d1a36d`, `#c9a227`), siyah (`#14100f`) renk tokenları.
- 1040px, 780px ve 430px medya sorguları ile 320px mobil taşma koruması.
- `prefers-reduced-motion: reduce` desteği.

---

## 3. Sonuç ve Özet
Yeni MKA Atlas 2.0 paketi (`MKA_ATLAS_V07_KAYNAK_KOD.zip` / `MKA_ATLAS_V07_GITHUB.patch`), eski Gemini paketindeki tüm mimari, güvenlik, epistemic dürüstlük ve tasarım kusurlarını gidermiştir.
Patch dosyası repo köküne çakışmasız olarak uygulanabilmektedir (`git apply --check` kodu 0).
