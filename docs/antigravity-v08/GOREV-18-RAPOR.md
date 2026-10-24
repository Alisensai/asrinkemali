# MKA GÖREV 18 — PREMIUM DİJİTAL ARŞİV RAPORU

**GÖREV KODU:** MKA-ANTIGRAVITY-18-PREMIUM-ARCHIVE  
**AJAN:** ANTIGRAVITY  
**TARİH:** 24 Ekim 2026  
**DAL:** `feature/antigravity-v08-premium-archive`  
**BASE:** `feature/antigravity-v08-home-shell` (PR #34, commit `20f4512`)  
**DURUM:** TAMAMLANDI / DRAFT PR HAZIR  

---

## 1. Uygulanan Modüller ve Değişiklikler

1. **Arşiv Kataloğu Arayüzü (`web/app/arsiv/page.tsx`):**
   - **Altı Kayıt Türü Varyantları:** Fotoğraf (`photograph`), Belge (`document`), Konuşma (`speech`), Olay (`event`), Yayın (`publication`) ve Mekân (`place`) türleri için semantik ikonlar ve renklendirilmiş sol kenar bordürleri (`[data-record-type]`).
   - **Epistemik Dürüstlük:** İnceleme durumunda sahte onaylama ima eden yeşil checkmark ikonu (`Icon name="check"`) kaldırılarak tarafsız `Icon name="document"` ile değiştirildi. `reviewLabel` ile teknik `published` durumu kullanıcılara "Kaynak denetimli · uzman onayı bekliyor" olarak dürüstçe sunuldu.
   - **Tarih Hassasiyeti:** Tahmini tarihlerde `(tahmini)` ibaresi kart üstü metadataya eklendi.
   - **Erişilebilir Kart Semantiği:** Her kart tekil `<Link>` sarmalayıcısına dönüştürüldü; iç içe anchor (nested anchor) hataları sıfırlandı.
   - **Tam GET Parametre Sözleşmesi:** `q`, `tur`, `kategori`, `kaynak`, `sehir`, `baslangic`, `bitis`, `sayfa` parametreleri korunarak form submit ve sayfalama sürekliliği sağlandı.
   - **Boş Durum (Empty State):** Eşleşmeyen sorgularda `EmptyState` primitifi ile bilgilendirme ve doğrudan `/arsiv` temizleme bağlantısı sunuldu.

2. **Kayıt Detay Dosyası (`web/app/arsiv/[slug]/page.tsx`):**
   - **Medyasız Kayıtlar için Tipografik Müze Plaketi:** Görseli bulunmayan veya `source_link_only` hak kısıtı taşıyan belgeler için sahte görsel üretilmedi; `MuseumPlaque` primitifi devreye alınarak kurumsal künye, kayıt numarası ve arşiv hakları sunuldu.
   - **Orijinal Medya ve Temsili AI Görsel Ayrımı:** `record.image.displayPolicy === "embedded_allowed"` durumunda resim çerçevesi, kaynak atfı ve `record.image.kind === "ai_representative"` rozeti ("Yapay Zekâ Temsili Görsel" / "Orijinal Arşiv Belgesi") görüntülendi.
   - **İlişkili Arşiv Kayıtları (`relatedRecords`):** `record.relatedIds` dizisi `getPublishedArchiveRecordById` ile taranarak yalnızca yayında olan gerçek arşiv kayıtları "İlişkili Arşiv Kayıtları" bölümünde listelendi; sahte veya uydurma ilişkiler engellendi.
   - **Dossier Künyesi (Sidebar):** Erişilebilir `dl/dt/dd` yapısı ile kayıt no, tarih, tür, yer, kaynak kurum, künye, kullanım hakkı ve inceleme durumu sunuldu. Kurumsal dış linklerde `rel="noopener noreferrer external"` korundu.

3. **Veri ve Servis Katmanı Uyarlaması (`web/lib/archive.ts`):**
   - `getPublishedArchiveRecordById(id: string)` saf yardımcı fonksiyonu eklendi; ID ve slug karışıklığı önlenerek ilişkili kayıtların O(1) düzeyinde güvenli çözümlenmesi sağlandı.

4. **Stil Katmanı (`web/app/content-platform.module.css`):**
   - Altı kayıt türü için `data-record-type` temaları eklendi.
   - İlişkili arşiv kartları için `.relatedSection`, `.relatedGrid`, `.relatedCard` ve tipografi stilleri tanımlandı.
   - 320px–1536px responsive akışta taşma koruması pekiştirildi.

---

## 2. Risk ve Durum Envanteri

| Durum Kodu | Sınıflandırma | Referans / Dosya | Kanıt ve Gerekçe |
|:---|:---|:---|:---|
| **CONFIRMED** | Epistemik Dürüstlük | `arsiv/page.tsx` & `[slug]/page.tsx` | Sahte yeşil checkmark ikonları kaldırıldı; uzman onayı bekleyen durum açıkça yazıldı. |
| **CONFIRMED** | Sıfır Yatay Taşma | `premium-archive.spec.ts` | 9 Viewportta (320px .. 1536px) liste ve detay sayfalarında `scrollWidth <= innerWidth + 2px` doğrulandı. |
| **CONFIRMED** | Medyasız Kayıt Plaketi | `MuseumPlaque.tsx` | Görseli olmayan 130+ kayıtta sahte resim üretilmedi; tipografik müze plaketi gösterildi. |
| **CONFIRMED** | GET Parametre Uyumu | `tests/premium-archive.test.mjs` | `q, tur, kategori, kaynak, sehir, baslangic, bitis, sayfa` ayrıştırma ve URL dizisi oluşturma test edildi. |
| **CONFIRMED** | Türkçe Arama Katlama | `tests/premium-archive.test.mjs` | İZMİR / izmir normalizasyonu ve kurum filtresi test edildi. |
| **FIXED** | İkon ve Tip Uyuşmazlığı | `[slug]/page.tsx` | Olmayan `'archive'` ikonu `'museum'` ile değiştirildi, TS2322 hatası giderildi. |
| **FIXED** | Şema Göreli Yolu | `[slug]/page.tsx` | `../../../../schemas/archive-record.types` ile TS2307 import hatası çözüldü. |
| **NEEDS_REVIEW** | İnsan Tarihçi Onayı | `content/archive/records/` | 151 yayımlanmış kayıt insan uzman incelemesi beklemektedir; sistem bu engeli gizlemez. |
| **NOT_IN_SCOPE** | Arşiv Kayıt JSON'ları | `content/archive/` | Veri dosyalarına ve şemaya dokunulmadı; backend veri bütünlüğü korundu. |

---

## 3. Test ve Doğrulama Metrikleri

1. **Playwright E2E Testleri (`web/playwright.archive.config.ts`):**
   - **9 Viewport:** `desktop-1536x1024`, `desktop-1440x900`, `tablet-1024x768`, `tablet-768x1024`, `mobile-430x932`, `mobile-390x844`, `mobile-375x667`, `mobile-360x800`, `mobile-320x568`.
   - **Toplam:** **36 test çalıştırıldı, 36'sı başarılı geçti (0 hata)**.
   - Doğrulanan senaryolar: Sıfır yatay taşma (liste + detay), Türkçe arama ve filtreleme, boş durum ve sıfırlama, detay dossier künyesi, MuseumPlaque görünürlüğü.

2. **Birim Testleri (`npm test`):**
   - **66/66 test başarılı geçti (0 hata).**
   - `web/tests/premium-archive.test.mjs` altındaki 10 test (GET parametreleri, Türkçe normalizasyon, tür aliasları, kaynak kurum filtrelemesi, yıl aralığı sınırları, ID çözümleme, dürüst etiketler, sahte onaysızlık, MuseumPlaque) eksiksiz doğrulandı.

3. **Prodüksiyon Derlemesi (`npm run typecheck && npm run build`):**
   - TypeScript sıfır hata ile geçti.
   - 164 sayfanın tamamı Turbopack ile statik (SSG/Static) olarak başarıyla derlendi.

4. **Arşiv Doğrulaması (`validate.mjs` ve testler):**
   - 168 kayıt başarıyla doğrulandı.
   - 74/74 arşiv testi yeşil geçti.

5. **Linter Denetimi (`npm run lint`):**
   - 0 hata, 0 uyarı ile temiz tamamlandı.

---

## 4. Ekran Görüntüleri Envanteri

Oluşturulan 13 ekran görüntüsü `docs/screenshots/` dizininde arşivlenmiştir:
- `v08-archive-desktop-1536x1024.png`
- `v08-archive-desktop-1440x900.png`
- `v08-archive-tablet-1024x768.png`
- `v08-archive-tablet-768x1024.png`
- `v08-archive-mobile-430x932.png`
- `v08-archive-mobile-390x844.png`
- `v08-archive-mobile-375x667.png`
- `v08-archive-mobile-360x800.png`
- `v08-archive-mobile-320x568.png`
- `v08-archive-detail-1536x1024.png`
- `v08-archive-detail-mobile-390x844.png`
- `v08-archive-plaque-1536x1024.png`
- `v08-archive-empty-state-1536x1024.png`

---

## 5. Devir Notları (Sonraki Görev: GÖREV 19)

- **Temel:** `feature/antigravity-v08-premium-archive` dalı, Görev 19 (Atatürk Yaşam Deneyimi & Yaşam Rayı) için hazır ve test edilmiş temiz bir temel sağlar.
- **Kayıt Çözümleme:** `getPublishedArchiveRecordById` fonksiyonu Görev 19'da yaşam kronolojisi kayıtlarının çözümlenmesinde doğrudan kullanılabilir.
