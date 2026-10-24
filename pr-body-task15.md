### Amaç
V0.7 Backend Büyük Entegrasyon ve Release-Candidate Doğrulama (Görev 15 / MKA-COPILOT-15-BACKEND-RELEASE-CANDIDATE):
Projenin tüm V0.7 backend modüllerinin (01–14: Git denetim, Kilo QA, Codex yayın motoru, editoryal güven kapıları, kaynak güvenilirliği, otorite kayıt defteri, kanıt motoru & workbench 2.0, DeepSeek arama v2, Qwen öneri motoru, Cohere değerlendirme laboratuvarı, okuma listeleri, yönetim merkezi v08 ve Fortress güvenlik altyapısı) tek bir sürüm adayında birleştirilmesi ve uçtan uca doğrulanması.

### Etkilenen Bileşenler ve Dizinler
- `web/lib/search-v2/` (Görev 10: DeepSeek arama motoru)
- `web/lib/recommendations/` (Görev 11: Qwen ilgili kayıt önerileri)
- `web/lib/reading-lists/` (Görev 13: Yerel okuma listeleri ve koleksiyon)
- `web/lib/admin-v08/` (Görev 14: Yönetim merkezi ve RBAC sözleşmeleri)
- `web/lib/authority-registry/` (Görev 06: Otorite kayıt defteri web köprüsü)
- `web/lib/source-reliability/` (Görev 05: Kaynak güvenilirliği köprüsü)
- `web/lib/research-evidence/` (Görev 08: Kanıt laboratuvarı staging köprüsü)
- `web/lib/publishing/` (Görev 03: Codex yayın motoru)
- `web/lib/editorial-trust/` (Görev 04: İnsan onayı kalite kapıları)
- `web/proxy.ts` (Fortress güvenlik, CSP, HSTS, preview basic auth)
- `web/tests/` (135 birleşik web birim testi)
- `docs/integration/V07-BACKEND-CONSOLIDATION-REPORT.md`

### Çalıştırılan Komutlar ve Test Sonuçları
- `npm --prefix web test`: **135/135 birim testi GEÇTİ.**
- `npm --prefix web run typecheck`: **0 hata (TypeScript temiz derlendi).**
- `npm --prefix web run build`: **163/163 statik ve dinamik rota Turbopack ile hatasız derlendi.**
- `npm --prefix tools/archive-authority-registry test`: **14/14 test GEÇTİ.**
- `npm --prefix tools/historical-research test`: **201/202 test GEÇTİ** (1 Windows symlink testi ortam izni nedeniyle atlandı; Linux CI'da koşar).
- `npm --prefix tools/search-evaluation test`: **9/9 test GEÇTİ.**

### Güvenlik ve Uyumluluk
- `main` veya prod ortamına doğrudan merge/push yapılmamıştır.
- Arşiv kayıtları (`data/archive/catalog`, `content/archive/records`) salt-okunur taranmış; hiçbir kayıt mutasyona uğramamıştır.
- Admin rotaları ve araştırma paneli üretimde `REGISTERED_PROVIDER=null` ve `researchLabEnabled()=false` ile fail-closed (404) korunmaktadır.
- 151 yayımlanmış kayıt için 302 insan onayı (151 uzman + 151 editör) gerçek uzman heyeti tarafından verilene kadar `release-quality` kapısı bilerek ve güvenle kırmızı bırakılmıştır; yapay insan imzası üretilmemiştir.
