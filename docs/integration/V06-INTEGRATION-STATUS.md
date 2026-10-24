# V0.6 entegrasyon durumu

Tarih: 23 Ekim 2026  
Başlangıç: `integration/asrinkemali-v05-release-candidate` (`f9e2d63dcca48162cb1469a6c0a744b5a92b6b06`)  
Dal: `integration/asrinkemali-v06-release-candidate`

## Gerçek kapsam

PR #11, #12, #13, #14, #15, #16, #17, #18 ve Codex yayın motoru PR #21, kaynak geçmişleri korunarak merge commit'leriyle birleştirildi. Ortaya çıkan uygulama tek `web/` Next.js App Router hedefidir. Statik V0.1 dosyaları ve EVREN deposu değiştirilmedi.

Çalışan rotalar: `/`, `/ataturk`, `/kronoloji`, `/arsiv`, `/arsiv/[slug]`, `/yayinlar`, `/yayinlar/[slug]`, `/tarihte-bugun`, `/hakkimizda`, `/robots.txt`, `/sitemap.xml` ve salt-okunur `/api/health-integration`.

Production build 163 sayfa üretir. Katalogdan türetilen 168 kaydın dağılımı 151 `published`, 16 `reviewed`, 1 `draft`; yalnız 151 `published` kayıt ayrıntı rotası üretir. Bu teknik durumların hiçbiri insan tarih uzmanı onayı değildir. Tüm 168 editörlük formu `pending`, gönderilmiş form sayısı sıfırdır.

## Yayın platformu

Araştırma yazısı, biyografi, tarihî inceleme ve kaynaklı makale şeması; taslak üretimi; kaynak bağlantıları; durum makinesi; insan onay kapısı; idempotent dry-run zamanlayıcı; yayın listesi/detayı ve Tarihte Bugün motoru entegredir. Gerçek yayın kaydı olmadığı için `/yayinlar` sahte içerik göstermez. AI çağrısı, ücretli servis ve gerçek zamanlayıcı etkin değildir.

## Sürüm kararı

Kod, build ve tarayıcı doğrulamaları çalışır; ancak içerik yayın/preview için hazır değildir. 151 kayıtta insan uzman incelemesi ve ayrı insan editör yayın onayı yoktur. Kalite kapısının 302 kritik bulguyla başarısız olması bu açığı görünür tutan beklenen güvenlik davranışıdır; kapı devre dışı bırakılmadı.

V0.7 PR #19 ve #20 merge edilmedi. Gemini/Meta ZIP paketleri ve metin teslimleri uygulamanın üzerine kopyalanmadı; sınırlar `V07-MODULE-CONTRACTS.md` içinde tutulur.
