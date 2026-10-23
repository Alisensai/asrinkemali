# Asrın Kemali — Piksel Denetimi ve Tasarım Envanteri (PIXEL-AUDIT.md)

**Belge Sürümü:** v1.0 — Sprint 1 İnce İşçilik ve Piksel Denetimi  
**Tarih:** 23 Ekim 2026  
**Ana Referans:** `design/ONAYLANAN-TASARIM.webp` (1536×1024)  
**İncelenen Dal:** `feature/antigravity-visual-fidelity` (PR #2)  
**Beklenen Entegrasyon Dalı:** `integration/nextjs-visual-v03` (Codex tarafından açılacaktır)  

---

## 1. 1536×1024 Referans Ölçüm ve Yerleşim Tablosu (X/Y Envanteri)

Aşağıdaki tablo, `design/ONAYLANAN-TASARIM.webp` referans görselinin 1536x1024 piksel çözünürlüğündeki gerçek koordinatları ile mevcut prototipin (PR #2) ölçümlerini karşılaştırmaktadır:

| Bölüm / Bileşen | Referans X Sınırı | Referans Y Sınırı | Referans Boyut (GxY) | Mevcut Prototip Boyut | Sapma / Durum |
|---|---|---|---|---|---|
| **Konteyner (Container)** | x: 86 — 1452 | y: tüm | 1366px genişlik | 1420px genişlik | Mevcut 54px daha geniş; 1366px sınırına çekilmeli |
| **1. Üst Bilgi Çubuğu (Utility Bar)** | x: 0 — 1536 | y: 0 — 34 | 1536 × 35px | 1536 × 38px | +3px yükseklik; 35px'e indirilmeli |
| • Sol Tarih (Takvim + Metin) | x: 86 — 270 | y: 8 — 26 | ~184 × 18px | ~180 × 18px | Uyumlu |
| • Orta Alıntı (Atatürk Sözü) | x: 290 — 1140 | y: 8 — 26 | ~850 × 18px | flex-center | Uyumlu |
| • Sağ Araçlar (A11y, Dil, Arama) | x: 1160 — 1452 | y: 8 — 26 | ~290 × 18px | ~280 × 18px | Uyumlu |
| **2. Bordo Masthead (Header)** | x: 0 — 1536 | y: 35 — 175 | 1536 × 141px | 1536 × ~168px | Mevcut padding nedeniyle +27px yüksek; 141px olmalı |
| • MKA Altın Arması | x: 92 — 232 | y: 36 — 174 | 140 × 140px | 136 × 136px | Çok yakın (4px fark) |
| • Başlık (ASRIN KEMALİ) | x: 256 — 580 | y: 78 — 114 | ~324 × 36px | 34-54px clamp | Uyumlu; font: Cinzel Bold |
| • Motto (BİR ASRIN MİRASI...) | x: 258 — 640 | y: 124 — 140 | ~382 × 16px | 10-13px clamp | Uyumlu; tracking: 3.2px |
| • Arşivde Ara Butonu | x: 1162 — 1290 | y: 88 — 130 | 128 × 42px | 135 × 44px | Uyumlu |
| • Dijital Müze Butonu | x: 1305 — 1445 | y: 88 — 130 | 140 × 42px | 145 × 44px | Uyumlu |
| **3. Ana Yatay Navigasyon (Nav Bar)** | x: 0 — 1536 | y: 176 — 225 | 1536 × 50px | 1536 × 48px | -2px; 50px tam hedefe eşitlenecek |
| • Ev İkonu (Home SVG) | x: 152 | y: 192 — 208 | 16 × 16px | 15 × 15px | Uyumlu |
| • Menü Bağlantıları (10 Adet) | x: 210 — 1310 | y: 188 — 214 | 10 öğe | 10 öğe | Uyumlu; Cinzel 12.5px |
| **4. Hero Kompozisyonu** | x: 0 — 1536 | y: 226 — 640 | 1536 × 414px | 1536 × 480px | **+66px fazla yükseklik!** 414px'e sabitlenmeli |
| • Kicker (TARİHİN EN BÜYÜK...) | x: 114 | y: 268 | 13px (tracking 3.5) | 12px | Uyumlu |
| • Pretitle (GAZİ MUSTAFA KEMAL) | x: 114 | y: 295 — 335 | ~38px | 36px | Uyumlu |
| • Title (ATATÜRK) | x: 114 | y: 340 — 435 | ~95px | 95px | Uyumlu (Playfair/Cinzel) |
| • Açıklama (Bir milletin...) | x: 114 | y: 445 — 495 | 2 satır / 22px | 22px | Uyumlu |
| • Aksiyon Butonları (Arşiv/Kronoloji)| x: 114 — 635 | y: 525 — 575 | 48px yükseklik | 48px yükseklik | Uyumlu |
| • Slayt Pager (01 ── 01 02 03 04) | x: 114 — 330 | y: 595 — 615 | 14px | 14px | Uyumlu |
| • Atatürk Portresi (Sağ Görsel) | x: 650 — 1452 | y: 226 — 640 | 802 × 414px | ~62% | Pozisyon 48% 30% olarak ayarlanmalı |
| • Sağ Alıntı & İmza | x: 1140 — 1445 | y: 410 — 580 | ~305 × 170px | ~35% | Hero 414px olunca tam oturacak |
| **5. Dörtlü Kısayol Kartları (Shortcuts)**| x: 86 — 1452 | y: 641 — 760 | 1366 × 119px | ~122px | Kartlar arası gap 9px olmalı |
| • Kart 1: Fotoğraf Arşivi | x: 86 — 420 | y: 641 — 760 | 334 × 119px | 1fr | Uyumlu |
| • Kart 2: Belge Merkezi | x: 429 — 764 | y: 641 — 760 | 335 × 119px | 1fr | Uyumlu |
| • Kart 3: Dijital Kütüphane | x: 773 — 1108 | y: 641 — 760 | 335 × 119px | 1fr | Uyumlu |
| • Kart 4: Tarih Kronolojisi | x: 1117 — 1452 | y: 641 — 760 | 335 × 119px | 1fr | Uyumlu |
| **6. Güncel Yayınlar ve Tarihte Bugün** | x: 86 — 1452 | y: 765 — 1024 | 1366 × 259px | 1024px altına taştı | Hero 414px yapılınca **ilk ekrana sığacak** |
| • Güncel Yayınlar (Sol Blok) | x: 86 — 998 | y: 765 — 1024 | 912px genişlik | ~2fr | Uyumlu |
| • 3 Yayın Kartı | her biri ~294px | y: 825 — 965 | 294 × 140px | 180px | 140px'e çekilmeli |
| • Tarihte Bugün (Sağ Blok) | x: 1030 — 1452 | y: 765 — 1010 | 422 × 245px | 390px | 422px genişlik ve 245px yükseklik |

---

## 2. Renk Paleti ve Tasarım Belirteçleri (Design Tokens)

Referans görselin renk örneklemelerinden (color-picking) elde edilen tam değerler:

| Token Adı | Referans HEX | Açıklama / Kullanım Alanı |
|---|---|---|
| `--night` | `#0a0708` | Gece siyahı ana arka plan |
| `--red-masthead` | `#32070a` / `#200405` | Masthead bordo degrade tonları |
| `--red-nav` | `#280608` / `#190304` | Navigasyon bandı koyu bordo |
| `--red-card-tag` | `#6e1115` | Yayın kartlarındaki rozet kırmızısı (ARAŞTIRMA, MAKALE, BELGE) |
| `--red-button` | `#8a131b` -> `#520b10` | 'ARŞİVİ KEŞFET' birincil buton gradyanı |
| `--gold` | `#d1a36d` | Standart pirinç/altın (çerçeveler, başlık çizgileri, ikonlar) |
| `--gold-bright` | `#e7bf8c` | Vurgu ve hover altını |
| `--gold-pale` | `#f5e8d4` | Açık altın krem (aktif sekme, pager) |
| `--gold-gradient` | `linear-gradient(180deg, #fff 0%, #ebd7b8 32%, #d1a36d 68%, #ab7e48 100%)` | Dev 'ATATÜRK' başlığı kabartmalı altın dolgu |
| `--border-gold` | `rgba(209, 163, 109, 0.45)` | Kart ve buton altın kenarlıkları |
| `--border-subtle` | `rgba(138, 92, 60, 0.35)` | İnce ayraç ve dikey zaman çizgisi |

---

## 3. Tipografi ve Karakter Ailesi

- **Monogram ve Display Başlıklar:** `Cinzel` (Roman anıt taş baskı zarafeti)
- **Dev Heybetli İsim Başlığı:** `Playfair Display` + `Cinzel` (Türkçe 'Ü' ve noktalı harfleri kusursuz destekler)
- **Alıntılar ve Gövde Metinleri:** `Cormorant Garamond` (Klasik asil serif, 400 ve 600)
- **Kicker, Butonlar, Etiketler ve Yardımcı Arayüz:** `Montserrat` (Temiz, okunabilir geometrik sans-serif)

---

## 4. Envanter Denetimi: 10 Kritik Görsel Sapma ve Düzeltme İterasyonları

1. **[ÖNEM: ÇOK YÜKSEK] Hero Yüksekliği & İlk Ekran Görünürlüğü:**  
   Referansta 1536x1024 ekranında kullanıcı aşağı kaydırmadan (above-the-fold) Güncel Yayınlar ve Tarihte Bugün kartlarını tam olarak görmektedir. Prototipte Hero 480px olduğu için bu bölümler ekranın altına taşmıştı. Hero `414px` olarak düzeltildi.
2. **[ÖNEM: YÜKSEK] Konteyner Genişliği (1366px):**  
   Referansta sol marj 86px, sağ marj 86px'tir; toplam içerik genişliği 1366px'tir. Prototipteki 1420px konteyner 1366px'e çekildi.
3. **[ÖNEM: YÜKSEK] Dörtlü Kartlar Arası Boşluk (Gap = 9px):**  
   Referansta 4 kart arasındaki boşluk tam 9px'tir. Prototipteki 12px boşluk 9px'e indirildi ve kartlar tam 119px yüksekliğe eşitlendi.
4. **[ÖNEM: YÜKSEK] Yayın Kartı Yüksekliği (140px):**  
   Referansta yayın kartları 140px yüksekliktedir. Prototipteki 180px yükseklik 140px'e ayarlandı.
5. **[ÖNEM: ORTA] Tarihte Bugün Panosu Genişliği (422px):**  
   Referansta Tarihte Bugün panosu 422px genişliktedir. 390px'den 422px'e çıkarıldı.
6. **[ÖNEM: ORTA] Masthead Padding ve Dikey Yükseklik (141px):**  
   Masthead min-height `141px` olarak sabitlendi, gereksiz dikey paddingler temizlendi.
7. **[ÖNEM: ORTA] Atatürk Portresi Kırpma ve Konumlandırma:**  
   Portre arka planı `width: 60%; background-position: 48% 30%;` yapılarak yüz tam merkezlendi.
8. **[ÖNEM: DÜŞÜK] Atatürk İmzası Altın Opasitesi:**  
   İmza transparanlığı %80 ve altın rengi olarak optimize edildi.
9. **[ÖNEM: DÜŞÜK] Slider Pager Çizgisi:**  
   Çizgi genişliği 54px'ten 62px'e çıkarıldı.
10. **[ÖNEM: KURAL] Tarihsel Kaynaklandırma ve Şeffaflık:**  
    Referanstaki 'Tarihte Bugün' maddeleri ve alıntıların kaynak durumu belgelendi (Bkz. Madde 6).

---

## 5. Mobil İnce İşçilik (390×844 ve 360×800)

- **360px Android Sınırı:** Masthead logo boyutu 58px, başlık boyutu `clamp(19px, 5.5vw, 26px)`, arama ve müze butonları 36×36px kare ikon butonlar haline getirilerek yatay taşma (overflow-x) kesinlikle engellendi.
- **Hero Metinleri:** 'değiştiren irade' kelimeleri arasındaki boşluk düzeltildi; tipografi mobilde Atatürk'ün yüzünü ezmeyecek şekilde hafif transparan zeminle dengelendi.
- **Hızlı Erişim Kartları:** Mobilde 2×2 grid ile ferah ve tam okunabilir dokunmatik hedeflere (>=44px) dönüştürüldü.
- **Erişilebilirlik:** Klavyeyle focus ring, mobil menü toggle aria-expanded özniteliği ve yüksek kontrast modu eksiksiz çalışmaktadır.

---

## 6. Tarihî Doğruluk, Kaynaklandırma ve Şeffaflık Denetimi

AGENTS.md Kural 6, 7 ve 8 gereğince:
- **Hero Kapak Görseli:** Yapay zekâ üretimi olup, arayüz üzerinde *'Kapak görseli: Yapay zekâ ile hazırlanmış temsili canlandırma.'* şeklinde açıkça etiketlenmiştir. Tarihî arşiv fotoğrafı olarak sunulmamıştır.
- **Tarihte Bugün Maddeleri:**
  - *1923: Türkiye Büyük Millet Meclisi, İktisat Vekâleti'nin kurulmasına ilişkin kanunu kabul etti.*
  - *1927: Ankara'da Gazi Mustafa Kemal, öğretmenlerle bir araya geldi.*
  - *1933: Üniversite reformu kapsamında önemli adımlar atıldı.*
  - *1936: Montrö Sözleşmesi görüşmeleri başladı.*
  > [!NOTE]
  > Bu maddeler onaylanan görsel tasarımdan (`design/ONAYLANAN-TASARIM.webp`) doğrudan alınmış temsili/örnek takvim verileridir. OpenCode ve Codex entegrasyonu tamamlandığında Türk Tarih Kurumu (TTK) ve Başbakanlık Cumhuriyet Arşivi (BCA) birincil kaynak katalog numaralarıyla doğrulanarak veritabanına bağlanmalıdır.
- **Alıntılar:**
  - Üst bar: *“En büyük eserim, Türk milletinin hürriyet ve istiklalini temin eden cumhuriyettir.”*
  - Hero alanı: *“Türk milletinin tarihi, bir hürriyet ve istiklal mücadelesi tarihidir.”*
  Her iki söz de Atatürk'ün kamuoyunca bilinen vecizeleridir; ancak canlı arşivde yayınlanmadan önce tam konuşma tarihi ve kaynağı OpenCode tarafından teyit edilecektir.

---

## 7. Entegrasyon Durumu ve Eksik Dal Raporu

- **GitHub Remote Dalları:**
  - `origin/main` (Mevcut)
  - `origin/feature/antigravity-visual-fidelity` (PR #2 - Antigravity Görsel Dalı - Açık)
  - `origin/feature/codex-app-foundation` (PR #1 - Codex Next.js Temel Dalı - Açık)
- **Eksik Dal:** `integration/nextjs-visual-v03`
  > [!IMPORTANT]
  > Görev yönergesi gereği: *'Codex'in aktif entegrasyon dalı yoksa orada yeni dal açma; A aşamasını tamamlayıp hangi dalın eksik olduğunu raporla.'*  
  > Codex henüz `integration/nextjs-visual-v03` dalını açıp GitHub'a göndermemiştir. Bu dal GitHub remote'unda var olduğunda derhal `feature/antigravity-next-visual-qa` dalı oluşturulacak ve B aşamasındaki Next.js CSS/bileşen ince işçiliğine başlanacaktır.
