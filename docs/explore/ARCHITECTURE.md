# MKA Keşfet & Açıklanabilir Öneriler Mimarisi (Görev 29)

**PROJE:** ASRIN KEMALİ (MKA)  
**MODÜL:** Keşif & Açıklanabilir Öneri Motoru  
**YOL:** `web/app/kesfet/`, `web/components/explore/`, `web/lib/explore-ui/`

---

## 1. Mimari Katmanlar

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                       │
│                   web/app/kesfet/page.tsx                   │
│         (Server Component - getPublishedArchiveRecords)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────────────────────┐       ┌──────────────────────────────┐
│       Explore DTO Katmanı    │       │     Arama ve Filtreleme      │
│  (archiveRecordToExploreDTO) │       │ (search.ts / foldTurkish)    │
└──────────────┬───────────────┘       └──────────────┬───────────────┘
               │                                      │
               ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Açıklanabilir Öneri Motoru (recommendations.ts)    │
│    - Doğrudan Katalog Referansı (relatedId: 40p)             │
│    - Ortak Tarihî Şahsiyetler (samePerson: 25p)              │
│    - Ortak Mekân ve Şehirler (sameLocation: 20p)             │
│    - Ortak Tematik Kategori (sameCategory: 20p)              │
│    - Aynı Tarihsel Dönem (samePeriod: 15p)                   │
│    - Paylaşılan Etiketler (sharedTag: 10p)                   │
│    - Benzer Arşiv Türü (sameType: 5p)                        │
│    - Deterministik Tie-breaker (id alfabetik artan)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│   Deterministik Baz Servis   │ │     Qwen LLM Adaptörü       │
│(DeterministicArchiveService) │ │  (QwenRecommendationService│
│    [Aktif / Canlı Motor]     │ │  isAvailable: false, stub)  │
└──────────────────────────────┘ └─────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Kullanıcı Deneyimi Bileşenleri                │
│  ExploreHero · ExploreFilterBar · ExploreCard · Clusters    │
│           (Müze Sınıfı Bordo/Altın, Sıfır Yatay Taşma)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. DTO ve Veri Güvenliği Sözleşmesi

`web/lib/explore-ui/types.ts`:
- `ExploreRecordDTO`: İstemciye sızmaması gereken iç denetim alanlarından (`verification.reviewedBy`, `verification.notes`, staging ID'leri vb.) arındırılmış temiz sözleşme.
- `ExploreRecommendation`:
  - `score`: 1–100 arasında normalize edilmiş bağıntı puanı.
  - `primaryReason`: En yüksek ağırlıklı gerekçenin özet başlığı (örn. `🎯 Ortak Şahsiyet (İsmet İnönü)`).
  - `reasons`: `RecommendationReason[]` dizisi (her gerekçenin kodu, başlığı, ağırlığı ve açıklama metni).
  - `evidenceRecordId`: Öneriye kaynaklık eden tohum kaydın ID'si.
  - `explanation`: İnsan tarafından okunabilir açık tarihsel gerekçe cümlesi.

---

## 3. Tarihsel Dönem Haritası (`HISTORICAL_PERIODS`)

1. **Osmanlı Dönemi ve Askeri Görevler (1881–1918)**: Selanik, Harp Okulu, Şam, Trablusgarp, Çanakkale, Kafkas ve Filistin cepheleri.
2. **Millî Mücadele ve Kurtuluş Savaşı (1919–1923)**: 19 Mayıs 1919 Samsun, Amasya, Erzurum, Sivas, TBMM açılışı, Sakarya, Büyük Taarruz ve Mudanya.
3. **Cumhuriyetin İlanı ve Erken Devrimler (1923–1930)**: Cumhuriyetin ilanı, Teşkilat-ı Esasiye, hilafetin ilgası, Tevhid-i Tedrisat, şapka, harf ve hukuk inkılapları.
4. **Kurumsallaşma ve Kültür Atılımları (1930–1938)**: Türk Tarih ve Türk Dil kurumları, Üniversite reformu, Montrö Boğazlar Sözleşmesi, Hatay ve devletçilik ilkeleri.

---

## 4. Determinizm ve Sentetik Ölçek Testi

`benchmarkRecommendationScorer`:
- 1, 168, 2.000 ve 10.000 sentetik kayıtta çalıştırılarak skorlama fonksiyonunun deterministikliği assert edilir.
- Karıştırılmış (shuffled) aday havuzlarında dahi `b.score !== a.score ? b.score - a.score : a.record.id.localeCompare(b.record.id, "tr")` formülü sayesinde aynı ilk 5 öneri sırası garantilenir.
