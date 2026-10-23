# V0.6 Codex devir notu

## Dallar

- Yayın motoru: `feature/codex-v06-publishing`, commit `bfdf7424249985b0940f3a5406ad795937454b8b`, draft PR #21.
- Entegrasyon: `integration/asrinkemali-v06-release-candidate`, hedef `integration/asrinkemali-v05-release-candidate`.

## Mimari

- `web/lib/archive.ts` tek sunucu arşiv okuma sınırıdır; sayaçlar katalogdan türetilir.
- `web/lib/publishing/` yayın modeli, repository, taslak, Tarihte Bugün ve scheduler katmanlarını içerir.
- `schemas/publication-record.types.ts` yayın sözleşmesidir.
- `tools/release-check/` insan onaysız içeriği bloklar.
- `tools/editorial-review/` insan kararını üretmez; yalnız bekleyen formlar ve denetim raporları hazırlar.
- `/api/health-integration` dal/port karışmasını saptamak için gerçek katalog sayısını ve `humanExpertReviewComplete: false` değerini verir.

## Sonraki mühendise

1. İnsan uzman formlarını yalnız yetkili kişiler doldurmalı; AI adını kişi/onay olarak yazmayın.
2. İnsan editör yayın onayı ayrı olay/sözleşmedir; uzman incelemesinin yerine geçmez.
3. Üç HTTP 400 Millî Kütüphane bağlantısını tarayıcıda ve kurum kataloğunda doğrulayın.
4. Gerçek `NEXT_PUBLIC_SITE_URL`, preview erişim politikası ve indeksleme kararı olmadan production hazır işareti vermeyin.
5. Gerçek schedule verisi eklenirse önce dry-run, idempotency ledger ve timezone testlerini çalıştırın.
6. V0.7 modüllerini `V07-MODULE-CONTRACTS.md` sınırlarıyla ayrı PR'larda alın; mock/fallback veriyi üretim içeriğine taşımayın.

Entegrasyon ZIP otomasyonu çalıştırılmadı; içindeki eski SHA ve `--publish` davranışına güvenilmedi.
