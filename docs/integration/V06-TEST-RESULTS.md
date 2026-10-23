# V0.6 test sonuçları

23 Ekim 2026 tarihinde izole `codex-v06-integration` worktree'sinde çalıştırıldı.

| Kontrol | Sonuç |
| --- | --- |
| Kök `npm ci` | Başarılı; 0 advisory |
| `web/npm ci` | Başarılı; 347 paket |
| ESLint | Başarılı |
| TypeScript | Başarılı |
| Next.js production build | Başarılı; 163 sayfa, 151 arşiv ayrıntısı |
| Web unit | 34/34 geçti |
| Arşiv Node testleri | 74/74 geçti |
| Release Python testleri | 129/129 geçti |
| Editörlük Python testleri | 44 geçti, 1 haricî snapshot testi yapılandırılmadığı için atlandı |
| Arşiv doğrulama | 168 kayıt, 0 hata, 7 içerik uyarısı |
| Playwright Chromium | Beş ana proje toplamında 323 geçti, 7 koşullu atlama; ayrıca Kilo iç matrisi 320–1536 px'i kapsar |
| Firefox + WebKit smoke | 12/12 geçti |
| Erişilebilirlik | Axe ciddi/kritik ihlal yok |
| Dependency audit | Tüm ağaç 0, production 0 advisory |
| Yayın dry-run | 0 hazır, 0 atlandı; gerçek yayın yapılmadı |
| Editör form doğrulama | 168/168 geçerli pending form, 0 submitted |

## Yayın kalite kapısı

Tam kalite runner'ı 237 teknik testte 237 başarı bildirdi. Buna karşın `release_ready=false` ve CI gate başarısızdır: 151 `published` kaydın her biri için insan editör onayı ve insan tarih uzmanı incelemesi eksik olduğundan 302 kritik bulgu, 168 uzman incelemesi ve 11 uyarı vardır. Bu içerik engeli teknik test başarısızlığı değildir ve gizlenmemiştir.

## Kaynak bağlantıları

176 benzersiz URL ağ üzerinden kontrol edildi. 173 bağlantı yanıt verdi; Millî Kütüphane'nin üç katalog URL'si HTTP 400 döndürdü:

- `.../details/136684`
- `.../details/109289`
- `.../details/105276`

HTTP sonucu tarihsel doğruluğu kanıtlamaz. Bu üç kayıt preview öncesi kurum sayfasında elle yeniden doğrulanmalıdır.

## Ekran görüntüleri

Güncel entegre koşudan masaüstü, tablet ve mobil ana sayfa; arşiv; Atatürk hero/yolculuk/sergi/diyalog ve kabuk görüntüleri `docs/screenshots/` altında `v06-*` adlarıyla bulunur. Temel teslim görüntüleri: `v06-home-desktop-1536x1024.png`, `v06-home-mobile-360x800.png`, `v06-archive-desktop-1536x1024.png`, `v06-ataturk-hero-mobile-320x720.png`.
