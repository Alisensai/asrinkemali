# MKA Control Center V0.8

Bu çalışma alanı, V0.6 entegrasyon dalındaki arşiv kataloğu, PR #15 editörlük formları ve Codex yayın motorunu **salt okunur** yönetim görünümlerinde birleştirir. Hiçbir arşiv veya yayın kaydını değiştirmez.

## Güvenlik sınırı

`web/lib/admin-v08/access-control.ts` merkezi rol/modül matrisini ve test edilebilir yetki kararlarını tanımlar. `web/lib/admin-v08/auth.ts` sunucu tarafında oturum noktasıdır; depoda güvenilir kimlik sağlayıcısı olmadığı için `getCurrentAdminSession()` şu anda daima `null` döndürür. Bu nedenle `/yonetim/*` altındaki tüm sayfalar fail-closed erişim ekranı gösterir. Bir env değişkeni, localStorage girdisi, formdaki ad veya rol metni oturum olarak kabul edilmez.

Erişimi açmak için güvenilir bir sağlayıcının `SessionProvider` adapterı, üretim oturum doğrulaması, server-side role mapping ve security review eklenmelidir. Bunu yapmak bu PR kapsamına dahil değildir. `resolveAdminSession` testlerde sahte provider ile birim test edilebilir; test principal'ı uygulama oturumu veya insan onayı olarak kaydedilmez.

## Çalışan read-only modüller

- **Arşiv:** gerçek iki arşiv dizininden dinamik kayıt listesi, başlık/kurum/tür/teknik durum/yıl/hak filtresi, sayfalama, detay sayfası, kaynak ve hak kalite bayrakları, tür ve kurum dağılımı.
- **İnsan incelemeleri:** `docs/editorial/forms/` formlarının envanteri. Katalogdaki ilgili snapshot alanları değiştiğinde form `stale` olarak işaretlenir. `submitted` veya `approved` form içeriği yalnızca beyan olarak gösterilir; doğrulanmış insan kimliği/onayı kabul edilmez.
- **Yayın ve makale listesi:** Codex’in mevcut yayın repository adapterı üzerinden, mevcut validation ve status sözleşmesi korunarak okunur.
- **Takvim:** var olan scheduler ve `content/publications/publication-ledger.json` girdisi ile dry-run planı. Gerçek zamanlayıcı/side effect yoktur.
- **Tarihte Bugün:** mevcut seçim motorundan, anlık İstanbul tarihi için gerçek katalog adayları; uygun kayıt yoksa açık boş durum.
- **Kaynak/telif:** gerçek kayıt başına kurum, kaynak, künye ve hak alanları; yalnız HTTPS URL bağlantı olur.
- **Kullanıcı/rol:** RBAC matrisi; kullanıcı ekleme/davet/rol değiştirme endpoint'i yok.
- **Denetim/sistem:** olay tipi, redaction ve optimistic concurrency sözleşmeleri; kalıcı audit, GitHub/CI adapterı olmadığından bunlar açıkça “yapılandırılmadı/bilinmiyor” gösterilir.

## Bilerek yapılmayanlar

Gerçek kimlik ve session provider, kalıcı DB/repository, audit ledger, staging mutation, editör veya uzman kararı, makale yazma/revizyon endpoint'i, zamanlayıcı, GitHub token/API entegrasyonu yoktur. Bu nedenle kullanıcı/rol değişikliği, inceleme gönderimi/onayı, yayın onayı ve gerçek yayın UI işlemleri de sunulmaz. Bunları bellek içi veya dosyaya yazarak kalıcı/production işlevi gibi göstermek yerine fail-closed bırakıyoruz.

`AdminRepository`, `PublicationRepository`, `ReviewRepository`, `AuditRepository`, `SessionProvider`, `StagingRevision` ve optimistic revision helper'ları ileri adaptörler için kontrat sağlar. Mevcut public archive/publishing/release gate dosyalarına değişiklik yapılmamıştır.

## Kontroller

`web/` klasöründe:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e -- e2e/admin-v08.spec.ts
```

E2E senaryoları sağlayıcısız gerçek geliştirme sunucusunda tüm admin rotalarının kapalı kalmasını ve 320–1536 px arası responsive taşma olmadığını doğrular. Browser binary mevcut değilse Playwright sonucu ayrıca belirtilmelidir; birim test veya build, tarayıcı testi yerine geçmez.

## Kalan entegrasyonlar

Bu modül V0.6 tabanına eklenebilir; üretimde açılması için önce kimlik sağlayıcısı, persistent review/publication/audit repository'leri, aktör kimliği ve rol kaynağı, CSRF/authorization tasarımı ve eşzamanlı revizyon API'si gereklidir. PR #12 yayın kalite kapısı hiçbir yerde gevşetilmemiştir.
