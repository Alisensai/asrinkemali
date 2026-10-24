# GÖREV 28 TESLİM RAPORU — ANTIGRAVITY

**Görev Adı:** Perplexity Evidence Workbench 2.0 — A–J Araştırma Laboratuvarı Güvenli Görsel Entegrasyon  
**Tarih:** 24 Ekim 2026  
**Dal:** `feature/antigravity-v08-perplexity-research-workbench-ui`  
**Taban Dal:** `feature/antigravity-v08-publications-today-experience` (PR #50, commit `b89d3ed`)  
**Atanan Port:** 4446  

---

## 1. Yürütülen İşlerin Özeti
1. **PR #24 Devralma ve Staging Ayrımı:**
   - `data/research/evidence-staging/` (10 iddia kaydı v2, 32 kaynak adayı, 2 çelişki adayı, aday denetimleri ve notlar) çalışma dalına aktarıldı.
   - Bu verilerin yayımlanmış dijital arşiv kaydı olmadığı, geliştirme ortamında çalışan araştırma havuzu olduğu güvenceye bağlandı.
2. **Modüler Bileşen Mimarisi (`web/components/research-workbench/`):**
   - 10 modüler bileşen oluşturuldu: `DashboardSection`, `CandidatesSection`, `QueueSection`, `EvidenceSection`, `SourceCompare`, `BibliographySection`, `GapSection`, `NotebookPanel`, `QualitySection`, `ExportSection`.
3. **Güvenlik Kapısı ve Staging Koruma:**
   - `researchLabEnabled()` ve `workbenchEnabled()` fonksiyonları production modunda (`NODE_ENV === "production"`) koşulsuz `false` döner; `/arastirma-laboratuvari` ve dışa aktarım API'si 404 üretir.
   - `readStagingJson` fonksiyonuna 5MB dosya boyutu sınırı, path traversal engeli ve UTF-8 BOM temizliği eklendi.
   - CSV formül enjeksiyonu (`=`, `+`, `-`, `@`) koruması (`formatCsvCell`) sağlandı.
4. **Kaynak Bağımsızlığı ve Çelişki Ayrımı:**
   - `SourceCompare` bileşeni aynı kurumdan gelen kaynaklar için bağımsızlık uyarısı, benzer başlıklı farklı kurum kaynakları için kopya yayın uyarısı üretir.
   - Doğrudan pasaj temelli kanıtlar ile başlık incelemesi açıkça ayrıldı.
5. **Dışa Aktarım API'si:**
   - `web/app/api/arastirma-laboratuvari/export/route.ts` HEAD metodu, `cache-control: no-store` ve formül korumalı CSV ile güçlendirildi.

---

## 2. Test ve Kalite Kapıları Kanıtları
| Test / Denetim Adımı | Koşulan Komut | Sonuç |
|---|---|---|
| Workbench Birim Testleri | `node --test web/tests/research-workbench.test.mjs` | **10 / 10 GEÇTİ** (0 hata) |
| Kanıt Motoru Testleri | `node --test tools/historical-research/evidence/*.test.mjs` | **21 / 21 GEÇTİ** (0 hata) |
| Çalışma Alanı Birim Testleri | `npm test` (web) | **358 / 358 GEÇTİ** (0 hata) |
| Playwright E2E Testleri | `npx playwright test --config=playwright.research-ui.config.ts` | **18 / 18 GEÇTİ** (9 viewport, 0 taşma, port 4446) |
| TypeScript Kontrolü | `npm run typecheck` | **0 HATA** |
| ESLint Denetimi | `npm run lint` | **0 HATA, 0 UYARI** |
| Next.js Üretim Derlemesi | `npm run build` | **170 / 170 STATİK/DİNAMİK ROTA BAŞARILI** |
| Arşiv Doğrulaması | `node scripts/archive/validate.mjs` | **168 KAYIT, 151 YAYINDA, 0 HATA** |
| Arşiv Birim Testleri | `node --test scripts/archive/tests/*.test.mjs` | **74 / 74 GEÇTİ** (0 hata) |

---

## 3. Ekran Görüntüleri
Tüm 9 viewport için (320px–1536px) ekran görüntüleri `docs/screenshots/` dizinine ve çalışma alanı beyin arşivine kaydedilmiştir:
- `v08-research-dashboard-desktop-1536x1024.png`
- `v08-research-dashboard-desktop-1440x900.png`
- `v08-research-dashboard-tablet-1024x768.png`
- `v08-research-dashboard-tablet-768x1024.png`
- `v08-research-dashboard-mobile-430x932.png`
- `v08-research-dashboard-mobile-390x844.png`
- `v08-research-dashboard-mobile-375x667.png`
- `v08-research-dashboard-mobile-360x800.png`
- `v08-research-dashboard-mobile-320x568.png`
- `v08-research-compare-desktop-1536x1024.png`
- `v08-research-compare-desktop-1440x900.png`
- `v08-research-compare-tablet-1024x768.png`
- `v08-research-compare-tablet-768x1024.png`
- `v08-research-compare-mobile-430x932.png`
- `v08-research-compare-mobile-390x844.png`
- `v08-research-compare-mobile-375x667.png`
- `v08-research-compare-mobile-360x800.png`
- `v08-research-compare-mobile-320x568.png`
