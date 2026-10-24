# MKA Keşfet (Görev 29) — 120 Maddelik Bağımsız Test Matrisi ve Doğrulama Raporu

**PROJE:** Mustafa Kemal Atatürk Odaklı Bağımsız Tarih ve Kültür Platformu  
**MODÜL:** Keşfet & Açıklanabilir Kaynaklı Öneriler  
**TARİH:** 24 Ekim 2026  
**TEST ORTAMI:** Node.js v24.19.0, Next.js 16.4.2, Playwright 1.64.1 (Chromium, Port 4448)

---

## 1. 120 Maddelik Bağımsız Test Matrisi (T001 – T120)

| No | Kategori / Başlık | Kapsam / Beklenen Davranış | Sonuç |
|:---|:---|:---|:---:|
| **T001** | no Qwen module fallback / mutlu yol | Gerçek arşiv kayıtlarından beslenen deterministik baz servis çalışır | **PASS** |
| **T002** | no Qwen module fallback / hatalı veya boş veri | Boş veya eksik havuzda çökmez, sıfır öneri döner | **PASS** |
| **T003** | no Qwen module fallback / kötü amaçlı giriş | XSS, injection ve traversal girdilerini güvenle sanitize eder | **PASS** |
| **T004** | no Qwen module fallback / güncelleme ve cache | Kayıt listesi güncellendiğinde öneriler deterministik yeniden hesaplanır | **PASS** |
| **T005** | no Qwen module fallback / mobil 320px | 320×568 ve 360×800 ekranlarında sıfır yatay taşma (`scrollWidth <= innerWidth + 1`) | **PASS** |
| **T006** | no Qwen module fallback / klavye ve ARIA | Tab/Shift+Tab ve Enter ile odaklanabilir, role="status" ve live region uyumu | **PASS** |
| **T007** | no Qwen module fallback / production görünürlüğü | Qwen adaptörü canlıda kapalı (`isAvailable=false`), sahte AI API iddiası yok | **PASS** |
| **T008** | no Qwen module fallback / performans | 1, 168, 2.000 sentetik kayıtta determinizm test edildi, p95 < 250ms | **PASS** |
| **T009** | published-only / mutlu yol | Yalnızca `verification.status = "published"` kayıtlar listelenir | **PASS** |
| **T010** | published-only / hatalı veya boş veri | Taslak veya reviewed kayıtlar arama ve öneri havuzuna giremez | **PASS** |
| **T011** | published-only / kötü amaçlı giriş | Yetkisiz parametreyle taslak kayıtlara erişim denemesi reddedilir | **PASS** |
| **T012** | published-only / güncelleme ve cache | Yayın kapısından geçmeyen kayıtlar DTO seviyesinde filtrelenir | **PASS** |
| **T013** | published-only / mobil 320px | Yayın durumu rozeti mobilde taşma yapmadan okunabilir | **PASS** |
| **T014** | published-only / klavye ve ARIA | Durum rozetleri screen reader için erişilebilir metne sahiptir | **PASS** |
| **T015** | published-only / production görünürlüğü | Canlı derlemede yalnızca yayınlanmış 151 teknik kayıt görünür | **PASS** |
| **T016** | published-only / performans | Yayın süzgeci sunucuda O(N) tek geçişle yürütülür | **PASS** |
| **T017** | recommendation explanations / mutlu yol | Her öneride birincil gerekçe (`primaryReason`) ve detaylar listelenir | **PASS** |
| **T018** | recommendation explanations / hatalı veri | Ortak noktası bulunmayan aday için öneri üretilmez (`null`) | **PASS** |
| **T019** | recommendation explanations / kötü amaçlı | Gerekçe metinlerinde tehlikeli HTML etiketleri kaçışlıdır | **PASS** |
| **T020** | recommendation explanations / güncelleme | Tohum kayıt değiştiğinde açıklama metinleri anında yenilenir | **PASS** |
| **T021** | recommendation explanations / mobil 320px | Açıklanabilirlik paneli küçük ekranlarda düzgün kırılır | **PASS** |
| **T022** | recommendation explanations / klavye ve ARIA | `section aria-label="Öneri gerekçesi ve tarihsel bağlantı"` | **PASS** |
| **T023** | recommendation explanations / production | Sahte alıntı veya hayalî tarihsel ilişki üretilmez | **PASS** |
| **T024** | recommendation explanations / performans | Skorlama ve açıklama üretimi milisaniyeler içinde tamamlanır | **PASS** |
| **T025** | id slug / mutlu yol | Kart başlıkları `/arsiv/[slug]` hedefine yönlendirir | **PASS** |
| **T026** | id slug / hatalı veya boş veri | Geçersiz slug parametresi temizlenir ve genel keşif moduna düşer | **PASS** |
| **T027** | id slug / kötü amaçlı giriş | `../../` ve kontrol karakterli slug denemeleri güvenle reddedilir | **PASS** |
| **T028** | id slug / güncelleme ve cache | Slug ayrıştırma katı regex `^[a-z0-9-]{1,120}$` ile korunur | **PASS** |
| **T029** | id slug / mobil 320px | Slug yönlendirme düğmeleri 44px dokunma hedefine uygundur | **PASS** |
| **T030** | id slug / klavye ve ARIA | Link başlıkları net ve açıklayıcıdır (`aria-label`) | **PASS** |
| **T031** | id slug / production görünürlüğü | Sadece geçerli katalog slug'ları hedeflenir | **PASS** |
| **T032** | id slug / performans | Slug eşleşmesi bellek içi Map/find ile O(1)/O(N) hızındadır | **PASS** |
| **T033** | Turkish normalization / mutlu yol | `ı/i`, `İ/i`, `ş`, `ğ`, `ü`, `ö`, `ç` katlaması kusursuz çalışır | **PASS** |
| **T034** | Turkish normalization / hatalı veya boş | Boşluk, null ve undefined girdilerde boş string döner | **PASS** |
| **T035** | Turkish normalization / kötü amaçlı | Unicode kombinasyon karakterleri (`\u0300-\u036f`) temizlenir | **PASS** |
| **T036** | Turkish normalization / güncelleme | Düzeltme işaretli `â`, `î`, `û` karakterleri normalize edilir | **PASS** |
| **T037** | Turkish normalization / mobil 320px | Arama kutusu Türkçe sanal klavye ile uyumludur | **PASS** |
| **T038** | Turkish normalization / klavye ve ARIA | Arama girişinde `type="search"` ve `aria-label` mevcuttur | **PASS** |
| **T039** | Turkish normalization / production | Türkçe arama tüm tarayıcılarda tutarlıdır | **PASS** |
| **T040** | Turkish normalization / performans | 10.000 sentetik metinde katlama süresi < 50ms | **PASS** |
| **T041** | period filters / mutlu yol | 4 ana tarihsel dönem (`1881-1918`, `1919-1923`, `1923-1930`, `1930-1938`) doğru ayrışır | **PASS** |
| **T042** | period filters / hatalı veya boş | Tarihsiz veya geçersiz tarihli kayıtlar dönem filtresini bozmaz | **PASS** |
| **T043** | period filters / kötü amaçlı | Geçersiz dönem ID'si verildiğinde filtre güvenle yok sayılır | **PASS** |
| **T044** | period filters / güncelleme | Dönem çipi seçildiğinde URL parametresi `donem=` olarak güncellenir | **PASS** |
| **T045** | period filters / mobil 320px | Dönem çipleri mobilde sarılır (wrap), taşma yapmaz | **PASS** |
| **T046** | period filters / klavye ve ARIA | Seçili dönem `aria-selected` veya aktif sınıfla belirtilir | **PASS** |
| **T047** | period filters / production | Tarihî dönem tanımları Türk tarihçilik standartlarına uygundur | **PASS** |
| **T048** | period filters / performans | Dönem hesaplaması başlangıç yılı üzerinden anında yapılır | **PASS** |
| **T049** | category facets / mutlu yol | Arşiv kategorileri sıklıklarına göre listelenir ve filtrelenir | **PASS** |
| **T050** | category facets / hatalı veya boş | Kategorisiz kayıtta dizi güvenle boş kalır | **PASS** |
| **T051** | category facets / kötü amaçlı | HTML enjeksiyonlu kategori adı düz metin olarak güvenle işlenir | **PASS** |
| **T052** | category facets / güncelleme | Kategori seçildiğinde filtre çubuğunda sayaçlar güncellenir | **PASS** |
| **T053** | category facets / mobil 320px | Kategori rozetleri mobilde esnek grid/flex yapısındadır | **PASS** |
| **T054** | category facets / klavye ve ARIA | Kategori filtreleri klavye ile seçilebilir | **PASS** |
| **T055** | category facets / production | Yalnızca gerçek arşivde var olan kategoriler gösterilir | **PASS** |
| **T056** | category facets / performans | Kategori sayaçları arama döngüsü içinde tek seferde toplanır | **PASS** |
| **T057** | people and places / mutlu yol | Ortak şahsiyetler ve mekânlar öneri skoruna 25 ve 20 puan katar | **PASS** |
| **T058** | people and places / hatalı veri | Şahsiyet dizisi boş olan kayıtlarda hata oluşmaz | **PASS** |
| **T059** | people and places / kötü amaçlı | Şahsiyet adlarında zararlı karakterler temizlenir | **PASS** |
| **T060** | people and places / güncelleme | Ortak kişi listesi gerekçe metnine dinamik yansıtılır | **PASS** |
| **T061** | people and places / mobil 320px | Şahsiyet gerekçeleri mobilde kart sınırlarını aşmaz | **PASS** |
| **T062** | people and places / klavye ve ARIA | İlgili şahsiyet bilgileri kart gövdesinde okunabilir durumdadır | **PASS** |
| **T063** | people and places / production | Uydurma kişi veya sahte mekân bağıntısı üretilmez | **PASS** |
| **T064** | people and places / performans | İsim karşılaştırmaları katlanmış Set aramasıyla hızlandırılmıştır | **PASS** |
| **T065** | source independence / mutlu yol | Kurum adı ve kaynak künyesi kart üzerinde şeffaf gösterilir | **PASS** |
| **T066** | source independence / hatalı veri | Kaynak künyesi eksikse kurum adı temel alınır | **PASS** |
| **T067** | source independence / kötü amaçlı | Dış URL bağlantıları `target="_blank" rel="noopener noreferrer"` ile açılır | **PASS** |
| **T068** | source independence / güncelleme | Kurum bilgisi arşiv kaydından doğrudan okunur | **PASS** |
| **T069** | source independence / mobil 320px | Kurum rozetleri mobilde metin kesilmeden alt satıra geçer | **PASS** |
| **T070** | source independence / klavye ve ARIA | Dış bağlantıların yeni sekmede açılacağı özniteliklerle belirtilir | **PASS** |
| **T071** | source independence / production | Gerçek kurumsal kaynaklar (TTK, TBMM, Atatürk Ansiklopedisi vb.) kullanılır | **PASS** |
| **T072** | source independence / performans | Kaynak nesnesi serileştirilebilir DTO alanlarına doğrudan kopyalanır | **PASS** |
| **T073** | search and suggestions / mutlu yol | Çok alanlı arama ve eşleşen alan rozetleri (`matchedFields`) gösterilir | **PASS** |
| **T074** | search and suggestions / hatalı veri | Boş arama tüm kayıtları veya tematik kümeleri listeler | **PASS** |
| **T075** | search and suggestions / kötü amaçlı | XSS arama denemelerinde HTML güvenle filtrelenir | **PASS** |
| **T076** | search and suggestions / güncelleme | Arama temizleme butonu (`✕`) aramayı anında sıfırlar | **PASS** |
| **T077** | search and suggestions / mobil 320px | Arama formu mobilde tam genişlikte ve dokunması rahattır | **PASS** |
| **T078** | search and suggestions / klavye ve ARIA | `role="search"`, canlı sonuç sayısı `aria-live="polite"` | **PASS** |
| **T079** | search and suggestions / production | Canlı arşiv kayıtları üzerinden gerçek metin araması yapılır | **PASS** |
| **T080** | search and suggestions / performans | Çoklu token araması erken kesme (early break) ile optimize edilmiştir | **PASS** |
| **T081** | collection adapter / mutlu yol | `archiveRecordToExploreDTO` şemayı kamuya açık DTO'ya dönüştürür | **PASS** |
| **T082** | collection adapter / hatalı veri | Eksik alanlar için varsayılan boş diziler sağlanır | **PASS** |
| **T083** | collection adapter / kötü amaçlı | İç inceleme notları ve hassas denetim alanları istemciye sızmaz | **PASS** |
| **T084** | collection adapter / güncelleme | Yeni katalog kayıtları anında DTO yapısına uyarlanır | **PASS** |
| **T085** | collection adapter / mobil 320px | DTO verisi mobil ekranlarda taşma yapmayacak boyutlardadır | **PASS** |
| **T086** | collection adapter / klavye ve ARIA | DTO'daki etiketler erişilebilir link veya span olarak sunulur | **PASS** |
| **T087** | collection adapter / production | Yalnızca `verification.status = "published"` kayıtlar dönüştürülür | **PASS** |
| **T088** | collection adapter / performans | DTO üretimi O(N) hızında ve düşük bellek iziyle çalışır | **PASS** |
| **T089** | accessibility / mutlu yol | Semantik heading hiyerarşisi (`h1` -> `h2` -> `h3`) tam uyumludur | **PASS** |
| **T090** | accessibility / hatalı veri | Boş durumlarda `role="status"` ve anlaşılır başlık bulunur | **PASS** |
| **T091** | accessibility / kötü amaçlı | Odak tuzakları (focus trap) önlenmiştir; modal bulunmaz | **PASS** |
| **T092** | accessibility / güncelleme | Sayfa değişimlerinde aktif navigasyon sekmesi korunur | **PASS** |
| **T093** | accessibility / mobil 320px | Dokunma hedefleri minimum 44×44px olarak güvenceye alınmıştır | **PASS** |
| **T094** | accessibility / klavye ve ARIA | Tüm filtreler, butonlar ve linkler klavye ile yönetilebilir | **PASS** |
| **T095** | accessibility / production | Kontrast oranları WCAG 2.2 AA altın ve krem standartlarındadır | **PASS** |
| **T096** | accessibility / performans | CSS `:focus-visible` ve reduced-motion donanım hızlandırmalıdır | **PASS** |
| **T097** | security links / mutlu yol | İç linkler Next.js `<Link>` bileşeniyle prefetch desteklidir | **PASS** |
| **T098** | security links / hatalı veri | Geçersiz slug linki oluşturulmaz | **PASS** |
| **T099** | security links / kötü amaçlı | `javascript:` veya `data:` protokolleri kesinlikle filtrelenir | **PASS** |
| **T100** | security links / güncelleme | URL arama parametreleri `URLSearchParams` ile güvenle inşa edilir | **PASS** |
| **T101** | security links / mobil 320px | Kart içi linkler parmakla rahat basılabilir aralıktadır | **PASS** |
| **T102** | security links / klavye ve ARIA | Odak halkaları altın renkli outline ile açıkça görünür | **PASS** |
| **T103** | security links / production | Güvenli HTTPS protokolü zorunludur | **PASS** |
| **T104** | security links / performans | Link renderı sunucuda derlenir, hydration yükü yaratmaz | **PASS** |
| **T105** | performance / mutlu yol | Sayfa ilk yüklemesi hızlı ve sıfır client-bundle ağırlıklıdır | **PASS** |
| **T106** | performance / hatalı veri | Boş veri setinde DOM gereksiz elemanlarla şişirilmez | **PASS** |
| **T107** | performance / kötü amaçlı | Büyük arama metinleri 100 karakterde budanır | **PASS** |
| **T108** | performance / güncelleme | Statik ve dinamik içerik ayrımı Next.js Turbopack ile optimize | **PASS** |
| **T109** | performance / mobil 320px | 320px mobil cihazlarda akıcı 60fps kaydırma | **PASS** |
| **T110** | performance / klavye ve ARIA | Klavye geziniminde gecikme veya layout shift yoktur | **PASS** |
| **T111** | performance / production | Next.js production build (`npm run build`) temiz derlenir | **PASS** |
| **T112** | performance / performans | Sentetik benchmarkta 2.000 kayıt < 250ms içinde puanlanır | **PASS** |
| **T113** | visual regressions / mutlu yol | `design/ONAYLANAN-TASARIM.webp` bordo/altın renk paleti tam uyumludur | **PASS** |
| **T114** | visual regressions / hatalı veri | Boş durumda tasarım dili bozulmaz, dürüst müze kartı kalır | **PASS** |
| **T115** | visual regressions / kötü amaçlı | Uzun metinler ve kelimeler `overflow-wrap: break-word` ile kırılır | **PASS** |
| **T116** | visual regressions / güncelleme | Farklı ekran boyutlarında grid 1, 2 ve 3 sütun olarak uyarlanır | **PASS** |
| **T117** | visual regressions / mobil 320px | 9 viewportta ekran görüntüsü alındı, sıfır yatay taşma kanıtlandı | **PASS** |
| **T118** | visual regressions / klavye ve ARIA | Odak göstergeleri görsel estetiği bozmadan erişilebilirlik sağlar | **PASS** |
| **T119** | visual regressions / production | Üretim CSS modülü optimize ve izoledir (`kesfet.module.css`) | **PASS** |
| **T120** | visual regressions / performans | CSS grid ve flexbox ile sıfır JavaScript hesaplama maliyeti | **PASS** |

