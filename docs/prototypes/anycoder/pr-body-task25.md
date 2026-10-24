## 🎯 Görev 25: AnyCoder Dijital Sergi Prototipi — Kaynak Denetimi, Karşılaştırma ve Seçici Aktarım

Bu PR, Görev 25 (MKA-ANTIGRAVITY-25) gereksinimleri uyarınca AnyCoder sergi prototipinin kaynak kodunun mevcudiyetini denetler, bulunamadığını (`SOURCE_MISSING`) nesnel olarak raporlar, MKA anayasası (`AGENTS.md`) uyarınca sahte kod oluşturmadan PR #27 sergi altyapısıyla karşılaştırma matrisini ve güvenlik karar motorunu hayata geçirir.

### 📋 Yapılan Başlıca İşler ve Değişiklikler

1. **AnyCoder Kaynak Kodu Denetimi (`docs/prototypes/anycoder/ANYCODER-AUDIT-REPORT.md`):**
   - Yerel dosya sistemi (`C:\Users\Ali\Downloads\`), Git geçmişi (`git log --all --grep="anycoder"`), GitHub PR kayıtları (`gh pr list --state all --search "anycoder"`) ve MKA arşiv paketleri ayrıntılı olarak taranmıştır.
   - AnyCoder kaynak dosyası veya prototip arşivi tespit edilememiştir; durum kanonik olarak **`SOURCE_MISSING`** şeklinde belgelenmiştir.
   - Sıfır sahte kod ilkesi korunmuş, uydurma kaynak kodu eklenmemiştir.

2. **Seçici Aktarım Karar Manifesti (`docs/prototypes/anycoder/DECISION-MANIFEST.json`):**
   - 8 temel sergi yeteneği `ACCEPT`, `ADAPT`, `QUARANTINE`, `REJECT`, `SOURCE_MISSING`, `DUPLICATE` ve `DEFERRED` sınıflarına ayrılmıştır.
   - Haricî Three.js/CDN scriptleri CSP ihlali ve veri sızıntısı sebebiyle **`REJECT`** edilmiştir.
   - PR #27 içerisinde yerel CSS 3D Transforms ile hayata geçirilen 3D Galeri ve Belge Vitrini **`DUPLICATE`** olarak işaretlenmiştir.
   - İnsan onayı taşımayan sahte onay rozetleri ve staging sızıntısı **`REJECT`** edilmiş ve iyileştirilmesi **Task 26'ya devredilmiştir**.

3. **Müze Karşılaştırma ve Uyum Matrisi (`docs/prototypes/anycoder/COMPARISON-MATRIX.md` & `ACCEPTED-COMPONENTS.md`):**
   - PR #27 müze mimarisi ile varsayılan prototip desenleri karşılaştırılmış; klavye erişilebilirliği, ekran okuyucu uyumu, 320px–1536px sıfır yatay taşma güvencesi incelenmiştir.
   - Prompt 26 (MKA-ANTIGRAVITY-26) için sergi sertleştirme devir notları hazırlanmıştır.

4. **Deneysel Denetim Bileşeni ve Rotası:**
   - **`web/components/exhibitions/experiment/`:** AnyCoder denetim kararlarını, güvenlik kurallarını ve filtreleme yeteneklerini sunan erişilebilir React bileşeni (`AnyCoderAuditView.tsx`) ve CSS modülü (`anycoder-experiment.module.css`).
   - **`web/app/deneysel/anycoder-audit/page.tsx`:** İzole test rotası, SEO için `noindex, nofollow` korumalı.
   - **`web/lib/exhibitions/prototype-security.ts`:** Zip-slip yol aşımı (`../`), mutlak sürücü yolları (`C:\`), UNC ağ yolları (`\\`), zip bombası sınırları (50MB / 500 dosya), güvenli protokol (`javascript:`, `data:` reddi) ve CSV formül enjeksiyonu korumaları.

---

### 🧪 Test ve Doğrulama Sonuçları

- **Birim Testleri (`web/tests/anycoder-prototype.test.mjs`):**
  - **70 / 70 test başarılı** (T-25-001 - T-25-106 kapsamı).
  - Zip-slip, zip bomb, protocol whitelist, CSV sanitization, manifest şeması ve rollback referansı doğrulandı.
  - Proje geneli birim testleri: **384 passed, 0 failed**.
- **Uçtan Uca Playwright Testleri (`web/e2e/anycoder-prototype.spec.ts` - Port 4440):**
  - **18 / 18 test başarılı** (9 viewport: 320px, 360px, 375px, 390px, 430px, 768px, 1024px, 1440px, 1536px).
  - `scrollWidth <= innerWidth + 1` ile sıfır yatay taşma kanıtlandı.
  - 9 adet ekran görüntüsü üretildi (`docs/screenshots/v08-anycoder-*`).
- **Kod Kalitesi ve Derleme:**
  - `npm run typecheck`: 0 hata.
  - `npm run lint`: 0 hata, 0 uyarı.
  - `npm run build`: 169 sayfa derlendi (`○ /deneysel/anycoder-audit` dahil).
  - `node scripts/archive/validate.mjs`: 168 kayıt, 151 yayımlanmış, 0 hata.
  - `node --test scripts/archive/tests/*.test.mjs`: 74 / 74 başarılı.
