# V0.6 release quality

Python 3 ile yazılmış, Next.js hedefi `web/` olan yayın hazırlığı ve CI kalite kapılarıdır. UI, arşiv rotaları ve Codex/Antigravity özellik dosyaları değiştirilmez. Kaynak/route/asset/secret taraması ağ kullanmaz; tam kalite koşusu dependency advisory bilgisi için `npm audit` registry erişimi gerektirir. Dış site bağlantı kontrolü ayrıca etkinleştirilir.

## Tek komut

Repo kökünden:

```powershell
python tools/release-check/quality_runner.py --web-root web --output-dir $env:TEMP\asrin-release-report
```

Bu komut lint, TypeScript, web ve Python/Node archive unit testleri, mevcut V0.5 archive validator, Next.js production build, bağımlılık taraması, V0.5 kataloğu, yayın onayı/zamanlama kuralları ve statik Next.js kaynak kalite kontrollerini yürütür. CI, Playwright testlerinden önce Chromium'u kurar ve aynı runner'ı `--e2e` ile çağırır:

```powershell
Push-Location web
npm ci --no-audit --no-fund
npx playwright install chromium
Pop-Location
python tools/release-check/quality_runner.py --web-root web --output-dir $env:TEMP\asrin-release-report --e2e
```

Normal kullanım ağ erişimi gerektirmez; `npm audit` registry erişimi gerektirir. E2E browser indirmesi yalnızca test ortamında yapılır. Hiçbir API key veya ücretli servis gerekmez.

Alt seviye statik tarama:

```powershell
python tools/release-check/checker.py --target next --next-root web --require-target --fail-on error
python -m unittest discover -s tools/release-check/tests -v
```

Uygulama hedefi yoksa checker isteğe bağlı modda `SKIP` raporlar; `--require-target` ile workflow'da hedef eksikliği kritik hata olur. `quality_runner.py` her zaman `web/` hedefini zorunlu tutar ve eksik uygulamada başarısız olur.

## Denetimler

| Alan | Kontroller | Kapı davranışı |
|---|---|---|
| Kod | ESLint, `tsc --noEmit`, mevcut Node unit testleri, Next production build, Playwright E2E | Komut/test başarısızsa CI başarısız |
| Rotalar | App Router page inventory, gerekli rotalar, 404 sayfası, statik `Link`/`a` ve içerik href'leri | Bulunamayan rota kritik kalite hatası |
| Anchor ve kaynak | Sayfa içi fragment, `public/` asset, TSX image, CSS `url()` ve içerik verisi görsel yolu | Bozuk hedef/kaynak hata |
| Erişilebilirlik/etkileşim | Button adı ve `onClick`/`formAction`/submit/disabled sinyali, image alt özniteliği | Adsız/etkisiz button veya eksik alt hata; kasıtlı `alt=""` dekoratif görseller için geçerlidir |
| Metadata | Next root title, description, canonical, robots, metadataBase, OG ve `robots.ts`/`sitemap.ts` | Eksik/yanlış config hata; gerçek origin yoksa yayına hazır değil |
| Güvenlik | Repo metinlerinde olası gizli anahtarlar; HTTPS dış link; `_blank` için noopener/noreferrer; `npm audit` | Gizli bilgi, HTTP dış link ve üretim bağımlılığı advisory'si CI'ı durdurur; geliştirme araçları advisory'leri raporda uyarıdır |
| İçerik | Tekrarlanan/boş koleksiyonlar, JSON/TS arşiv modeli, kaynak/telif/kullanım/tarih/doğrulama ve AI görsel sınıfı | Doğrulanmamış yayımlanmış kayıt kritik; eksik taslak alanı uyarı/uzman incelemesi |
| V0.5 kaynak kataloğu | `content/archive/records/*.json` ve `data/archive/catalog/*.json`; kaynak/provenans, tarih hassasiyeti, haklar, kimlik/slug/kayıt tekrarı | Bozuk JSON, geçersiz yayın kaydı ve tekrar CI'ı başarısız kılar |
| Yayın onayı | `verification.status` ile ayrı `publicationApproval` alanı, insan editör ve insan uzman incelemesi | Onaysız/AI tarafından onaylanmış `published` kayıt kritik; uzman inceleme açığı ayrı sayılır |
| Zamanlanmış içerik | `content/scheduled/*.json`; timezone içeren ISO-8601, gelecek zaman, ilişkili kayıt, tek aktif plan ve onay önceliği | Geçmiş plan, eksik/AI onayı, tekrarlanan plan veya erken yayın kritik |
| Varlıklar | 5 MiB varsayılan üst sınır; kullanılmayan asset ve lisans metadata'sı | Büyük/kullanılmayan asset raporlanır, otomatik silinmez |

