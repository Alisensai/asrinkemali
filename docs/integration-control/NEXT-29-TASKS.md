# Görev 02–30 için devir notları

Makine okunur manifest: `reports/task-manifest.json` (`cli.mjs tasks` ile doğrulanır). 2026-10-24 ajan ataması: **CLAUDE** → 01, 04, 07, 08, 15; **COPILOT** → 02, 03, 05, 06, 09–14; **ANTIGRAVITY** → 16–30.

## Durum modeli

`PLANNED → IN_PROGRESS → PR_OPEN → CI_PENDING → (CI_FAILED | TECHNICALLY_VALIDATED) → (HUMAN_REVIEW_REQUIRED) → INTEGRATION_READY → INTEGRATED_IN_REHEARSAL → MERGED_WITH_APPROVAL`; her aşamadan `BLOCKED`'a geçilebilir.

- `INTEGRATED_IN_REHEARSAL` gerçek birleştirme değildir.
- `MERGED_WITH_APPROVAL` yalnız açık kullanıcı onayıyla verilir.

## Kritik devirler

| Görev | Girdi | Engel / dikkat |
|---|---|---|
| 02 (Kilo QA) | #13 V0.6'da | #13'ün son CI koşusu iptal; `archive-platform.spec` gibi sabit sayılı testler 168 kayıtla uyumlu olmalı |
| 03 (yayın motoru) | #21 V0.6'da; #25 ve #28 sağlamlaştırmaları | #25/#28 `scheduler.ts` ve `dry-run.mjs` dosyalarını değiştiriyor; onların üzerine kurulmalı |
| **04 (insan onayı) — Claude** | #12, #15 V0.6'da; #26 açık | 302 bulgu (151 uzman + 151 editör) gerçek insan onayı olmadan kapanamaz; Copilot Görev 14 ile admin/yetki dosyalarında eşzamanlı değişiklik yapılmamalı |
| 05/06 (OpenCode) | #20 (taban #14 dalı) | V0.6'ya yeniden hedefleme; Fortress bulgusu: 3 link-only fotoğrafta ham `.jpg` kaynağı |
| **07 (Evidence Engine) — Claude** | #19 (taban #14 dalı) | Next.js CI hatası tabandan miras (68/62 testi); V0.6'ya yeniden hedeflenince kaybolması beklenir (**doğrulanmalı**) |
| **08 (Evidence Workbench) — Claude** | #24 → #19 | #24'te 5 ESLint hatası (`arastirma-laboratuvari/page.tsx`); #19 olmadan uygulanamaz (plan BLOCKED); frontend Antigravity Görev 28'e |
| 14 (Control Center) | #26 | **#28 proxy'si `/yonetim`'i 404 yapar**: provada #26'nın kendi e2e testi kırılıyor (`REHEARSAL-PLAN.md`). Karar gerekli: ya proxy, panelin kendi kapalı-başarısız sayfasına izin verir ya da panel testleri 404 bekler |
| **15 (backend entegrasyon) — Claude** | 03–14 sonuçları | En son. #03–#14 PR ve testleri doğrulanmadan başlamaz |
| 16–19, 26, 27 (Antigravity) | #23 → #27 | #27, #23 olmadan uygulanamaz; #23 ile #25 `web/app/arsiv/[slug]/page.tsx` dosyasını paylaşıyor (metin düzeyinde temiz, sıra bağımsız) |
| 21/22 (Atlas) | ZIP/patch | **MISSING_ARTIFACT**: dosyalar bu ortamda yok |
