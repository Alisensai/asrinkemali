# Prompt 04'e yayın entegrasyonu devri

## Bugünkü sınır

`PublicationRecord` şeması tek otoritedir. V0.6 `approval` nesnesi yalnız metadatasıdır; gerçek bir insan aktör, rol, MFA, imzalı oturum, revision bağlama veya kalıcı denetim kaydı kanıtlamaz. Bu nedenle `PublishingReviewAdapter` kapalı-başarısız ve salt-okunurdur.

## Preflight sözleşmesi

`web/lib/publishing-integrations/` aşağıdaki salt-okunur yüzeyleri verir:

- `runPublicationPreflight`: şema, kaynak/arşiv kimliği, haklar ve bağımlılık eksiklerini blocker/warning olarak sınıflandırır.
- `computePublicationRevision`: gövde, kaynakça, haklar ve ilişkiler için SHA-256 özetidir; imza veya insan onayı değildir.
- `auditPublicationLedger`: dosya ledger'ını idempotency/kimlik/zaman bakımından denetler. Dosya ledger çok kullanıcılı transaction değildir.
- `planPublicationDryRun`: hiçbir kayıt veya ledger yazmadan preflight ve mevcut scheduler sonucunu birleştirir.

## Prompt 04 için gerekli gerçek altyapı

1. Kimliği doğrulanmış, MFA'lı `historian` ve `editor` aktörleri; görev ayrılığı.
2. İçerik revizyonuna bağlı, değişiklikte stale olan ayrı uzman incelemesi ve editör yayın onayı.
3. Atomik/kalıcı ledger, kilit, audit store ve hata sonrası replay stratejisi.
4. İmzalı kararların yetkili kişi tarafından alındığına ilişkin hukukî/operasyonel süreç.

Bu öğeler olmadan `approved`, `scheduled` veya `published` mutasyonu açılmamalı; `release_ready=false` engeli kaldırılmamalıdır.
