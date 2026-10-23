# MKA Evidence Workbench 2.0 — Teslim Raporu

**Dal:** `feature/perplexity-v07-evidence-workbench` (temel: `feature/perplexity-v07-evidence-engine` @ `e7ed5f1`)
**Tarih:** 2026-10-23
**Hedef PR:** `feature/perplexity-v07-evidence-engine` (PR #19'un üzerine bağımlı taslak)

## 1. Yeni Geliştirilen Modüller (`tools/historical-research/evidence/`)

| Modül | İşlev |
|---|---|
| `contracts.d.ts` | Tüm veri sözleşmeleri (ClaimRecord, EvidenceRecord, graf, adaptörler) — `tsc --noEmit` ile denetlenir |
| `claims.mjs` | İddia sürümleme; metin değişince eski kanıt otomatik geçerli sayılmaz (stale) |
| `evidence.mjs` | Kanıt konumu (locator), başlık/künye incelemesiyle destek kararı verilemez, alıntı ≤300 karakter, mock insan onayı reddi |
| `workflow.mjs` | Uçtan uca iş akışı: bindEvidence, assessClaim (yalnız güncel sürüm + doğrudan pasaj + bağımsız kanıt sayar) |
| `independence.mjs` | Kaynak bağımsızlığı: aynı kurum/kopya yayın/türetilmiş kaynak bağımsız SAYILMAZ; belirsizlik açıkça gösterilir |
| `contradictions.mjs` | Tarih çelişkisi adayları (yalnız inceleme adayı; otomatik "kesin çelişki" reddi) |
| `bibliography.mjs` | Chicago/APA/BibTeX/CSL-JSON/Markdown; eksik alan uydurulmaz ve `[eksik: ...]` görünür; CSV formül enjeksiyonu koruması |
| `notebook.mjs` | Araştırma notları; yorum ile kaynak alıntısı ayrımı; JSON/MD dışa aktarım |
| `graph.mjs` | İddia-kanıt grafiği; `mentions` `supports`'a dönmez; eski sürüm kenarları `needs_review` |
| `coverage.mjs` | Kapsam analizi; mekân kuruluşu biyografik SAYILMAZ |
| `quality.mjs` | 9 boyutlu aday denetimi; telif izni asla otomatik doğrulanmaz |
| `adapters.mjs` | Authority Registry (kimlik uydurulmaz), ResearchReviewService (gerçek kimlik yoksa karar üretilemez), SearchAdapter |
| `staging.mjs` | Staging-dışı yazma reddi (mutlak yol + `..`), bozuk UTF-8 reddi, 5 MB sınır |

**Staging verisi** (`data/research/evidence-staging/`, gerçek arşive otomatik aktarılmaz):
`claims-v2.json` (10 iddia; 2'si revizyonla düzeltildi), `evidence.json` (14 kanıt), `candidate-audits.json` (32 denetim), `notes.json` (4 not), `contradictions.json` (2 gerçek aday).

## 2. İlk 10 İddianın Kanıt İnceleme Sonuçları

Her iddia için özgün kaynak yeniden okundu, destekleyici kısa alıntılar kaydedildi (telif güvenli ≤300 karakter). **Hiçbir iddia onaylanmadı** — tümü `awaiting_human_review`.

| İddia | Kanıt durumu | Not |
|---|---|---|
| claim-001 doğum/ölüm | Pasaj destekliyor (doğum); ölüm ayrı pasaj | Doğum günü belirsizliği kaynakça kayıtlı |
| claim-002 öğrenim 1887–1905 | Pasaj destekliyor | **v1'deki "1887–2005" yazım hatası SÜRÜMLEME ile düzeltildi (v2)** |
| claim-003 Trablusgarp/Derne | Pasaj destekliyor (5 Mart 1912 atama) | — |
| claim-004 Balkan görev süresi | Pasaj birebir destekliyor (1 Ara 1912 – 10 Ağu 1913) | — |
| claim-005 Sofya Ataşemiliterliği | Pasaj destekliyor; **atama/icra ayrımı** | Çelişki adayı: atama 27 Ekim 1913 / icra 20 Kasım 1913 – 25 Ocak 1915 |
| claim-006 Çanakkale | Pasaj destekliyor | **v1'deki tahmini "1914–1916" kesin tarihlerle değiştirildi (v2): 20 Ocak 1915 – 10 Aralık 1915** |
| claim-007 ATAM 16'ncı Kolordu | Kitap tanıtım/giriş pasajı destekliyor | Başlık (1915-1917) ile komuta aralığı (19 Ağu 1915 – 18 Ara 1916) farkı not edildi |
| claim-008 Karlsbad günlüğü | İki pasaj kayıtlı | **GERÇEK ÇELİŞKİ ADAYI: bitiş tarihi 28 Temmuz (detay/105) vs 27 Temmuz (detay/4078)** |
| claim-009 Mondros | Pasaj destekliyor (30 Ekim 1918) | — |
| claim-010 Sina-Filistin 1917–1919 | Pasaj destekliyor (13 Kasım 1918 – 16 Mayıs 1919 İstanbul dönemi) | Kapsam aralığı maddenin bölüm yapısından |

## 3. 32 Adayın Güncel Durumu

- 8 eksik künyenin tamamı resmî kaynaklardan yeniden araştırıldı:
  - **Tamamlandı (6):** Şerafettin Turan (0001), Zekeriya Türkmen (0011), Nejdet Bilgi (0023), İsmet Görgülü/Liman von Sanders (0027), İsmail Özçelik/ATAM 2008 (0028, iki farklı ISBN notuyla)
  - **Dürüstçe doğrulanamadı (2):** src-2026-0026 (Kemalettin Sami — yayın tarihi sayfada yok), src-2026-0031 (Devlet Arşivleri — PDF indirilmeden künye doğrulanamaz, muhtemel eşleşme listelendi)
  - src-2026-0032: kurumsal koleksiyon (tekil künye uygulanamaz)
- Tüm 32 aday için 9 boyutlu denetim üretildi; **telif izni hiçbir aday için doğrulanmadı** (0 puan), **0 aday içe aktarıma hazır**.

## 4. Kaynak Bağımsızlığı Sonuçları

- Aynı kurum (Atatürk Ansiklopedisi) kaynakları tek bağımsız grup sayılır.
- claim-008'in iki kanıtı aynı kurum → **bağımsız değil**; çelişki adayı insan incelemesi bekliyor.
- claim-002'nin tek kanıtı kurum-içi; bağımsız ikinci kaynak henüz yok.

## 5. Panel ve Testler

- Panel 10 bölüme genişletildi (A–J); production'da bayraklı bile 404 (yeniden doğrulandı).
- **122/122 otomatik test** (100 eski + 22 yeni; ölçek 500/1.000/2.000/10.000).
- Gerçek tarayıcı: 10 sekme × 7 görünüm (320/360/390/768/1024/1440/1536) — yatay taşma yok; klavye 12/12; not/karşılaştırma/dışa aktarım akışları çalışıyor.
- Ekran görüntüleri: `ekran-goruntuleri/` (mobil 390px + masaüstü 1440/1024px).
- Performans: 10.000 sentetik adayda tekrar analizi ~1 sn altı (test raporuna bakınız).

## 6. Diğer Ajanlarla Uyum

- **OpenCode Authority Registry:** `adapters.mjs` içinde tipli sözleşme; registry birleştirilmemişse `resolve()` null döner — **kimlik uydurulmaz**.
- **Copilot MKA Control Center:** `ResearchReviewService` arayüzü; gerçek kimlik sağlayıcısı yapılandırılmadan `createDecision()` hata fırlatır; mock kararlar gerçek onay SAYILMAZ.
- **Gemini/DeepSeek:** `SearchAdapter` arayüzü (bağlı değilse boş döner) + kaynaklı mekân ilişkisi dışa aktarım sözleşmesi.

## 7. Kalan Eksikler

1. claim-005/claim-008 çelişki adayları insan tarihçi incelemesi bekliyor (yazılım kararı vermez).
2. Devlet Arşivleri PDF künyesi doğrulanamadı (indirme telif/boyut nedeniyle yapılmadı).
3. 2 adayın künye alanı hâlâ boş (kaynak sayfalarında yok).
4. Staging notları kalıcı depoya yazan bir API henüz yok (taslak notlar tarayıcı durumunda).
5. İddia-kanıt grafiğinin panelde görsel gösterimi (şu an liste görünümü).
