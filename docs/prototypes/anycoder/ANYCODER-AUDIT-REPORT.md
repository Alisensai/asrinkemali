# ANYCODER DİJİTAL SERGİ PROTOTİPİ — KAYNAK DENETİMİ VE GÜVENLİK RAPORU

**Ajan:** ANTIGRAVITY  
**Tarih:** 24 Ekim 2026  
**Görev Kodu:** MKA-ANTIGRAVITY-25 (Görev 25 / 30)  
**Çalışma Dalı:** `feature/antigravity-v08-anycoder-exhibit-audit`  
**Taban Dalı:** `feature/antigravity-v08-personal-collection` (PR #47, commit `08e870b`)  
**Durum:** `SOURCE_MISSING` (Kaynak Yokluğu Tespit Edildi — Sıfır Sahte Kod İlkesi)  

---

## 1. YÜRÜTME ÖZETİ VE KAYNAK TARAMA BULGULARI

Görev 25 talimatının 14. Bölümü ("ANYCODER GİRDİSİ İÇİN DÜRÜST BULUNABİLİRLİK RAPORU") uyarınca, AnyCoder sergi prototipinin varlığı tüm olası veri kaynaklarında titizlikle araştırılmıştır:

1. **Yerel Dosya Sistemi ve İndirilenler Klasörü:**
   - `C:\Users\Ali\Downloads\` dizininde "anycoder" deseni arandı: **Sonuç: 0 dosya**.
   - Mevcut MKA paketleri (`MKA_30_PROMPT_TUM_KAYNAKLAR_ZIP.zip`, `MKA_PROMPT_25_26_27_ANTIGRAVITY_PAKETI.zip`, `MKA_4_AJAN_30_GOREV_TUM_PAKET.zip`) incelendi: Bu arşivlerde yalnızca prompt metinleri (`MKA_PROMPT_25_ANTIGRAVITY_ANYCODER_SERGI_PROTOTIPI_INCELEME.txt`) bulunmakta olup AnyCoder kaynak kodu veya prototip ZIP'i yer almamaktadır.
2. **Git Depo Geçmişi:**
   - `git log --all --grep="anycoder" -i`: **0 commit**.
   - Tüm yerel ve uzak dallar tarandı; AnyCoder referanslı hiçbir dal veya commit bulunamadı.
3. **GitHub Pull Request Geçmişi:**
   - `gh pr list --state all --search "anycoder"`: **0 PR**.
   - PR #1 - #47 arası tüm açık ve kapalı PR'lar tarandı; AnyCoder'a ait bir çalışma tespit edilmedi.

**Sonuç:** AnyCoder orijinal teslimi bulunamamıştır ve durum kanonik olarak **`SOURCE_MISSING`** olarak tescil edilmiştir. MKA anayasası (`AGENTS.md`) kural 7 ("Tarihî alıntı, takvim, haberler ve kurumsal unvanlar uydurulmaz") ve Görev 25 talimatı kural 14 [02] ("Dosya yoksa değerlendirme sonucunu SOURCE_MISSING diye işaretle; demo üretip bunu AnyCoder kaynak kodu diye etiketleme") gereğince, **asla sahte AnyCoder kodu uydurulmamış**, sıfır kod aktarımı yapılmıştır.

---

## 2. STATİK ANALİZ VE PROTOTİP GÜVENLİK RİSK DEĞERLENDİRMESİ

Eğer dış kaynaktan üçüncü taraf bir sergi prototipi sunulursa uygulanacak zorunlu güvenlik ve doğrulama sınırları aşağıda belirlenmiştir:

### A. Arşiv ve Paket Güvenliği (Archive Ingestion Security)
1. **Zip-Slip ve Yol Aşımı (Path Traversal):**
   - ZIP üyelerinde `../`, `..\\`, kök dizin `/`, mutlak Windows sürücü yolları (`C:\`) veya UNC yolları (`\\server\share`) bulunması durumunda arşiv **derhal reddedilir (fail-closed)**.
2. **Sembolik Bağlantı Kaçışı (Symlink Escape):**
   - ZIP veya arşiv içeriğindeki sembolik bağlantılar hedef dışına veya repo kökü dışına işaret edemez.
3. **Zip Bombası Koruması:**
   - Toplam açılmış boyut sınırı: Maksimum **50 MB**.
   - Toplam dosya sayısı sınırı: Maksimum **500 dosya**.
   - Sıkıştırma oranı anomalisi (>100:1) tespit edildiğinde işlem engellenir.
4. **Bozuk CRC ve Sağlama Hataları:**
   - Hash veya CRC32 uyuşmazlığı olan girdiler karantinaya alınır (`QUARANTINE`).
5. **Node.js Yaşam Döngüsü Kötüye Kullanımı:**
   - `package.json` içindeki `preinstall`, `install`, `postinstall` betikleri üçüncü taraf prototipler için asla otomatik çalıştırılamaz.

### B. Kod Çalıştırma ve Web Güvenliği
1. **XSS ve DOM Manipülasyonu:**
   - `dangerouslySetInnerHTML`, `eval()`, `new Function()`, `setTimeout(string)` kullanımları yasaktır (`REJECT`).
2. **Protokol Güvenliği:**
   - `javascript:`, `data:`, `vbscript:`, `file:` URL şemaları kesinlikle engellenir; yalnızca `http:` ve `https:` (tercihen TLS) izinlidir.
3. **Pencere İletişimi (Cross-Origin Messaging):**
   - `postMessage` çağrılarında hedef origin denetimi (`event.origin === window.location.origin`) zorunludur; `*` joker karakteri yasaktır.
4. **CSP ve Haricî CDN İzolasyonu:**
   - Haricî CDN üzerinden Three.js, Babylon.js veya Font scriptleri çekmek CSP politikası gereği yasaktır. Tüm bağımlılıklar yerel ve NPM doğrulamalı olmalıdır.
5. **Iframe İzolasyonu:**
   - Eğer haricî iframe gerekirse, azami kısıtlayıcı sandbox (`sandbox="allow-scripts"` — `allow-same-origin` ve `allow-top-navigation` olmaksızın) uygulanır.

### C. Tarihsel Dürüstlük ve Müşterek Arşiv Etiği
1. **Telif ve Görsel İzinleri:**
   - Telif durumu `unknown` olan veya `displayPolicy=source_link_only` olan görseller doğrudan embed edilemez; yalnızca kurum bağlantısı gösterilir.
2. **Yapay Zekâ Temsili Görseller:**
   - Tarihsel belge olmayan yapay zekâ üretimleri açıkça *"Yapay zekâ ile oluşturulmuş temsili görsel"* olarak etiketlenmelidir.
3. **Sahte Onay Rozetleri Engeli:**
   - İnsan uzman onayı bulunmayan belgelerde "BİRİNCİL TARİHÎ KAYNAK", "DOĞRULANMIŞ KAYNAK" gibi kesinlik ifade eden yanıltıcı rozetler kullanılamaz. 302 adet insan uzman onayı eksikliği hiçbir prototipte otomatik onaylanmış gibi gösterilemez.

---

## 3. SEÇİCİ AKTARIM KARAR MOTORU (SELECTION DECISION RULES)

| Kategori | Koşul | Uygulanan Eylem |
|---|---|---|
| **ACCEPT** | Gerçek dosya var, SHA-256 doğrulanmış, lisans uygun, test kanıtı mevcut | İlgili bileşen sisteme dahil edilir |
| **ADAPT** | Kod faydalı ancak güvenlik veya şema sapması var | Güvenlik yaması ve tip adaptörü ile sisteme alınır |
| **QUARANTINE** | Bozuk UTF-8, şüpheli bağımlılık veya başarısız sağlama | Build sürecinin dışında, izole alanda tutulur |
| **REJECT** | XSS açığı, lisanssız görsel, haricî CDN veya sahte rozet | Kesinlikle reddedilir |
| **SOURCE_MISSING** | Kaynak dosya/arşiv konuşma ve ortamda bulunamadı | Sıfır kod transferi yapılır, durum belgelenir |
| **DUPLICATE** | Mevcut PR #27 sisteminde zaten yerel olarak var olan özellik | Yeniden kodlanmaz, PR #27 referans alınır |
| **DEFERRED** | Geliştirme kapsamı Prompt 26 veya sonraki adımlara ait | İlgili ajana devredilir |

---

## 4. GERİ ALMA (ROLLBACK) VE GÜVENLİK GÜVENCESİ

- Geri alma prosedürü: `git revert <commit-hash>`.
- Hiçbir prod sergi rotası (`/sergiler`) veya arşiv deposu bozulmamıştır; mevcut arşiv sözleşmesi (`schemas/archive-record.schema.json`) korunmuştur.
- Tüm testler izole birim testleri (`web/tests/anycoder-prototype.test.mjs`) ve deneysel arayüz denetimleri (`web/e2e/anycoder-prototype.spec.ts`) üzerinden yürütülür.
