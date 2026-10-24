# MÜZE VE SERGİ PLATFORMU — KARŞILAŞTIRMA VE UYUM MATRİSİ

**Ajan:** ANTIGRAVITY  
**Tarih:** 24 Ekim 2026  
**Referans Tabanı:** PR #27 (`feature/antigravity-v07-immersive-museum`, commit `117a4f4`)  
**Denetlenen Aday:** AnyCoder Dijital Sergi Prototipi  

---

## 1. MİMARİ VE YETENEK KARŞILAŞTIRMA MATRİSİ

| Yetenek / Özellik | PR #27 Mevcut Durumu | AnyCoder Prototip İddiası / Beklentisi | Risk & Güvenlik Değerlendirmesi | Nihai Karar |
|---|---|---|---|---|
| **3D Galeri Deneyimi** | Saf CSS 3D Transforms (`perspective`, `rotateY`, `translateZ`). Dış kütüphane sıfır. | WebGL / Three.js / Canvas tabanlı haricî motor | Three.js bundle boyutu (>600KB) ve mobil GPU yükü. CSS 3D hafif ve responsive. | **DUPLICATE / REJECT** (CSS 3D korunur) |
| **Klavye & Erişilebilirlik** | `ArrowLeft`/`ArrowRight`, HUD düğmeleri, odak halkaları, WAI-ARIA rolleri mevcut | Genellikle mouse-only / touch kaydırma odaklı | Klavye erişilebilirliği olmayan prototipler erişilebilirlik kuralını ihlal eder | **REJECT** (PR #27 a11y korunur) |
| **Birincil Belge Vitrini** | `DocumentShowcase.tsx`: Kurum, fon no, tarih, transkripsiyon gösterimi | Vitrin kartı ve önizleme | Şema uyumlu; ancak lisanssız görsel embed riski | **DUPLICATE** (PR #27 yeterli) |
| **Kaynak İnceleme Çekmecesi** | `SourceInspector.tsx`: Sağdan kayan drawer, Escape ile kapanma | Modal veya inline açılır detay | Mevcut PR #27 bileşeninde sahte "Doğrulanmış" rozeti riski var | **ADAPT / DEFERRED** (Task 26'ya devredildi) |
| **Bağlamsal Zaman Çizelgesi** | `ExhibitionTimeline.tsx`: Olay tarihi ile belge arşiv tarihini ayıran çift tarihli yapı | Doğrusal kronoloji | Olay tarihi ile arşiv belgesi düzenlenme tarihinin karıştırılması riski | **DUPLICATE** (PR #27 korunur) |
| **Haricî Script & CDN** | Sıfır haricî script; yerel Next.js paketleri | Haricî script tagleri / CDN referansları | CSP ve SSRF ihlali, veri sızıntısı tehlikesi | **REJECT** (Haricî CDN yasak) |
| **Yayın ve Staging Güvenliği** | 4 aşamalı durum makinesi (`draft` -> `in_review` -> `approved` -> `published`) | Bilinmiyor (Muhtemel doğrudan dosya okuma) | Staging sergilerinin yayına sızması engellenmeli | **DEFERRED** (Task 26'ya devredildi) |

---

## 2. GÖRSEL VE TASARIM SİSTEMİ UYUMU

- **Onaylı Görsel Referansı:** `design/ONAYLANAN-TASARIM.webp`.
- **CSS Değişkenleri:**
  - `--black`: `#080606`
  - `--red-masthead`: `#36090c`
  - `--gold`: `#d1a36d`
  - `--gold-bright`: `#e7bf8c`
  - `--cream`: `#f4e8d6`
- **Tipografi:** Serif (`Cinzel`, `Playfair Display`), Sans (`Montserrat`).
- **Yatay Taşma Garantisi:** 320px–1536px arasındaki tüm 9 viewportta `documentElement.scrollWidth <= innerWidth + 1` sağlanmak zorundadır.

---

## 3. TELİF, PROVENANS VE ETİK İLKELER

1. **İzin ve Lisans Güvencesi:** Telif durumu belirsiz (`unknown`) veya yalnızca kaynak linkine izin veren (`source_link_only`) arşiv görselleri için doğrudan görsel dosyası yüklenemez; yalnızca kaynak kurum URL'si verilir.
2. **Yapay Zekâ Ayrımı:** Tarihî arşiv fotoğrafı olmayan ve üretken modellerden gelen görseller açıkça *"Yapay zekâ ile oluşturulmuş temsili görsel"* ibaresi taşımalıdır.
3. **İnsan Onayı Önceliği:** 302 adet insan uzman onayı eksikliği hiçbir prototipte otomatik onaylanmış gibi gösterilemez.
