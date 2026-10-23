# V0.4 kalite kapıları ve yayın hazırlığı

Bu akış, kod doğrulamasını yayın onayından ayırır. GitHub Actions kalite hatalarını yakalar ve release-readiness raporu üretir; **production deploy, DNS veya gerçek alan adı yapılandırması yapmaz**. Rapor canlı bir site veya arama motoru indekslenmesi iddiası değildir.

## PR kabul kuralları

1. PR kendi dalından, hedef entegrasyon dalı için açılır. `main` üzerine doğrudan push, force push veya otomatik merge yoktur.
2. PR'da çalışan `web/` uygulaması bulunmalı; `package.json`/lockfile senkron olmalı; lint, TypeScript, unit, production build ve Playwright testleri geçmelidir.
3. Zorunlu App Router sayfaları ve not-found rotası bulunmalı; dahili href, anchor ve görsel hedefleri var olmalıdır.
4. Her button erişilebilir ada ve gerçek handler/form işlemine sahip olmalı veya açıkça disabled olmalıdır. Görsellerde alt özniteliği bulunmalı; `alt=""` yalnızca dekoratif görsellerde kullanılmalıdır.
5. Title, description, canonical, robots, sitemap ve Open Graph metadata'sı denetlenir. Production origin doğrulanana dek varsayılan canlı URL uydurulmaz.
6. Gizli anahtar/tokens depoya yazılmaz. Dış HTTP link ve `target=_blank` kullanımının güvenliği raporlanır. Üretim bağımlılıklarının güvenlik advisory'leri CI'ı engeller; geliştirme bağımlılığı uyarıları raporda ayrıca görünür.
7. Atatürk'e atfedilen alıntı kaynak künye/bağlantısıyla gelmeli. Tarihî arşiv kaydı kurum, özgün kaynak ve açıklama, tarih hassasiyeti, telif/kullanım durumu ile uzman incelemesi içermelidir.
8. AI canlandırması tarihî fotoğraf türünde sınıflandırılamaz. Doğrulanmamış veya uzman incelemesi tamamlanmamış kayıt üretim rotalarına yayımlanamaz.
9. Büyük ve kullanılmayan dosyalar incelenir; checker hiçbir asset'i kendiliğinden silmez. Kullanılmayan varlıklar önce sahip/ajan tarafından teyit edilir.
10. PR metni amaç, etkilenen dosyalar, komut/test sonuçları, desktop/mobile görüntüleri ve kalan eksikleri açıklar.

## Çalıştırma

Tam uygulama kapıları:

```powershell
python tools/release-check/quality_runner.py --web-root web --output-dir $env:TEMP\asrin-release-report
```

Chromium kurulmuşsa Playwright testlerini de ekleyin:

```powershell
Push-Location web
npm ci --no-audit --no-fund
npx playwright install chromium
Pop-Location
python tools/release-check/quality_runner.py --web-root web --output-dir $env:TEMP\asrin-release-report --e2e
```

Alt seviye komutlar:

```powershell
python -m unittest discover -s tools/release-check/tests -v
python tools/release-check/checker.py --target next --next-root web --require-target --fail-on error
```

`.github/workflows/release-quality.yml` bağımsız olarak `web/` hedefini zorunlu tutar; Node 24/Python 3.12 kullanır; npm ci, lint, TypeScript, unit, release/archive testleri, production build, Playwright E2E ve npm security audit çalıştırır. JSON/Markdown readiness raporu `release-quality-report` artifact'ında 30 gün saklanır. Eski statik CI ve Next.js CI dosyaları değiştirilmez.

### CI exit code

- `0`: test/komutlar geçti, kritik ve hata bulgusu yok. Warning'ler raporlanır.
- `1`: uygulama veya zorunlu test eksik, komut/test başarısız, kritik bulgu ya da hata var.
- **`release_ready: false`:** CI kalite kontrolleri yeşil olsa bile tarihsel içerik eksik/uzman incelemesiz veya onaylı production origin'i yok. Bu ayrı yayın engelidir; otomatik yayın yapılmaz.

## Kalite raporu

`release-quality.json` ve `release-quality.md` şu alanları gösterir: toplam başarılı/başarısız test, kritik hata/hata/uyarı/uzman incelemesi sayıları; her kontrolün sonucu; eksik içerikler ve kaynaklar; üretim/geliştirme bağımlılık bulguları; olası secret bulguları (secret değerini yazmadan); publication blockers ve arşiv doğrulama sınırlamaları.

