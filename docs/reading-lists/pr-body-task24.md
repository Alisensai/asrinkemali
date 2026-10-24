## 🎯 Görev 24: Meta Kişisel Koleksiyon ve Okuma Listesi Arayüzü

Bu PR, kullanıcı tarafından teslim edilen `asrinkemali-reading-lists-v07 metaal.zip` arşivini denetler, sahte mock arşiv dosyalarını ve uygunsuz demo kodlarını ayıklar ve gerçek yayımlanmış arşiv kayıtlarıyla entegre, tam erişilebilir, güvenli bir **Kişisel Koleksiyon ve Okuma Listesi Deneyimi** (`/okuma-listem`) sunar.

### 📋 Yapılan Başlıca İşler ve Değişiklikler

1. **Meta Teslimi Denetimi (`docs/reading-lists/META-SOURCE-AUDIT.md`):**
   - Teslimdeki `mock-archive.ts` (sahte `AT-1923-001` vb. kayıtlar), `@/data/archive.json` referansları ve `window.prompt` kullanan ham demo bileşenleri tespit edilerek reddedildi.
   - Sayfa mimarisi gerçek `getPublishedArchiveRecords()` arşiv verisiyle beslenen hibrit Server/Client yapısına dönüştürüldü.
   - MKA Tasarım Sistemi CSS değişkenleriyle tam uyum sağlandı; MKA anayasasına (`AGENTS.md`) sadık kalındı.

2. **Veri ve Doğrulama Katmanı (`web/lib/reading-lists/`):**
   - **`constants.ts`:** Depolama anahtarı `asrin-kemali:reading-lists:v1`, kotalar (20 koleksiyon, 200 öğe/koleksiyon, 1000 toplam öğe, 500 karakter not sınırı, 500KB JSON boyutu).
   - **`types.ts`:** `ArchiveRecordRef`, `ReadingCollection`, `ReadingItem`, `ReadingListsState`, `SortConfig`, `ImportResult`.
   - **`archive-adapter.ts`:** Gayriresmî Türkçe türleri (`kitap`, `yazisma`, `fotograf`, vb.) şema tiplerine eşleyen ve `/arsiv/[slug]` güvenli bağlantı üreten adaptör.
   - **`validation.ts`:** JSON şema doğrulaması, `<script>`/`<style>` gövdesi temizleyen XSS dezenfeksiyonu ve `__proto__` / `constructor` prototip kirlenmesi engeli.
   - **`repository.ts` & `local-repository.ts`:** `IReadingListsRepository` arayüzü ve `LocalStorageReadingListsRepository` gerçeklemesi; kota aşımları ve tarayıcı gizlilik kısıtlamalarına karşı zarif hata yönetimi.
   - **`sorting.ts`:** Türkçe yerel sıralama desteği (`addedAt`, `title`, `date`, `type`).
   - **`use-reading-lists.ts`:** `useSyncExternalStore` ile Next.js SSR hydration uyuşmazlığı yaşamayan, kaskat render üretmeyen güvenli React kancası.

3. **Bileşenler ve Tasarım (`web/components/reading-lists/`):**
   - **`reading-lists.module.css`:** MKA koyu tema jetonları (`--black`, `--red-masthead`, `--gold`, `--cream`), 320px–1536px sıfır yatay taşma, `@media print` çıktısı.
   - **`ReadingListsProvider.tsx`:** Yayınlanmış arşiv kayıtlarını istemci bileşenlerine context ile aktaran sağlayıcı.
   - **`CollectionPanel.tsx`:** Sol kenar çubuğunda koleksiyon listesi, sayaçlar, aktif koleksiyon içeriği, toplu temizleme ve silme.
   - **`ArchiveRecordCard.tsx`:** Belge kartı, daha sonra oku durumu, satır içi not düzenleyici, koleksiyon taşıma, silme ve yayınlanmamış kayıt uyarısı.
   - **`AddFromArchiveModal.tsx`:** Gerçek yayımlanmış arşivden koleksiyona güvenle belge ekleme modalı (arama, filtre, klavye döngüsü).
   - **`ImportExportPanel.tsx`:** Tarih damgalı JSON dışa aktarma, çakışma çözümlü içe aktarma ve veri sıfırlama.
   - **`AddToCollectionButton.tsx`:** Arşiv detay ve liste sayfalarında doğrudan koleksiyona ekleme yapabilen evrensel buton.
   - **`StorageWarning.tsx` & `EmptyState.tsx`:** Tarayıcı yerel depolama gizlilik bildirimleri ve sıfır durum rehberliği.

4. **Sayfa ve Rota (`web/app/okuma-listem/`):**
   - `page.tsx`: Server Component, `getPublishedArchiveRecords()` yükler, SEO meta verilerini tanımlar.
   - `OkumaListemClientView.tsx`: İstemci görünüm yöneticisi, hydration koruması ve erişilebilir durum yönetimi.
   - `layout.tsx` & `loading.tsx`: SEO şeması ve erişilebilir yükleme iskeleti.

---

### 🧪 Test ve Doğrulama Sonuçları

- **Birim Testleri (`web/tests/reading-lists-ui.test.mjs`):**
  - **39 testin tamamı başarılı** (T-24-001 - T-24-050).
  - Depolama kotası, XSS dezenfeksiyonu, prototip kirlenmesi koruması, JSON dışa/içe aktarım bütünlüğü, Türkçe sıralama doğrulandı.
  - Toplam proje birim testleri: **244 passed, 0 failed**.
- **Uçtan Uca Playwright Testleri (`web/e2e/reading-lists-ui.spec.ts` - Port 4438):**
  - **72 testin tamamı başarılı** (9 viewport: 320px, 360px, 375px, 390px, 430px, 768px, 1024px, 1440px, 1536px).
  - `scrollWidth <= innerWidth + 1` ile sıfır yatay taşma kanıtlandı.
  - 9 adet ekran görüntüsü kaydedildi (`docs/screenshots/v08-reading-lists-*`).
- **Kod Kalitesi ve Derleme:**
  - `npm run typecheck`: 0 hata.
  - `npm run lint`: 0 hata, 0 uyarı.
  - `npm run build`: 168 sayfa derlendi (`○ /okuma-listem` dahil statik ve SSR çıktıları).
  - `node scripts/archive/validate.mjs`: 168 kayıt, 151 yayımlanmış, 0 hata.
