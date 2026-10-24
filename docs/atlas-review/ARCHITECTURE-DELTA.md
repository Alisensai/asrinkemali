# MKA ATLAS 2.0 — MİMARİ VE VERİ SÖZLEŞMESİ DEĞİŞİM RAPORU

**DOKÜMAN:** `docs/atlas-review/ARCHITECTURE-DELTA.md`  
**TARİH:** 24 Ekim 2026  
**AJAN:** ANTIGRAVITY  
**GÖREV KODU:** MKA-ANTIGRAVITY-21  

---

## 1. Mimari Katmanlar ve Sınırlar

```
               [ Sunucu Katmanı (RSC) ]
            web/app/atlas/page.tsx
                      │
                      ▼ getPublishedArchiveRecords() (web/lib/archive.ts)
            toAtlasDataset() (web/lib/atlas/model.ts)
                      │
                      ▼ Serileştirilebilir DTO (AtlasDataset)
            ───────────────────────────────────────────── [ Sunucu / İstemci Sınırı ]
                      ▼
            [ İstemci Katmanı (Client Component) ]
            web/components/atlas/AtlasExplorer.tsx
                 ├── web/components/atlas/AtlasMap.tsx (SVG Şematik Şehirler)
                 ├── web/components/atlas/AtlasTimeline.tsx (Zaman Dağılımı)
                 └── web/components/atlas/atlas.module.css
```

### 1.1. Sunucu / İstemci Sınırı ve Güvenliği
- `/atlas/page.tsx` bir Next.js Server Component olarak çalışır.
- `web/lib/archive.ts` içindeki `getPublishedArchiveRecords()` sunucu tarafında çağrılır; istemci katmanına dosya sistemi kökleri veya `server-only` modülleri sızdırılmaz.
- `toAtlasDataset()` saf fonksiyonu ile yalnızca gerekli alanlar (`id, slug, title, summary, type, date, locations, people, source, relatedIds`) serileştirilebilir DTO'ya dönüştürülür.
- İstemci bileşeni `AtlasExplorer.tsx`, ham arşiv JSON'larına veya sunucu fonksiyonlarına doğrudan erişmez.

---

## 2. Veri Eşleme ve Tip Modeli

### 2.1. `AtlasRecord` DTO Yapısı
```typescript
export interface AtlasRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: ArchiveRecordType;
  dateStart: string | null;
  dateEnd: string | null;
  dateDisplay: string;
  dateCertainty: "exact" | "estimated" | "unknown";
  dateKind: "historical-event" | "place-history" | "publication-date" | "document-date";
  year: number | null;
  locations: { name: string; city: string | null; country: string }[];
  people: string[];
  institution: string;
  sourceUrl: string | null;
  relatedIds: string[];
  coordinate: null; // Arşiv şemasında enlem/boylam bulunmadığı için daima null
}
```

### 2.2. Tarihsel Ayrım (`dateKind`)
- `type === "place"`: `place-history` (Mekânın inşa veya kuruluş tarihi; Atatürk'ün yaşam ziyareti değildir).
- `type === "publication"`: `publication-date` (Modern veya dönemsel yayım yılı; ele alınan olayın tarihi değildir).
- `type === "document"`: `document-date` (Belgenin tanzim tarihi).
- `type === "event"` veya diğer: `historical-event` (Tarihî olay tarihi).

---

## 3. Komşu Modüllerle Entegrasyon Sözleşmeleri

`web/lib/atlas/adapters.ts` dosyası aşağıdaki çapraz sözleşmeleri tanımlar:
1. **Atatürk Yaşam Deneyimi (`/ataturk`):** Derin ve uydurma alt rotalar (`/ataturk/1919` vb.) yerine doğrudan onaylı `/ataturk` rotasına yönlendirir.
2. **Dijital Arşiv (`/arsiv`):** `/arsiv/[slug]` üzerinden tekil kayıt detayına ve `/arsiv` kataloğuna güvenli bağlantı sağlar.
3. **Kronoloji (`/kronoloji`):** Yıl filtresi ile `/kronoloji?yil=...` rota sözleşmesine uyar.
4. **Evidence Workbench (Perplexity) & Search V2 (DeepSeek):** `AtlasEvidenceAdapter` ve `AtlasSearchAdapter` sözleşmeleri ile yapay zekâ hazırlığını korur; insan editör onayı iddiası taşımaz.

---

## 4. Performans ve Ölçeklenebilirlik
- 168 canlı kayıt ve 10.000 sentetik kayıt üzerinde Node ve tarayıcıda bellek sızıntısı yapmadan O(n) filtreleme gerçekleştirir.
- Açık ilişki ağında aynı anda en fazla 12 bağlantı çizilerek DOM yükü dengelenir.
