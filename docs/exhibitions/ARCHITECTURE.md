# Asrın Kemali — MKA Immersive Museum Platform V0.7
## Sergi Motoru, Veri Mimarisi ve Editoryal Yönetim Rehberi

### 1. Vizyon ve Mimari Amaç
Asrın Kemali Dijital Müze Platformu (V0.7), Mustafa Kemal Atatürk'ün yaşamı, devrimleri ve Cumhuriyet'in kurucu dönemini birincil tarihî arşiv belgeleri, yüksek çözünürlüklü dijital vitrinler ve 3D sanal galeri odaları aracılığıyla sunan bağımsız, veri temelli bir dijital küratörlük sistemidir.

Proje, yalnızca statik sayfalar yerine; gelecekte yeni sergilerin JSON formatında kolayca eklenebildiği, insan uzman incelemesinden geçen ve üretim ortamında güvenlik kapılarıyla korunan modüler bir sergi motoru sağlar.

---

### 2. Dizin Yapısı ve Dosya Organizasyonu

```
asrinkemali/
├── content/
│   ├── archive/records/           # 18 adet tescilli birincil arşiv kaydı (.json)
│   └── exhibitions/
│       ├── staging/               # Geliştirme ve küratoryal inceleme sergileri (.json)
│       └── published/             # İnsan uzman onayı almış resmî sergiler (.json)
├── web/
│   ├── app/
│   │   ├── sergiler/
│   │   │   ├── page.tsx           # Küratöryel sergi dizin ve tema filtreleme sayfası
│   │   │   └── [slug]/
│   │   │       └── page.tsx       # Bireysel sergi sayfası (SSG + dinamik görünüm)
│   ├── components/
│   │   └── exhibitions/
│   │       ├── DocumentShowcase.tsx       # Birincil belge vitrini
│   │       ├── SourceInspector.tsx        # Kayan kaynak inceleme çekmecesi (Escape/Backdrop)
│   │       ├── ExhibitionHero.tsx         # Görsel hero ve mod değiştirici
│   │       ├── ExhibitionTimeline.tsx     # Olay ve belge tarihini ayıran zaman çizgisi
│   │       ├── VirtualGalleryRoom.tsx     # 3D Sanal Galeri Odası (klavye/ok tuşları)
│   │       ├── ExhibitionSectionRenderer.tsx # Liste/Belge modunda doğrusal akış
│   │       ├── ExhibitionCard.tsx         # Dizin kartı
│   │       ├── ExhibitionFilterBar.tsx    # Arama ve tema filtresi
│   │       ├── ExhibitionsDirectoryClient.tsx # İstemci filtreleme koordinatörü
│   │       ├── ExhibitionView.tsx         # Çift mod koordinatörü
│   │       └── exhibitions.module.css     # Müze standardı responsive stiller
│   ├── lib/
│   │   └── exhibitions/
│   │       ├── types.ts           # TypeScript veri sözleşmeleri ve discriminated union
│   │       ├── workflow.ts        # Durum makinesi ve güvenlik denetleyicisi
│   │       └── repository.ts      # Server-only veri yükleyici ve DTO dönüştürücü
│   └── tests/
│       └── exhibitions.test.mjs   # 40 adet kapsamlı birim testi
```

---

### 3. Bölüm (Section) Türleri ve Veri Şeması

Her sergi, `ExhibitionSection` discriminated union türüne ait modüler bölümlerden oluşur:

