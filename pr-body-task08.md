### Amaç
MKA Evidence Workbench 2.0 Backend & Research Workflow (Görev 08 / MKA-COPILOT-08-EVIDENCE-WORKBENCH-INTEGRATION): Tarihî iddia sürümleri, somut yer gösterilmiş kanıt pasajları, bağımsızlık analizi, çelişki adayları, akademik kaynakça ve not defteri motorunun V0.6/V0.7 veri sözleşmeleriyle çatışmadan entegre edilmesi.

### Etkilenen Dosyalar
- `tools/historical-research/package.json`
- `tools/historical-research/cli.mjs`
- `tools/historical-research/lib/**` (Evidence Engine entegrasyonu)
- `tools/historical-research/evidence/**` (Workbench 2.0 çekirdeği)
- `tools/historical-research/scripts/build-evidence-staging.mjs`
- `data/research/candidates/pool.json`
- `data/research/candidates/claims.json`
- `data/research/evidence-staging/*.json` (10 iddia, 32 denetim, çelişkiler, notlar)
- `web/lib/research-evidence/candidates.ts`
- `web/lib/research-evidence/workbench.ts`
- `web/app/api/arastirma-laboratuvari/export/route.ts`
- `web/tests/evidence-workbench.test.mjs`
- `docs/research/evidence-workbench/**`

### Çalıştırılan Komutlar ve Test Sonuçları
- `npm --prefix tools/historical-research test`: 201/202 birim testi GEÇTİ (1 Windows symlink testi dev-mode izni nedeniyle atlandı; Linux CI'da koşar).
- `node --test tools/historical-research/evidence/modules.test.mjs tools/historical-research/evidence/workflow.test.mjs`: 21/21 test GEÇTİ.
- `node --test web/tests/evidence-workbench.test.mjs`: 4/4 test GEÇTİ.
- `npm --prefix web test`: 90/90 test GEÇTİ.
- `npm --prefix web run typecheck`: 0 hata (`tsc --noEmit` hatasız tamamlandı).

### Güvenlik ve Uyumluluk
- `main` veya prod ortamına doğrudan merge/push yoktur.
- `NODE_ENV=production` iken `MKA_RESEARCH_LAB=1` olsa dahi panel ve export API'si 404 döndürür (fail-closed üretim koruması).
- Tüm kanıt alıntıları en fazla 300 karakter ile sınırlandırılmıştır (telif koruması).
- CSV export alanları formül enjeksiyonuna karşı (`=`, `+`, `-`, `@`, `\t`) güvenle öneklenmiştir.
- 10 tarihî iddianın hiçbiri otomatik `approved` yapılamaz; 32 adayın hiçbiri otomatik `readyForImport=true` olamaz.

### Kalan Eksikler
- Panel görsel/UX iyileştirmesi (Antigravity Görev 28 kapsamında parlatılacaktır).
- Bağımsız uzman paneli onay iş akışı (Görev 04 ve RBAC altyapısına tabidir).
