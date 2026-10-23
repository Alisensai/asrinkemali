# V0.8 doğrulama kaydı

Bu dosya bu çalışma dalındaki son doğrulama turunun anlık kaydıdır; arşiv ve form sayımları test koduna sabitlenmemiştir.

## Sonuçlar

| Kontrol | Sonuç |
|---|---|
| `npm test` | 56 geçti, 0 başarısız |
| `npm run typecheck` | Başarılı |
| `npm run lint` | Başarılı |
| `npm run build` | Başarılı; tüm `/yonetim/*` rotaları dinamik olarak derlendi |
| `npm audit --omit=dev --audit-level=high` | 0 bulgu |
| Admin + arşiv + yayın Playwright regresyon turu | 60/60 geçti |
| Son admin fail-closed + responsive/screenshot turu | 10/10 geçti; 320–1536 px genişliklerde yatay taşma yok |

Gerçek depo verisi üzerinde eklenen test, her iki arşiv dizinini ve inceleme formu dizinini çalışma anında okur. Bu doğrulama turunda 168 arşiv kaydı ve 168 form bulundu; ID'ler benzersiz, her form geçerli ve güncel bir kayda eşleşiyordu. İnceleme mantığı 150 formu bekliyor, 18 formu arşiv snapshot'ı değiştiği için eski (`stale`) olarak işaretledi. Tüm formlar insan uzmanı ve editör incelemesi bekliyor; formdaki beyan doğrulanmış kimlik ya da yayın onayı sayılmıyor.

Bu test yalnızca kayıt biçimini, eşleşmeyi ve teknik durum işaretlerini doğrular. Tarihî iddianın doğruluğunu, kaynak özgünlüğünü, telif uygunluğunu veya insan incelemesini otomatik olarak kanıtlamaz.

## Ekran görüntüleri

- `screenshots/access-denied-1536px.png`
- `screenshots/access-denied-360px.png`

Görüntüler, bu dalda güvenilir kimlik sağlayıcısı yapılandırılmadığı için erişimi kapalı yönetim ekranını gösterir; yetkili yönetim panelini temsil etmez.

## Kalan engeller

- Kimlik sağlayıcısı ve sunucu tarafı doğrulanmış oturum yok; yönetim rotaları fail-closed.
- Kalıcı veritabanı/repository, audit deposu ve doğrulanmış insan aktör kaydı yok.
- İnceleme gönderme/onaylama, yayın, kullanıcı yönetimi ve gerçek zamanlayıcı işlemleri sunulmuyor.
- Gerçek katalog uzman incelemesinden geçmedi; bekleyen ve eski formlar yayın öncesi insan incelemesi gerektiriyor.
