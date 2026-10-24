# Üst akış ve sahiplik devri

| Alan | Kanıt / durum | Devir |
|---|---|---|
| Prompt 01 / PR #33 | QA tabanı `feature/claude-v07-integration-control-plane` @ `f3da6df8dcbfd4bfdd141d2d9d6063bb8ac18f0b`; PR #33 açık taslak | Bu dal stacked; Claude'un dosyaları değiştirilmedi. Base CI'daki integration-control patch-id içerilme testi (`ancestor_included` ve `content_equivalent_likely` beklenti uyuşmazlığı) baseline finding olarak takip edilmeli, bu görevde onarılmamalı. |
| Kilo PR #7/#13 | Eski script/spec envanteri [burada](KILO-PR07-PR13-INVENTORY.md) | Tarihsel test sonuçlarını güncel çalışma diye kullanmayın; sentetik JSON commit etmeyin. |
| Claude PR #25 network filter | Bu tabanda `web/e2e/support/network.ts` helper'ı yok | Yeni/çakışan `_rsc` filtresi yazılmadı. PR #25 entegre edildiğinde dar koşul ve negatif testleri tek helper üzerinden ekleyin. |
| Release quality | Existing release checker/tests korunuyor; 151/302 vb. snapshotlar sabit değil | Teknik suite yeşil olsa da editör + uzman insan onayı olmadan publish/release onayı yok. |
| V0.8 admin / Antigravity museum / Perplexity evidence / Atlas | Route/feature varlığı bu branch üzerinde dinamik kontrol ediliyor | Envanter `NOT_INTEGRATED` der; gerçek modül dalı stack'e alınmadan UI PASS oluşturmayın. |

PR dışına yazma, merge, main push, deployment/DNS, katalog/form/onay değişikliği yapılmadı. Prompt 03 modül sahiplerinin `NEXT-PROMPTS-INTEGRATION.md` kontratını kullanması önerilir.
