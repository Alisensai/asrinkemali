# V0.6 preview kontrol listesi

## Teknik

- [x] İzole worktree ve port kullanıldı.
- [x] PR #11–#18 güncel HEAD'leri geçmiş korunarak birleştirildi.
- [x] Codex yayın motoru ayrı PR olarak korunup entegrasyona alındı.
- [x] Lint, TypeScript, unit ve production build geçti.
- [x] Chromium 1536, 1440, 1024, 390, 360 ve Kilo iç matrisinde 320–1536 px doğrulandı.
- [x] Firefox ve WebKit temel rota smoke testi geçti.
- [x] Klavye, Escape, menü, arama modalı, slider, 404, boş durum ve yatay taşma denetlendi.
- [x] Axe ciddi/kritik erişilebilirlik bulgusu yok.
- [x] Robots, sitemap, metadata ve route envanteri statik kapıdan geçti.
- [x] Dependency audit 0 advisory.
- [ ] Üç HTTP 400 kaynak bağlantısı kurum kataloğunda elle doğrulanmalı.

## İçerik ve yayın

- [x] 168 kayıt ve 151/16/1 dağılımı dinamik hesaplanıyor.
- [x] AI incelemesi insan onayı gibi sunulmuyor.
- [x] Sahte indirme düğmesi ve sahte yayın yok.
- [x] Scheduler yalnız dry-run; gerçek otomatik yayın kapalı.
- [ ] 168 kayıt için yetkili insan tarih uzmanı incelemesi.
- [ ] Yayınlanacak her kayıt için ayrı insan editör onayı.
- [ ] Belirsiz hak/tarih kayıtlarının çözümü.
- [ ] Preview görünürlük ve `noindex` politikası kararı.
- [ ] Gerçek site origin'i ve sosyal paylaşım URL'leri.

## Kapsam dışı

- [x] Main merge yapılmadı.
- [x] Canlı deploy, DNS, ödeme ve ücretli API yapılmadı.
- [x] PR #19/#20 ve V0.7 demo paketleri V0.6 özelliği olarak eklenmedi.

Teknik preview'ı engelleyen derleme hatası yoktur. Kamuya açık/tarihî içerik preview'ını engelleyen asıl konu insan onayı ve üç kaynak URL'sinin doğrulanmasıdır.
