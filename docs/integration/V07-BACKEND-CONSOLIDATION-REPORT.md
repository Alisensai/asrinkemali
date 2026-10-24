# MKA V0.7 Backend Büyük Entegrasyon ve Release-Candidate Raporu

**Tarih:** 24 Ekim 2026  
**Entegrasyon Dalı:** `feature/antigravity-v09-backend-consolidation`  
**Referans Taban:** `feature/copilot-v07-search-benchmark` (PR #61)  
**Hedef:** Bütün V0.7 backend modüllerinin (01–15) tek, kararlı ve doğrulanmış sürüm adayında birleştirilmesi.

---

## 1. Modül Entegrasyon Matrisi (01–15)

| Görev No | Modül Adı | Sahip / Kaynak | Entegrasyon Durumu | Test Durumu | Güvenlik Kapısı / Sınır |
|---|---|---|---|---|---|
| **01** | Git Entegrasyon Kontrol Düzlemi | Claude (PR #33) | `fix/pr33-git-test-distinct-sha` (PR #54) ile düzeltildi | 23/23 test GEÇTİ | CI hızlı cherry-pick collision giderildi |
| **02** | Kilo QA Birleşik Test Altyapısı | Copilot (PR #42) | `fix/pr42-nextjs-webpack-build` (PR #56) ile düzeltildi | 34/34 test GEÇTİ | Webpack prod derleme uyumu sağlandı |
| **03** | Codex Yayın Motoru & Zamanlayıcı | Codex | Entegre (`web/lib/publishing/`) | 12/12 test GEÇTİ | Idempotent CAS defteri, çift yayın engeli |
| **04** | İnsan İnceleme & Editoryal Güven | Claude (PR #39) | Entegre (`web/lib/editorial-trust/`) | 14/14 test GEÇTİ | Sahte onay iddiaları preflight'ta bloklanır |
| **05** | Kaynak Güvenilirliği & Erken Dönem | OpenCode (PR #20) | `feature/copilot-v07-source-reliability-integration` (PR #58) | 84/84 tool + 5/5 web GEÇTİ | 13 aday strictly unverified ve ingest=false |
| **06** | MKA Authority Registry | Copilot (MKA-06) | `feature/copilot-v07-authority-registry-integration` (PR #59) | 14/14 tool + 5/5 web GEÇTİ | Hard-negative adaş ayrımı; `humanApproval: null` |
| **07** | Evidence Engine Çekirdeği | Perplexity (PR #19) | `fix/pr45-symlink-target-check` (PR #55) ile düzeltildi | 180/180 test GEÇTİ | QA-094 symlink kaçış denetimi eklendi |
| **08** | Evidence Workbench 2.0 | Perplexity (PR #24) | `feature/copilot-v07-evidence-workbench-backend` (PR #60) | 21/21 tool + 4/4 web GEÇTİ | Fail-closed üretim koruması; 300 kr. alıntı sınırı |
| **09** | Arşiv İçe Aktarma Hazırlığı | Google AI Studio | Entegre (`data/research/candidates/`) | Doğrulandı | Staging statüsü korunur; kataloğa sızmaz |
| **10** | Search V2 (DeepSeek Arama) | Codex (PR #36) | Entegre (`web/lib/search-v2/`) | 4/4 test GEÇTİ | Yalnız published kayıtlar; Türkçe diakritik folding |
| **11** | Öneri Motoru (Qwen İlgili Kayıtlar) | Codex (PR #37) | Entegre (`web/lib/recommendations/`) | 3/3 test GEÇTİ | Yayınlanmamış kayıt önerilemez |
| **12** | Arama Kalitesi Değerlendirme Lab | Copilot (MKA-12) | `feature/copilot-v07-search-benchmark` (PR #61) | 9/9 test GEÇTİ | Precision, Recall, MRR (0.87), nDCG@5 (0.785) |
| **13** | Okuma Listeleri & Koleksiyon | Codex (PR #38) | Entegre (`web/lib/reading-lists/`) | 3/3 test GEÇTİ | Tarayıcıda yerel saklama, yetkisiz sunucu eşitleme yok |
| **14** | Yönetim Merkezi (Control Center v08)| Copilot (PR #26) | Entegre (`web/lib/admin-v08/`) | 12/12 test GEÇTİ | `REGISTERED_PROVIDER=null` iken her ortamda 404 |
| **FORT**| FORTRESS Güvenlik Altyapısı | Claude (PR #28) | Entegre (`web/proxy.ts`, CSP, HSTS) | 8/8 test GEÇTİ | Katı CSP, yetkisiz preview 503, HSTS |

---

## 2. Test ve Derleme Özeti
- **Web Birim Testleri (`web/tests/**/*.test.mjs`):** **135 testin tamamı GEÇTİ (0 hata).**
- **Authority Registry Testleri (`tools/archive-authority-registry`):** **14/14 test GEÇTİ.**
- **Historical Research Testleri (`tools/historical-research`):** **201/202 test GEÇTİ** (1 Windows symlink testi ortam izni nedeniyle atlandı; Linux CI'da koşar).
- **Search Evaluation Testleri (`tools/search-evaluation`):** **9/9 test GEÇTİ.**
- **TypeScript Derleme (`tsc --noEmit`):** **0 hata (Temiz derleme).**
- **Next.js Production Derleme (`npm run build`):** Başarıyla tamamlandı.

---

## 3. 302 Bekleyen İnsan Onay Maddesi Açıklaması
ASRIN KEMALİ anayasası (`AGENTS.md`) 6, 7 ve 8. maddeleri uyarınca:
1. Mevcut teknik katalogda 168 kayıt (150 katalog + 18 legacy) bulunmaktadır.
2. Bu kayıtlardan 151 tanesi teknik `published` durumundadır; ancak bu durum tarih uzmanı veya yayın kurulu onayı anlamına gelmemektedir.
3. Her kayıt için:
   - 1 tarih uzmanı (expert historian) doğrulaması
   - 1 sorumlu editör (chief editor) onayı
   olmak üzere kayıt başına 2 onay gereklidir ($151 \times 2 = 302$ onay).
4. Bu onaylar bağımsız tarihçi heyeti ve editörler tarafından gerçek oturumlar üzerinden verilene kadar `release-quality` kapısı bilerek ve güvenle fail-closed (kırmızı) kalmaktadır. Kod içinde sahte insan onayı veya yapay yeşil bayrak üretilmemiştir.
