# MKA ATLAS 2.0 — GÜVENLİK VE HUKUKİ PROVENANS DENETİM RAPORU

**DOKÜMAN:** `docs/atlas-review/SECURITY-REVIEW.md`  
**TARİH:** 24 Ekim 2026  
**AJAN:** ANTIGRAVITY  
**GÖREV KODU:** MKA-ANTIGRAVITY-21  

---

## 1. Paket ve Arşiv Güvenliği

| Güvenlik Başlığı | Denetim Kriteri | Sonuç | Açıklama |
|:---|:---|:---|:---|
| **Path Traversal / Zip Slip** | `../`, `..\\`, absolute paths, Windows drive paths (`C:\`) | **TEMİZ (PASS)** | Paket içindeki tüm dosyalar göreli yollardadır; kök dizin dışına taşma yoktur. |
| **Duplicate Zip Members** | Mükerrer dosya girdisi | **TEMİZ (PASS)** | Pakette çift veya büyük/küçük harf çakışmalı dosya yoktur. |
| **Symbolic Links** | Sembolik bağ sömürüsü | **TEMİZ (PASS)** | Pakette hiçbir sembolik veya hard link bulunmamaktadır. |
| **Zip Bomb Oranı** | Aşırı sıkıştırma (decompression bomb) | **TEMİZ (PASS)** | Sıkıştırılmış: 34.104 B, açılmış: ~120 KB. Oran ~3.5:1 (tamamen güvenli). |
| **Dosya Boyutu Tavanı** | Tek dosya boyut limiti | **TEMİZ (PASS)** | En büyük dosya 19.409 B (`AtlasExplorer.tsx`). 5 MB tavanının çok altındadır. |
| **Gizli Veri / Sır Taraması** | API key, parola, AWS key, private key | **TEMİZ (PASS)** | Regex taraması sıfır gizli anahtar / kimlik bilgisi bulgusu verdi. |
| **Kriptografik Bütünlük** | `SHA256SUMS.txt` uyumu | **TEMİZ (PASS)** | Tüm 15 dosyanın SHA-256 özeti `SHA256SUMS.txt` listesiyle %100 eşleşti. |

---

## 2. Çalışma Zamanı ve Kod Güvenliği

### 2.1. URL ve Bağlantı Güvenliği (`safeUrl`)
- Dış kurumsal kaynak linklerinde tehlikeli protokoller (`javascript:`, `data:`, `file:`, `vbscript:`) taranmakta ve reddedilmektedir.
- Geçerli dış bağlantılarda `target="_blank"` ve `rel="noopener noreferrer external"` zorunlu olarak uygulanmıştır.
- `encodeURIComponent(record.slug)` ile rota enjeksiyonu önlenmiştir.

### 2.2. XSS ve HTML Kaçırma
- `dangerouslySetInnerHTML` kullanımı: **0 adet**.
- SVG harita bileşeni (`AtlasMap.tsx`) doğrudan React JSX elemanlarıyla (`<svg>`, `<path>`, `<button>`) derlenir; ham HTML enjeksiyonu riski yoktur.

### 2.3. Sunucu / İstemci İzolasyonu
- İstemci modüllerine (`AtlasExplorer.tsx`, `AtlasMap.tsx`, `AtlasTimeline.tsx`) hiçbir sunucu ortam değişkeni, `node:fs` veya `server-only` modülü sızdırılmamıştır.
- Veri transferi salt serileştirilebilir DTO (`AtlasDataset`) üzerinden yürütülür.

### 2.4. Üçüncü Taraf Bağımlılıkları ve Harita SDK'ları
- Canlı OAuth bağımlılığı: **YOKTUR**.
- Ücretli harita SDK'sı (Google Maps JavaScript API, Mapbox GL JS, Leaflet): **YOKTUR**.
- Dış harita kutucuğu (tile server) veya CDN scripti yüklenmez; CSP (Content Security Policy) sıkılığı korunur.

---

## 3. Hukuki ve Epistemik Provenans
- **Kurumsal İddialar:** Platform kendini "bağımsız tarih ve kültür platformu" olarak tanıtır. Resmî kamu kurumu, enstitü veya hukuken kurulmamış yönetim kurulu unvanları kesinlikle yer almaz.
- **Tarihçi Onayı:** Teknik `published` durumu kullanıcılara "uzman onaylı" şeklinde sunulmaz. 151 yayımlanmış kaydın insan uzmanı incelemesi beklediği şeffafça korunur.
- **Temsili Görsel:** Görseli olan kayıtlarda AI temsili görseller belirgin biçimde etiketlenir.
