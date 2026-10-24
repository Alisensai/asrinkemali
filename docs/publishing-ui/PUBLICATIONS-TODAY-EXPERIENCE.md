# MKA Yayınlar ve Tarihte Bugün Deneyimi — Mimari ve Güvenlik Dokümantasyonu

**Görev No:** 27 / 30  
**Tarih:** 24 Ekim 2026  
**Dal:** `feature/antigravity-v08-publications-today-experience`  
**Taban Dal:** `feature/antigravity-v08-immersive-museum-hardening` (PR #49)  
**Atanan Port:** 4444  

---

## 1. Mimari Genel Bakış
Görev 27 kapsamında `/yayinlar`, `/yayinlar/[slug]` ve `/tarihte-bugun` arayüzleri, bağımsız MKA müze tasarım dili ve sıkı yayın kapısı güvenliği kurallarına uygun biçimde modüler bileşen mimarisiyle yeniden yapılandırılmıştır.

### Temel Prensipler:
1. **Dürüst Yayın Durumu (Zero Fake Content / Zero Fake Approval):**
   - Gerçek editör veya insan tarihçi onayı olmayan yayınlar kamuya açık listede yer almaz.
   - Yayın bulunmadığında yapay içerik uydurulmaz; prestijli ve yönlendirici bir boş durum (Empty State) gösterilir.
2. **Takvim Doğruluğu ve Artık Yıl Desteği:**
   - `web/lib/publishing/today.ts` içinde `isValidMonthDay(month, day)` fonksiyonu 2024 artık yılı referansıyla 29 Şubat'ı desteklerken, 31 Şubat ve 31 Nisan gibi geçersiz tarihleri kesinlikle reddeder.
   - Geçersiz tarih girdilerinde Europe/Istanbul güncel tarihine dönülür ve erişilebilir bir bildirim (`role="alert"`) sunulur.
   - Hassasiyeti yalnızca gün (`precision === "day"`) olan kayıtlar eşleştirilir; ay veya yıl hassasiyetli kayıtlar Tarihte Bugün seçkisine dahil edilmez.
3. **ID ve Slug Çözümlemesi:**
   - İlgili arşiv referansları (`relatedArchiveIds`) kayıt ID'lerini içerdiğinde, `getPublishedArchiveRecordById(id)` çözücüsü kullanılarak kanonik `/arsiv/[slug]` URL'leri üretilir.
4. **Güvenlik ve Harici Kaynak İzolasyonu:**
   - Harici bağlantılarda yalnızca güvenli HTTPS protokollerine izin verilir (`javascript:`, `http:` veya yerel ağlar engellenir).
   - Dış bağlantılara `rel="noopener noreferrer external"` niteliği atanır.

---

## 2. Modüler Bileşen Yapısı (`web/components/publication-experience/`)
- `PublicationFilters.tsx`: Kategori, arama ve sıralama GET form süzgeçleri ve filtre temizleme aksiyonu.
- `PublicationCard.tsx`: Tipografik hiyerarşi, kategori/tür rozetleri, tahmini okuma süresi ve güvenli kaynak bağlantıları.
- `PublicationEmptyState.tsx`: Doğrulanmış yayın bulunmadığında dijital arşive (`/arsiv`) ve tarihte bugüne (`/tarihte-bugun`) yönlendiren prestijli kart.
- `TodayDateSelector.tsx`: Gün ve ay seçimi, "Bugüne Dön" butonu, form doğrulama ve açıklayıcı bilgi.
- `TodayEventCard.tsx`: Olay başlığı, tam takvim tarihi, özet, birincil arşiv kaydı bağlantısı ve kaynak atfı.
- `SourceCitation.tsx`: Kaynak kurum, atıf metni ve harici güvenli bağlantı gösterimi.

---

## 3. Erişilebilirlik ve Stil Kuralları (`web/app/publishing.module.css`)
- **Responsive Uyum:** 320px–1536px aralığında yatay taşma sıfırdır (`scrollWidth <= innerWidth + 1`).
- **Baskı Uyumu (`@media print`):** Akademik atıf ve kaynakça metinleri baskıda görünür kalır; form ve gezinme öğeleri gizlenir.
- **Erişilebilirlik:** `prefers-reduced-motion` ve `forced-colors` modları tam desteklenir; minimum dokunma hedefi 44px'dir.