Yerel HTML route, anchor, TSX Link/`a`, Next page inventory, JSX görsel, CSS asset ve içerik href'leri varsayılan offline biçimde taranır. `--external-links` açıkça verildiğinde checker timeout, rate-limit ve cache ile harici HTTP HEAD (405/501 için tek byte Range) isteği yapar. Tam CI koşusundaki `npm audit` registry'ye bağlanır; testlerin offline olması bu dependency advisory taramasını kapsamaz. Erişilebilirlik veya URL varlığı tarihsel kaynağın doğruluğuna kanıt sayılmaz.

## Arşiv ve uzman incelemesi

Araç, var olan `web/lib/site-data.ts` `archiveRecords` dizisini olduğu gibi okur; bağımsız JSON fixture'ları da test eder. PR #4'te dizi boştur; araç kayıt eklemez veya Codex/OpenCode veri kaynaklarını değiştirmez.

Yayıma açık kayıtların benzersiz kimlik/slug, geçerli ISO tarih ve ona uygun hassasiyet, kaynak kurumu, özgün URL, kaynak açıklaması, telif/kullanım durumu, doğrulanmış statü ve inceleyen/tarih içeren uzman onayı olmasını bekler. Alıntının kendi kurum/link/açıklaması olmalıdır. AI/temsili görsel için sınıflandırma ile alt metin tutarlı olmalıdır. Eksik taslak alanları uyarı ve uzman incelemesi gereği olarak; doğrulanmamış yayın ise critical olarak raporlanır.

**Otomatik kontrol sınırı:** URL biçimi veya HTTP 200 sonucu tarihsel belgenin gerçekliğini, alıntının doğru kişiye aitliğini, arşiv kaynağının güvenilirliğini ya da telif beyanını ispatlamaz. Bu konular insan uzman tarafından kaynak belgesi/provenans ve kullanım koşulları incelenerek doğrulanmalıdır. Rapor buna dair otomatik doğrulama iddiasında bulunmaz.

Mevcut `archiveRecords`, `publications`, `chronology` koleksiyonları boş olduğu için rapor yayın hazırlığını **HAYIR** gösterir. Bu, henüz içerik yayımlamama kararıyla uyumludur; kaynaklı ve uzman incelemeli içerik eklenmeden gerçek yayın yapılmamalıdır.

## SEO ve origin politikası

- **Title / description:** root metadata'da tanımlı ve sayfa başlık şablonuyla kullanılmalıdır.
- **Canonical:** Next metadataBase ve canonical route ile üretilebilir; mutlak base yalnızca yetkili gerçek origin üzerinden yapılandırılmalıdır.
- **Robots:** `NEXT_PUBLIC_SITE_URL` yokken indeksleme kapalı kalmalı. Preview/staging ortamı production gibi indexable işaretlenmez.
- **Sitemap:** sadece gerçek App Router sayfaları ve deployment origin'ini kullanmalı; localhost veya hayalî alan adı canonical olarak yayınlanmamalıdır.
- **Open Graph:** title, description ve görsel olmalı; temsili Atatürk görseli açıkça AI/temsili şeklinde tanımlanmalıdır.

Şu anda `NEXT_PUBLIC_SITE_URL` verilmediğinde uygulama indexlemeyi kapatır; production readiness raporu ayrıca gerçek origin onayını ister. `.com.tr` DNS aktif/bağlı kabul edilmez. Gerçek değer deploy ortamında yetkili kişi tarafından sağlanır, repoya gizli veya uydurma değer yazılmaz.

## V0.4 üretim yayın koşulları

- Tüm kod, type, unit, build, Playwright ve production dependency security kapıları geçmeli.
- Release raporunda critical/error olmamalı; warning ve uzman incelemesi kayıtları sahip/kanıt ile kapatılmalı.
- Kaynaklı arşiv/yayın/kronoloji verileri uzman tarafından doğrulanmış ve telif/kullanım hakları belgelenmiş olmalı; AI canlandırmaları tarihî fotoğraf diye sunulmamalı.
- Tüm rotalar, alt metin, işlevli etkileşim, SEO metadata, robots, sitemap ve OG görseli doğrulanmalı.
- 360px+ mobil ve desktop görsel kabulü yapılmalı; PR'ya screenshot referansları eklenmeli.
- Alan adı, DNS, hosting, production `NEXT_PUBLIC_SITE_URL`, robots indeksleme ve rollback/yedekleme ayrı yetkili onayla yapılandırılmalı.
- Bu workflow hiçbir production deploy, DNS değişikliği, ücretli hizmet veya ödeme gerçekleştirmez.