`npm audit` tüm bağımlılıkları inceler; üretim dependency taraması CI gate'tir. Varsa geliştirme araçları advisory'leri ayrı warning olarak raporlanır, production advisory'leri hata olur. `npm ci` ayrıca package-lock/manifest uyuşmazlığını hata verir.

## V0.6 yayın/katalog kapısı

`publication_guard.py`, mevcut JSON kayıtlarını değiştirmeden iki V0.5 kataloğunu birlikte denetler. ID, slug ve başlık/tarih/kaynak tekrarlarını, kaynak URL biçimini ve provenansı, ISO takvim tarihini/hassasiyetini, telif statüsünü, alıntı doğrulama bayraklarını ve yayımlanmış içerikteki insan onayını kontrol eder. Daha derin şema, URL güvenlik politikası ve iş kuralları için mevcut `node scripts/archive/validate.mjs --json` ve 74 Node arşiv testi de CI'da çalışır.

Yayımlanmış kayıt için yeni kontrol sözleşmesi:

```json
{
  "publicationApproval": {
    "status": "approved",
    "authority": "human",
    "role": "human_editor",
    "approvedBy": "Yetkili editör",
    "approvedAt": "2026-10-21T12:00:00Z"
  }
}
```

Ek olarak `verification.reviewedBy` insan uzmanı, `reviewedAt` geçerli ve geçmiş tarih olmalı. `AI`, `OpenCode`, `Copilot`, agent/bot/automation kimlikleri insan onayı sayılmaz. Makine bir kişinin kimliğini veya gerçek yetkisini kanıtlayamaz; onay kaydı yetkili ekipçe doğrulanmalıdır. Mevcut V0.5 dalında 68 kaydın 62'si `published`, ancak kayıtlar insan uzman incelemesini değil OpenCode AI denetimini gösteriyor ve ayrı `publicationApproval` içermiyor. Bunlar raporda ayrı insan-incelemesi bulgusu ve kritik yetkisiz-yayın kapısı oluşturur; Codex/OpenCode veri dosyaları bu PR'da düzeltilmez.

Şu an `content/scheduled/` dizini/yayın motoru verisi yoktur. İleride her zamanlama `id`, katalogdaki `recordId`, `status`, saat dilimi taşıyan `scheduledAt` ve yukarıdaki insan `approval` alanlarını içeren bir JSON dosyası olarak bu dizine konur. `scheduled` geçmiş zaman olamaz, onay zamanı yayın zamanından sonra olamaz; `published` gelecekteki zamanlamaya sahip olamaz. Testler sabit saat enjekte ederek deterministik çalışır. Henüz plan olmaması warning olarak raporlanır; hatalı plan kritik hata üretir.

`eslint-config-next` Next 16 dalında uyumlu 16.4.3 patch sürümüne yükseltildi; lint/typecheck/web testleri geçti. Önceki registry taramasında görülen beş geliştirme-bağımlılığı advisory'si son tam koşuda yeniden kontrol edildi: güncel `npm audit` tüm dependency ağacı ve production için **0 advisory** döndürdü. Kırıcı majör downgrade uygulanmadı; registry sonuçları zamanla değişebileceğinden CI her çalışmada yeniden tarar.

`web/package.json` ve lockfile'a `license: "UNLICENSED"` yazıldı: package `private` ve repoda onaylı açık lisans yoktur. Bu metadata bir kullanım lisansı vermez. `makale.webp` ve `tarihi-belge.webp` mevcut uygulama kaynaklarında kullanılmıyor; Antigravity/varlık sahipliği teyit edilmeden silinmedi ve warning olarak bırakıldı.

İsteğe bağlı dış bağlantı taraması:

```powershell
python tools/release-check/checker.py --target next --next-root web --require-target --external-links --timeout 5 --rate-limit 0.25
```

HEAD (405/501 için tek byte Range fallback), bağlantı başına timeout ve URL başına çalışma içi cache kullanır. Dış ağ hataları warning'dir; dış URL erişilebilirliği içerik doğruluğu değildir.

## Arşiv kayıt sözleşmesi

Denetleyici mevcut `web/lib/site-data.ts` içindeki `archiveRecords` dizisini okur; ayrıca test/gelecekteki içerik akışı için JSON kayıt dosyasını da destekler. Boş dizi gerçek durum olarak raporlanır; kayıt uydurulmaz. OpenCode/Codex kaynak dosyaları değiştirilmedi.