| Bölüm Türü | Açıklama | Anahtar Alanlar |
|---|---|---|
| `hero` | Giriş kapısı ve sergi künyesi | `subtitle`, `leadParagraph`, `curatorNote`, `actions` |
| `narrative` | Tarihsel anlatı ve doğrulanmış alıntılar | `content[]`, `historicalContext`, `highlightQuote` |
| `archive_showcase` | Başyapıt belge vitrini | `primaryDocument` (DocumentItem), `summary`, `contextualNotes[]` |
| `timeline` | Tarihsel kronoloji | `events[]` (`eventDate`, `documentDate`, `archiveSlug`) |
| `document_gallery` | Belge koleksiyonu plaketleri | `items[]` (DocumentItem), `lead` |
| `source_panel` | Doğrulanmış kurumsal kaynakça paneli | `statement`, `sources[]` (SourceValidationItem) |
| `comparison` | Tarihsel dönem ve belge karşılaştırması | `aspectTitle`, `leftColumn`, `rightColumn` |
| `closing` | Tarihsel miras ve kapanış | `epilogue`, `curatorSignoff`, `sourcesSummary`, `suggestedExhibitions[]` |

---

### 4. Çift Görünüm Modu (Dual View Experience)

Sergi detay sayfasında kullanıcı iki farklı deneyim arasında geçiş yapabilir:
1. **Sanal Galeri Odası (`VirtualGalleryRoom`):**
   - CSS 3D derinlik ve perspektif sahnesi.
   - Salon bölümleri arasında klavyenin **Sağ / Sol Ok** tuşları ve **Önceki / Sonraki** butonları ile geçiş.
   - HUD durum çubuğu: Aktif bölüm numarası ve dinamik ilerleme çubuğu.
   - Odaklanmış vitrin aydınlatması ve ambiyans ışıması.
2. **Belge / Liste Modu (`ExhibitionSectionRenderer`):**
   - Doğrusal, akıcı ve akademik okumaya uygun belge akışı.
   - Bölüm başlıkları, transkripsiyon blokları, genişletilmiş kaynak paneli ve zaman çizelgesi.
   - Ekran okuyucular ve erişilebilirlik gereksinimleri için optimize edilmiştir.

---

### 5. Kaynak İnceleme Çekmecesi (`SourceInspector`)

Birincil arşiv belgelerine şeffaf ve güvenilir erişim sağlar:
- Herhangi bir belgede "Kaynak Detayı" tıklandığında sağdan kayarak açılır.
- **Escape** tuşuna basıldığında veya yarı saydam arka plana tıklandığında otomatik kapanır.
- Muhafaza edilen resmî kurum, katalog/fon numarası, olay tarihi, telif/lisans durumu ve bibliyografik dipnot içerir.
- Varsa doğrudan dijital arşiv bağlantısına (`/arsiv/[slug]`) yönlendirir.

---

### 6. Editoryal İnceleme ve Yayın Kapısı Güvenliği (Workflow Gates)

Sergi yaşam döngüsü 4 aşamadan oluşur:
```
[draft] ──(İncelemeye Gönder)──► [in_review] ──(Uzman Onayı)──► [approved] ──(Yayımla)──► [published]
```

- **Üretim Ortamı Güvenliği (`repository.ts`):**
  `NODE_ENV === "production"` ortamında, `ALLOW_STAGING_EXHIBITIONS` ortam değişkeni açıkça tanımlanmadıkça `staging` altındaki sergiler veya `isSyntheticPreview: true` bayrağı taşıyan kurgular son kullanıcıya sunulmaz.
- **Arşiv Bütünlüğü:**
  Sergilerde referans verilen her `archiveSlug`, projenin doğrulanmış 18 arşiv kaydı (`content/archive/records/`) ile eşleşmek zorundadır.

---

### 7. Copilot ve Yönetim Paneli Entegrasyon Rehberi

Copilot veya yönetim paneli üzerinden yeni bir sergi oluşturulurken izlenecek adımlar:
1. `content/exhibitions/staging/<sergi-slug>.json` dosyasını oluşturun.
2. `relatedArchiveRecordSlugs` alanında yalnızca doğrulanmış arşiv kayıtlarını referans verin.
3. `editorialReview.status` alanını `"in_review"` olarak başlatın.
4. `npm run typecheck` ve `npm test` komutlarını çalıştırarak veri bütünlüğünü doğrulayın.
5. Küratoryal onay alındığında dosyayı `content/exhibitions/published/` klasörüne taşıyın ve `status: "published"` yapın.