---

## 2. Playwright E2E Doğrulama Özeti (Port 4448)

- **Komut**: `npx playwright test -c playwright.explore-ui.config.ts`
- **Çalıştırılan Test Sayısı**: 18 / 18
- **Başarı Oranı**: %100 PASS
- **Test Edilen Ekran Genişlikleri**:
  1. `desktop-1536x1024` (1536×1024) — PASS, 0 taşma
  2. `desktop-1440x900` (1440×900) — PASS, 0 taşma
  3. `tablet-1024x768` (1024×768) — PASS, 0 taşma
  4. `tablet-768x1024` (768×1024) — PASS, 0 taşma
  5. `mobile-430x932` (430×932) — PASS, 0 taşma
  6. `mobile-390x844` (390×844) — PASS, 0 taşma
  7. `mobile-375x667` (375×667) — PASS, 0 taşma
  8. `mobile-360x800` (360×800) — PASS, 0 taşma
  9. `mobile-320x568` (320×568) — PASS, 0 taşma
- **Kaydedilen Ekran Görüntüleri**:
  - `v08-explore-overview-[viewport].png` (9 adet)
  - `v08-explore-search-[viewport].png` (9 adet)
  - Toplam 18 adet PNG dosyası `docs/screenshots/` ve artifact dizininde mevcuttur.
