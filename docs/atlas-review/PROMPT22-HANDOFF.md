# MKA GÖREV 22 — DEVİR VE ENTEGRASYON TALİMATI (HANDOFF)

**DOKÜMAN:** `docs/atlas-review/PROMPT22-HANDOFF.md`  
**GÖNDEREN:** ANTIGRAVITY (Task 21 — Denetim)  
**ALICI:** ANTIGRAVITY (Task 22 — Gerçek Entegrasyon)  
**TARİH:** 24 Ekim 2026  

---

## 1. Devir Kapsamı ve Hazırlık

Task 21 kapsamında iki harita paketi ve yama dosyası kapsamlı bir güvenlik, mimari ve provenans denetiminden geçirilmiş; **`ACCEPT_NEW`** kararı verilmiştir.
Task 22'ye devredilen doğrulanmış girdi paketi:
- **Kaynak Dosya:** `C:\Users\Ali\Downloads\MKA_ATLAS_V07_GITHUB.patch`
- **Yedek Kaynak:** `C:\Users\Ali\Downloads\MKA_ATLAS_V07_KAYNAK_KOD.zip`
- **SHA256:** `552796ad2d49333dc329d4de6198a1ee19067467113aad4bccf38a8613026053`

---

## 2. Task 22 İş Akışı ve Komut Sırası

1. **Yeni Çalışma Dalı:**
   ```bash
   git checkout -b feature/antigravity-v08-atlas-2-integration feature/antigravity-v08-atlas-2-assessment
   ```

2. **Yamanın Uygulanması:**
   ```bash
   git apply "C:\Users\Ali\Downloads\MKA_ATLAS_V07_GITHUB.patch"
   ```

3. **Eklenecek / Güncellenecek Dosyalar (12 Dosya):**
   - `docs/atlas/V07-ARCHITECTURE.md`
   - `docs/atlas/V07-PR-DRAFT.md`
   - `docs/atlas/V07-STATUS.md`
   - `web/app/atlas/page.tsx`
   - `web/components/atlas/AtlasExplorer.tsx`
   - `web/components/atlas/AtlasMap.tsx`
   - `web/components/atlas/AtlasTimeline.tsx`
   - `web/components/atlas/atlas.module.css`
   - `web/lib/atlas/adapters.ts`
   - `web/lib/atlas/model.ts`
   - `web/tests/atlas.test.mjs`
   - `web/e2e/atlas.spec.ts`

4. **Doğrulama ve Test Adımları:**
   - `node --test web/tests/atlas.test.mjs` (31 birim testinin tamamı doğrulanmalı)
   - `cd web && npm run typecheck`
   - `cd web && npm run lint`
   - `cd web && npm run build` (166 statik/dinamik sayfa derlenmeli)
   - `cd web && npx playwright test e2e/atlas.spec.ts` (port 4434 üzerinde 9 viewportta test edilmeli)
   - `node scripts/archive/validate.mjs && node --test "scripts/archive/tests/*.test.mjs"`

5. **Ekran Görüntüleri ve Rapor:**
   - 9 Viewport ekran görüntüsü `docs/screenshots/v08-atlas-*` altında kaydedilmeli.
   - `docs/antigravity-v08/GOREV-22-RAPOR.md` oluşturulmalı.
   - GitHub Draft PR açılmalı.
