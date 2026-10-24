# MKA Evidence Workbench 2.0 — Araştırma Laboratuvarı Güvenli Entegrasyon

**Görev No:** 28 / 30  
**Tarih:** 24 Ekim 2026  
**Dal:** `feature/antigravity-v08-perplexity-research-workbench-ui`  
**Taban Dal:** `feature/antigravity-v08-publications-today-experience` (PR #50, commit `b89d3ed`)  
**Atanan Port:** 4446  

---

## 1. Genel Bakış
MKA Evidence Workbench 2.0, Mustafa Kemal Atatürk ve Cumhuriyet tarihi üzerine iddia inceleme kuyruğu, kanıt konumları, kaynak karşılaştırma, akademik kaynakça ve veri kalitesi denetimlerini içeren dahili araştırma ortamıdır.

### Temel Güvenlik ve Mimari İlkeler:
1. **Production Fail-Closed Sınırı:**
   - Panel ve API rotaları yalnızca geliştirme/test ortamında (`NODE_ENV !== "production"`) ve açık `MKA_RESEARCH_LAB=1` ortam değişkeni ile aktiftir.
   - `NODE_ENV === "production"` durumunda bayrak set edilse bile `/arastirma-laboratuvari` ve `/api/arastirma-laboratuvari/export` 404 (Not Found) döner.
2. **Staging Veri İzolasyonu:**
   - `data/research/evidence-staging/` içerisindeki veriler (10 iddia, 32 kaynak adayı, 2 çelişki adayı, notlar ve denetimler) staging araştırma girdisidir; yayımlanmış dijital arşiv kaydı değildir.
   - `workbench.ts` yükleyicisi 5MB dosya boyutu sınırı, path traversal engeli, UTF-8 BOM temizliği ve production sızıntı korumalarıyla güçlendirilmiştir.
3. **CSV Formül Enjeksiyonu Koruması (Formula Injection Guard):**
   - Dışa aktarılan CSV verilerinde hücresi `=`, `+`, `-`, `@`, tab veya boşlukla başlayan değerler `'` ile öneklenerek elektronik tablo yazılımlarında komut çalıştırma riski önlenmiştir.
4. **Kaynak Bağımsızlığı ve Çelişki Ayrımı:**
   - Aynı kurumdan gelen iki kaynak bağımsız kanıt sayılmaz.
   - Farklı kurumlardan gelen ancak başlık benzerliği yüksek kaynaklar için kopya yayın şüphesi uyarısı verilir.
   - Doğrudan pasaj (`direct_passage`) ile başlık/meta veri incelemesi (`title_only`/`metadata_only`) ayrılmıştır.

---

## 2. A–J Bölümleri ve Bileşen Mimarisi (`web/components/research-workbench/`)
- **A · DashboardSection:** İddia sayıları, pasaj temelli kanıt istatistikleri ve inceleme kuyruğu özeti.
- **B · CandidatesSection:** 32 kaynak adayının künye, kurum, dönem, nitelik ve doğrulama durumları.
- **C · QueueSection:** İddia revizyon geçmişi (v1/v2), `supersededAt`, stale kanıtlar ve çelişki uyarıları.
- **D · EvidenceSection:** Kanıt künyeleri, doğrudan pasaj alıntıları (≤300 krk telif sınırı) ve doğrulama seviyeleri.
- **E · SourceCompare:** İki adayı yan yana karşılaştıran ve aynı kurum/kopya yayın uyarısı üreten istemci bileşeni.
- **F · BibliographySection:** Chicago, APA ve BibTeX formatlarında akademik kaynakça (eksik alanlar `[eksik: …]` ile işaretlenir).
- **G · GapSection:** 1881–1918 hedef dönemi boşluk analizi ve tema dağılımı.
- **H · NotebookPanel:** Tarayıcı durumunda (React state) tutulan, kalıcı olmayan araştırma taslak notları ve JSON dışa aktarım.
- **I · QualitySection:** 9 boyutlu veri kalitesi skorları (telif izni 0, `readyForImport: false`).
- **J · ExportSection:** `claims-v2`, `evidence`, `audits` ve formül korumalı `evidence-csv` indirme bağlantıları.

---

## 3. Responsive Tasarım ve Erişilebilirlik
- 320px–1536px aralığında yatay taşma kesinlikle sıfırdır (`scrollWidth <= innerWidth + 1`).
- Geniş veri tabloları `.tableWrap` içinde yatay kaydırılabilir olarak izole edilmiştir.
- Dokunma hedefleri minimum 44px'dir; ARIA rolleri ve semantik başlık yapısı WCAG 2.2 standartlarına uygundur.