Her yayına açık kayıt için benzersiz `id` ve `slug`, biçimle uyumlu `date` + `datePrecision` (yıl/ay/gün/aralık), `sourceInstitution`, özgün `sourceUrl`, `sourceDescription`, telif için `license`/`copyrightStatus`, ayrı `useStatus`, `verificationStatus: "doğrulandı"` ve tamamlanmış uzman incelemesi (`expertReviewStatus`, `reviewedBy`, `reviewedAt`) gerekir. Alıntıların ayrıca `quoteSourceInstitution`, `quoteSourceUrl`, `quoteSourceDescription` bilgileri aranır. Mevcut modelle uyum için bazı alan alias'ları desteklenir; otomatik araç bir URL'ye bakıp tarihsel iddiayı doğrulanmış saymaz.

`image.isIllustrative` true veya görsel adı/altı temsili ise kayıt `fotoğraf` türünde olamaz. Taslaklardaki eksik alanlar warning/expert-review bulgusu üretir; doğrulanmamış yayımlanmış kayıt kritik hata üretir.

## Rapor ve gate anlamı

`quality_runner.py` JSON ve Markdown raporunu `release-quality.json` ve `release-quality.md` olarak üretir. CI bunları `release-quality-report` artifact'i olarak 30 gün saklar. Rapor başarılı/başarısız test sayısını, kritik hata/uyarı/uzman incelemesi sayılarını, eksik içerik ve kaynak alanlarını, güvenlik bulgularını, yayın engellerini ve kaynak doğrulama sınırlamalarını içerir.

- **CI exit 0:** test/komutlar geçti, kritik hata ve hata yok. Uyarılar raporlanır; deploy yapılmaz.
- **CI exit 1:** zorunlu `web/` yok, test/komut başarısız, kritik bulgu veya error var.
- **Üretime hazır:** bundan daha katı durumdur. Yayınlanabilir uzman incelemeli arşiv kaydı ve yetkili gerçek `NEXT_PUBLIC_SITE_URL` origin'i yoksa rapor `release_ready: false` ve yayın engeli gösterir; yerel PR CI, henüz içerik yayınlanmadı diye başarılı kod kontrollerini yapay biçimde kırmaz.
- Her iki rapor da canlı site veya arama motoru indekslenmesi iddiasında bulunmaz. DNS, gerçek alan adı ve production deploy bu workflow kapsamı dışındadır.

## Test matrisi

Dört test dosyasında **129 Python test case** bulunur; ilk görevden gelen 35 checker test korunmuştur. Yeni testler onaysız yayın, AI onaylayan, kaynak/hak/tarih hataları, katalog tekrarları, zamanlama hataları ve doğru rapor test sayımını kapsar.

| Grup | Örnekler | Beklenen |
|---|---|---|
| JSON ve kayıt bütünlüğü | Hatalı JSON, yinelenen slug/ID/içerik, boş arşiv | hata veya açık eksik içerik uyarısı |
| Tarih | takvim dışı gün, hassasiyet uyumsuzluğu, yıl/aralık, ters aralık | geçersiz tarih reddi |
| Provenans ve haklar | kaynak kurumu/URL/açıklaması, telif ve kullanım statüsü eksik | kaynak bulgusu |
| Editoryal onay | inceleme zorunlu, reviewer/tarih eksik, doğrulanmamış yayımlanmış kayıt | expert-review veya kritik gate |
| Yayın motoru | insan onayı, yetkisiz/AI yayın, geçmiş plan, eksik timezone, mükerrer aktif plan | kritik bulguda CI başarısız |
| Alıntı ve görsel | kaynaksız Atatürk alıntısı, AI görselinin fotoğraf diye sınıflandırılması | yayımlamayı engelle |
| Next.js route/a11y | eksik route/anchor, geçerli dinamik route, missing alt, adsız/boş button | hata veya geçerli durum |
| Asset/link/security | eksik TSX/CSS asset, HTTP dış bağlantı, `_blank` rel, gizli dosya/secret maskesi | hata, sırları rapora yazdırma |
| SEO ve build girdisi | title/robots/sitemap, package/lockfile, hedef yok | yapılandırma hatası; strict hedefte SKIP değil |
| Offline | dış link kontrolü kapalı, tekrarlanan URL cache | ağ isteği yok / tek cache girdisi |

Tam E2E koşusunda 5 Node web unit, 74 mevcut Node arşiv testi ve 5 viewport projesinde 16 senaryo (80 Playwright testi) çalışır. Son tam yerel koşu: **288 test geçti, 0 başarısız**; lint, typecheck, production build ve bütün uygulama/Node kontrolleri geçti. CI kapısı yine de beklenen şekilde başarısız: 62 `published` kayıt için insan editör onayı yok ve her biri insan uzman incelemesi de bekliyor (124 kritik bulgu, 68 uzman incelemesi). Ayrıca 11 içerik/asset uyarısı var; iki kullanılmayan asset de raporlanıyor. Güncel registry taramasında bağımlılık advisory'si yok.
