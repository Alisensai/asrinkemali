# MKA Keşfet (Explore UI) — Açıklanabilir Kaynaklı Öneriler ve Türkçe Arama

**PROJE:** Mustafa Kemal Atatürk odaklı bağımsız tarih ve kültür platformu  
**MARKA:** ASRIN KEMALİ · **KISALTMA:** MKA  
**MOTTO:** BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI  
**GÖREV:** 29 / 30 — ANTIGRAVITY

---

## 1. Genel Bakış ve Amaç

MKA Keşfet arayüzü (`/kesfet`), Mustafa Kemal Atatürk'ün yaşamı, Millî Mücadele ve Cumhuriyet devrimlerine ait zengin arşiv materyallerini (belgeler, fotoğraflar, konuşmalar, olaylar, yayınlar ve tarihî mekânlar) araştırmacıların ve yurttaşların çok boyutlu, şeffaf ve açıklanabilir biçimde keşfetmesini sağlayan gelişmiş bir kullanıcı deneyimidir.

Sistem, yapay zekâ kategorilendirme ilkelerini, kurumsal kaynak provenansını ve katalog çapraz referanslarını bir araya getirerek her önerinin arkasındaki tarihsel gerekçeyi açıkça kullanıcıya sunar.

---

## 2. Temel İlkeler ve Qwen Modül Gerçekliği

1. **Qwen / Haricî Model Gerçekliği ve Güvenli Fallback**:
   GitHub üzerinde `qwen`, `deepseek` veya `explore` adında canlı bir backend API dalı bulunmamaktadır. Görev anayasası gereği tanımsız haricî modeller uydurulmamış; gerçek yayınlanmış arşiv kayıtlarından (`getPublishedArchiveRecords()`) beslenen, %100 tip-güvenli ve deterministik bir öneri motoru (`DeterministicArchiveRecommendationService`) inşa edilmiştir. Gelecekte gelebilecek haricî modeller için genişletilebilir adaptör arayüzü (`QwenRecommendationServiceAdapter`) hazır bırakılmıştır.
2. **Yayın Kapısı ve Sıfır Sahte Onay**:
   Hiçbir kartta veya öneri panelinde "onaylı tarihçi" veya "verified historian" ibaresi yer almaz. Katalog statüsü daima `reviewLabel("published")` ("Kaynak denetimli · uzman onayı bekliyor") olarak dürüstçe sunulur.
3. **Deterministik ve Şeffaf Sıralama**:
   Açıklanabilir öneri skorları katalog çapraz referansları (40p), ortak şahsiyetler (25p), ortak mekânlar (20p), ortak kategoriler (20p), aynı tarihsel dönem (15p), ortak etiketler (10p) ve aynı arşiv türü (5p) üzerinden hesaplanır. Eşitlik durumunda `id` alfabetik artan sırayla deterministik tie-break uygulanır.
4. **Türkçe Karakter Duyarlı Arama**:
   `ı/i`, `İ/i`, `ğ`, `ü`, `ş`, `ö`, `ç` ve düzeltme işaretli (`â`, `î`, `û`) tüm aramalarda katlama (`foldTurkish`) yapılarak başlık, özet, etiket, kategori, şahsiyet, mekân ve kurum alanlarında eşleşme aranır; eşleşen alanlar kullanıcıya gösterilir.
5. **Müze Sınıfı Tasarım ve Erişilebilirlik**:
   `design/ONAYLANAN-TASARIM.webp` referans alınarak siyah, bordo, obsidyen ve altın paleti uygulanmış; 320px–1536px arasındaki tüm 9 viewportta sıfır yatay taşma (`scrollWidth <= innerWidth + 1`) ve minimum 44px dokunma hedefleri sağlanmıştır.

---

## 3. Sayfa Rotaları ve URL Parametreleri

- `/kesfet`: Tematik kümeler ve genel arşiv keşif ana sayfası.
- `/kesfet?q=[arama-terimi]`: Türkçe arama sonuçları.
- `/kesfet?kayit=[slug]`: Belirli bir arşiv kaydına göre açıklanabilir öneriler (Odak Kayıt modu).
- `/kesfet?tur=[tur]`: Kayıt türü filtresi (`fotograf`, `belge`, `konusma`, `olay`, `yayin`, `mekan`).
- `/kesfet?donem=[donem]`: Tarihsel dönem filtresi (`osmanli-askeri`, `milli-mucadele`, `erken-cumhuriyet`, `kurumsallasma`).
- `/kesfet?kategori=[kategori]`: Tematik kategori filtresi.
- `/kesfet?siralama=[alaka|yeni|eski]`: Sıralama modu.
- `/kesfet?sayfa=[sayfa-no]`: Sayfalama navigasyonu.

---

## 4. Dosya Yapısı

```
web/
├── app/
│   └── kesfet/
│       ├── page.tsx               # Server Component (Veri yükleme, filtreleme, öneriler)
│       └── kesfet.module.css       # MKA Bordo/Altın paleti, responsive, sıfır taşma
├── components/
│   └── explore/
│       ├── ExploreHero.tsx        # Hero banner, arama formu, açıklanabilirlik garantisi
│       ├── ExploreFilterBar.tsx   # Tür, dönem, kategori, sıralama ve sıfırlama çubuğu
│       ├── ExploreCard.tsx        # Kart görünümü, "Neden Önerildi?" paneli, kurum bilgisi
│       ├── RecommendationCluster.tsx # Tematik ve dönemsel küme bileşeni
│       ├── ExploreEmptyState.tsx  # Sonuç bulunamadığında rehberlik eden boş durum
│       └── index.ts
├── lib/
│   └── explore-ui/
│       ├── types.ts               # ExploreRecordDTO, RecommendationReason, Cluster DTO'ları
│       ├── recommendations.ts     # Deterministik öneri algoritması, dönemler, kümeler, benchmark
│       ├── search.ts              # Türkçe foldTurkish, çok alanlı arama, filtreler
│       ├── adapter.ts             # ArchiveRecord -> ExploreRecordDTO, Qwen adaptör fallback
│       └── index.ts
├── tests/
│   └── explore-ui.test.mjs        # 20 kapsamlı birim testi (determinizm, xss, fallback)
├── playwright.explore-ui.config.ts # Port 4448, 9 viewport test yapılandırması
└── e2e/
    └── explore-ui.spec.ts         # 9 viewport'ta taşma, arama, tohum öneri ve screenshot testleri
```
