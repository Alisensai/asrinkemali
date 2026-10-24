# MKA Keşfet Geri Alma (Rollback) Planı (Görev 29)

**PROJE:** ASRIN KEMALİ (MKA)  
**DURUM:** Geri Alma ve Kurtarma Prosedürü

---

## 1. Geri Alma Kapsamı ve Risk Değerlendirmesi

Görev 29 kapsamında eklenen dosyalar izole bir rota (`web/app/kesfet/`), bağımsız bileşenler (`web/components/explore/`), bağımsız kütüphane (`web/lib/explore-ui/`), testler (`web/tests/explore-ui.test.mjs`, `web/e2e/explore-ui.spec.ts`) ve dar navigasyon entegrasyonundan (`web/lib/site-data.ts`) ibarettir.

Arşiv katalog şeması (`schemas/archive-record.types.ts`), katalog JSON dosyaları (`content/archive/records/`, `data/archive/catalog/`) veya PR #28 FORTRESS güvenlik kuralları değiştirilmemiştir. Dolayısıyla geri alma işlemi sıfır veri kaybı riski taşır.

---

## 2. Geri Alma Adımları

Eğer `feature/antigravity-v08-qwen-explore-ui` dalındaki değişikliklerin tamamen geri alınması gerekirse:

1. **Önceki Kararlı Dala Dönüş**:
   ```bash
   git checkout feature/antigravity-v08-perplexity-research-workbench-ui
   ```

2. **Dalı Yerel Olarak Silme (İsteğe Bağlı)**:
   ```bash
   git branch -D feature/antigravity-v08-qwen-explore-ui
   ```

3. **Uzaktaki Dalı ve PR'ı Kapatma (GitHub Erişimi Varsa)**:
   ```bash
   gh pr close 52 --delete-branch
   ```

4. **Navigasyon ve Rota Temizliği Doğrulaması**:
   - `web/lib/site-data.ts` dosyasından `Keşfet` bağlantısı kalktığında `/kesfet` rotası 404 döner.
   - `npm test`, `npm run typecheck` ve `npm run build` komutlarıyla regresyon olmadığı doğrulanır.
