# V0.6 çakışma çözüm kaydı

## Kaynak çakışmaları

- PR #11 ile PR #16 arasındaki `Icon.tsx` çakışmasında iki tarafın kullandığı `speech-bubble` ve `external` ikon sözleşmeleri birlikte korundu.
- PR #16 ve PR #21 ekran görüntüsü ikili dosya çakışmalarında entegrasyon dalının çalışan uygulama görüntüleri esas alındı; son test koşusu bütün V0.6 görüntülerini yeniden üretti.
- PR #17'nin güncel `d0bede0` hydration düzeltmesi kullanıldı. Test içinde React tarafından yönetilen DOM'a hydration öncesi müdahale eden eski yaklaşım geri getirilmedi.
- Atatürk deneyiminde kurum/mekân kuruluş tarihleri kişisel yaşam olayı sayılmadı; yaşam aralığı mekân kayıtlarından türetilmez.
- Mobil yıl rayının 320 px'de sağdan 4 px taşması `max-inline-size: 100vw` ile giderildi.

## QA düzeltmeleri

- ESM testinde geçersiz `__dirname`, `import.meta.url` üzerinden çözüldü.
- Kilo seçicileri genişleyen katalogda birden fazla eşleşmeye yol açtığı için erişilebilir, tekil başlık/bağlantı seçicilerine daraltıldı.
- Mobil menü testi sayfaya gitmeden öğe arıyordu; bağımsız test kurulumu eklendi.
- 1024 px beklentisi uygulamanın gerçek 960 px menü kırılımıyla hizalandı.
- Yönlendirme sonrasındaki geçici layout ölçümü `expect.poll` ile kararlı DOM üzerinde doğrulanır.

## Depo büyüklüğü

PR #13'ün 500, 2.000 ve 10.000 kayıtlık üç üretilmiş JSON fixture'ı yaklaşık 15,9 MB ve 662.506 satırdı. Testler bu dosyaları okumuyor; üretici script zaten bulunuyor. Dosyalar güncel ağaçtan kaldırıldı, `qa/kilo/synthetic/.gitignore` ile tekrar eklenmeleri önlendi. Gerçek 168 kayıt ile sentetik performans modeli ayrı tutulur.

Hiçbir çözüm `git reset --hard`, force-push veya kalite kapısı kapatma yoluyla yapılmadı.
