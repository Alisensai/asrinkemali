# CI ve sürüm kapıları: teknik, editoryal, hak, dış kaynak ve dağıtım ayrımı

`Next.js CI: success` ile `Release quality: failure` aynı anda bulunabilir. Bu bir çelişki değildir; ayrı kontrol türlerinin sonucudur. `cli.mjs gates` bunları tek bir PASS bayrağına indirgemez.

## PR #22 (V0.6) gerçek Release Quality raporu — `gates` sınıflandırması

| Kapı | Sonuç |
|---|---|
| Teknik | **TECHNICAL_READY_FOR_REVIEW**: 0 başarısız ve 0 çalışmayan kontrol; 555 test geçti, 0 başarısız |
| Editoryal | **EDITORIAL_BLOCKED**: 302 kritik bulgu = **151** kayıtta insan tarih uzmanı incelemesi yok + **151** kayıtta ayrı insan editör yayın onayı yok (aynı 151 kayıt); ayrıca 168 uzman inceleme kalemi |
| Hak/telif | 3 bulgu (`HAK_BELIRSIZ`, `INCELEME_HAK`) |
| Dış kaynak | 0 bulgu. HTTP 200 doğruluk veya lisans kanıtı değildir; 400/403/429/5xx yeniden denetim gerektirir |
| Güvenlik | 0 engelleyici |
| Dağıtım | **yetki yok**: CI başarısı dağıtım yetkisi değildir |

`RELEASE_READY` verilmedi. Sayılar kodda sabit değildir; her çalıştırmada rapordan okunur.

## Açık PR'ların son baş SHA CI durumu (canlı, 2026-10-24)

| PR | Teknik CI | Release quality | Neden (doğrulandı) |
|---|---|---|---|
| #19 | **verify-next-app: failure** | failure | **Tabandan miras**: `archive-platform.spec` "68 kayıt / 62" sabitini #14'ün 168 kayıtlık verisiyle test ediyor. #19 bu dosyaya dokunmuyor. #14 yalnız veri değiştirdiği için Next.js CI hiç tetiklenmedi. V0.6'daki spec düzeltilmiş durumda. |
| #24 | **verify-next-app: failure** | failure | **PR'ın kendi diff'i**: `web/app/arastirma-laboratuvari/page.tsx` içinde 5 ESLint `react/no-unescaped-entities` hatası (Görev 08'e devredildi). |
| #13 | verify-next-app: cancelled | failure | Koşu iptal edilmiş; yeniden çalıştırma gerekiyor. |
| #23, #25, #26, #27 | success | failure | Editoryal kapı (insan onayı); teknik hata yok. |
| #28 | success (+ fortress-tools, production-security-e2e) | failure | Editoryal kapı. |

**Sınıf ayrımı** (`ci-matrix.json`):
- `release-quality` → `mixed_technical_and_editorial`. Gerçek ayrım için artefakt `gates` ile okunur.
- `fortress-*` → `security`
- diğerleri → `technical`
