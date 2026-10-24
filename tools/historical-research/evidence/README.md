# Evidence Workbench — Kullanım ve Sözleşmeler

`tools/historical-research/evidence/` altındaki MKA Evidence Workbench 2.0 çekirdeği.

## Komutlar

```bash
cd tools/historical-research
npm test                                  # 122 test (Engine + Workbench)
npm run typecheck                         # tsc --noEmit (contracts.d.ts'e göre)
node scripts/build-evidence-staging.mjs   # staging verisini yeniden üret
```

## Kritik Kurallar

1. **İddia metni değişince eski kanıt geçerli sayılmaz.** `reviseClaimText` yeni sürüm üretir;
   kanıtlar sürüme bağlıdır; eski kanıtlar stale raporlanır.
2. **Başlık/künye incelemesiyle destek kararı verilemez.** `assessSupport` yalnız
   `direct_passage` ile `actuallySupports=true` kabul eder.
3. **Aynı kurum/kopya yayın iki bağımsız kanıt sayılmaz.** Bağımsızlık belirsizse
   `unknown` olarak açıkça gösterilir.
4. **Çelişki adayları kesin karar DEĞİLDİR.** Otomatik "confirmed" reddedilir.
5. **Kaynakça eksik alan uydurmaz:** `[eksik: yazar]` görünür.
6. **Telif:** alıntı ≤300 karakter; uzun kopya yasak.
7. **Staging dışına yazılmaz:** `staging.mjs` kök sınırlarını ve UTF-8 geçerliliğini zorlar.
8. **İnsan onayı üretilemez:** mock `reviewed:true`, `status:"approved"`, `readyForImport:true`
   hepsi doğrulayıcılarda reddedilir.

## Veri Sözleşmeleri (özet)

- `ClaimRecord` (v2): `revisions[]` (sürüm, metin, kanıt kimlikleri, gerekçe), `status`
  ("approved" yok).
- `EvidenceRecord`: `claimVersion` bağlı kanıt; `locator` (URL/başlık/yazar/kurum/sayfa/bölüm);
  `shortQuote` ≤300; `supportAssessment` (method/actuallySupports); `humanReview`
  (mock reddi); `verificationLevel`.
- Graf: düğüm/kenar tipleri `contracts.d.ts` içinde; `mentions ≠ supports`.

## Ajan Uyumu

- **OpenCode Authority Registry:** `createAuthorityRegistryAdapter()` — registry yoksa
  kimlik uydurulmaz (null).
- **Copilot Control Center:** `createResearchReviewService()` — gerçek kimlik yoksa
  `createDecision()` hata fırlatır; `trusted` asla true üretilmez.
- **Gemini/DeepSeek:** `createSearchAdapter()` + `exportSourcedPlaceRelations()`.
