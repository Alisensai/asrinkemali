# V0.6 entegrasyon sağlamlaştırma — teknik rapor

- **Dal:** `feature/claude-v06-integration-hardening`
- **Başlangıç:** PR #22 başı `10cdbfd70e0d2c7d12ed1e71907273d9a1f92b7e`
- **Hedef:** `integration/asrinkemali-v06-release-candidate`

## 1. PR #22 CI durumu ve sınıflandırma

| İş | Sonuç | Sınıf | Açıklama |
|---|---|---|---|
| Next.js CI `verify-next-app` | Geçti | — | lint, typecheck, unit, build, e2e |
| Asrin Kemali CI `smoke` | Geçti | — | |
| Release quality | Başarısız | **E** | Teknik kontrollerin tamamı geçiyor: lint, typecheck, 34 web unit, 129 checker, 74 arşiv, build, 318 e2e, audit, kaynak denetimi. Kapı, 302 kritik bulgu nedeniyle kapalı: 151 `unauthorized-published-record`, 151 `published-without-human-review`. Bunlara ek olarak 168 uzman incelemesi gerekiyor. Gerçek insan tarih uzmanı ve editör onayı olmadan kapanamaz. Kapı gevşetilmedi; sahte onay üretilmedi. |

Takılı kalan iş yok. A–D sınıfında (kod, test altyapısı, arayüz, veri doğrulama) CI hatası yok. Aşağıdaki hatalar CI'nın yakalamadığı, bu denetimde bulunan sorunlardır.

## 2. Bulunan ve düzeltilen hatalar

| # | Sınıf | Hata | Kanıt | Düzeltme |
|---|---|---|---|---|
| 1 | Yayın motoru | Daha önce yayımlanmış bir yazı yeni bir zamana alınırsa **tekrar yayımlanıyordu**. İdempotency anahtarı `id + scheduledAt` olduğu için, zaman değişince defter kaydı eşleşmiyordu. | Yeni birim testi eski kodda başarısız | Defterde kimlik düzeyinde de engel: `publishedIds` |
| 2 | Yayın motoru | Aynı çalışmada yinelenen kimlik veya slug iki kez planlanıyordu. | Birim testi | Çalışma içi tekilleştirme |
| 3 | Yayın onayı | Gelecek tarihli ya da zamanlanan yayın saatinden sonra tarihli insan onayı kabul ediliyordu. | Birim testi | Onay `≤ şimdi` ve `≤ scheduledAt` olmalı |
| 4 | Hatalı girdi | Bozuk yapılı yayın JSON'u (eksik `authors`, `body` metin vb.) `validatePublication` içinde TypeError fırlatıyordu. `/yayinlar`, site haritası ve dry-run çöküyordu. | Birim testi (7 bozuk girdi) | Yapı denetimi; `isPubliclyVisible(null)` güvenli |
| 5 | Hatalı girdi | Okunamayan tek bir yayın dosyası derlemeyi düşürüyordu. Aynı slug'a sahip iki yayın varsa çakışıyordu. | Kod incelemesi | Dosya atlanır ve günlüğe yazılır; slug tekilleştirilir; dry-run `unreadable` raporlar |
| 6 | URL doğrulama | Kaynakça denetimi yalnız `https://` önekine bakıyordu: `https://`, boşluklu adres ve `kullanici:sifre@` kabul ediliyordu. | Birim testi | `URL` ayrıştırma; host zorunlu, kimlik bilgisi ve boşluk yasak |
| 7 | Mantık | `/tarihte-bugun?ay=2&gun=31` takvimde olmayan 31 Şubat'ı kabul edip "31.2" başlığını gösteriyordu. | Tarayıcı ve e2e | `isValidMonthDay`; geçersiz tarihte uyarı gösterilir ve bugüne dönülür; kütüphane geçersiz tarihi reddeder |
| 8 | Veri bütünlüğü | Yayın ayrıntısı `relatedArchiveIds` alanındaki **kimlikleri** slug araması ile çözüyordu. Bugün yalnız `id == slug` tesadüfü sayesinde çalışıyordu. | Kod incelemesi | `getPublishedArchiveRecordById` |
| 9 | Kırık bağlantı | Ana sayfa araştırma portalındaki `dijitalkutuphane.mkutup.gov.tr` adresi DNS'te çözülmüyordu. | `curl`: Could not resolve host | Doğrulanmış resmî adres: `dijital-kutuphane.mkutup.gov.tr` (200) |
| 10 | Güvenlik | Güvenlik başlıkları yoktu; `X-Powered-By: Next.js` sürüm bilgisini sızdırıyordu. | `curl -I` | `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, `COOP`; `poweredByHeader: false` |
| 11 | Güvenlik / performans | Bilinmeyen `/arsiv/*` ve `/yayinlar/*` slug'ları isteğe bağlı sunucu render'ı tetikliyordu. | Kod incelemesi | `dynamicParams = false`: yalnız derlemede üretilen kayıtlar sunulur |
| 12 | Güvenlik | Arşiv ayrıntısındaki gömülü görsel URL'si için protokol denetimi yoktu. | Kod incelemesi | Yalnız `https://` görseller gömülür (veri doğrulayıcısına ek katman) |

## 3. Performans (önce → sonra, aynı makinede, `next start`)

| Ölçüm | Önce | Sonra |
|---|---:|---:|
| `/ataturk` HTML | 662.535 B | **550.891 B (−%16,9)** |
| `/ataturk` istemci veri yükü (JSON) | 311.505 B | yaklaşık %26 daha küçük (birim testiyle en az %15 güvence altında) |
| Arşiv slug/kimlik araması | Her çağrıda 168 kaydı süzme + doğrusal arama | Önbellekli dizin, O(1) |
| İstemci JS parçaları (`.next/static/chunks`) | 744.557 B | 744.951 B (+394 B, paket açma fonksiyonu) |
| Production build | 21 sn | 26 sn (makine yükü; derleme adımı farkı ölçüm gürültüsü içinde) |
| Statik sayfa sayısı | 163 | 163 |
| Yanıt süresi medyanı (`/ataturk`, `/arsiv`) | yaklaşık 17 ms / yaklaşık 16–25 ms | yaklaşık 17 ms / yaklaşık 15–17 ms (gürültü içinde; iyileşme iddia edilmez) |
| Sunucu çalışma belleği (aynı istek seti sonrası) | yaklaşık 221 MB | yaklaşık 127 MB (tek ölçüm; gösterge niteliğinde) |

Görsel çıktı değişmedi: `unpack(pack(kayıtlar))` birebir eşit (birim testi). Atatürk e2e testleri geçti.

## 4. Millî Kütüphane HTTP 400 bağlantıları

| Kayıt (reviewed) | URL | Bugünkü sonuç |
|---|---|---|
| `milli-kutuphane-inonu-diyor-ki-1933` | `.../catalog/details/105276` | 200; sayfa başlığı "İnönü diyor ki" ile eşleşiyor |
| `milli-kutuphane-ataturk-ve-canakkale-2006` | `.../catalog/details/109289` | 200; "Atatürk ve Çanakkale" ile eşleşiyor |
| `milli-kutuphane-ataturk-donemi-maliye-politikasi-1982` | `.../catalog/details/136684` | 200; "Atatürk dönemi maliye politikası" ile eşleşiyor |

HEAD, GET, `Range` ve tarayıcı/bot kullanıcı ajanlarıyla yapılan tüm denemeler ve projenin kendi `source_links` denetleyicisi **200** döndürdü.

**Sonuç:** PR #22'deki 400 yanıtları kırık bağlantı ya da katalog adresi değişikliği değil. Geçici ya da ortama bağlı bir erişim kısıtı (sınıf F; CI ağı veya hız sınırlaması). Kayıtlar ve belge kimlikleri değiştirilmedi; alternatif URL gerekmiyor.

**Öneri:** Kaynak denetleyicisi 400 yanıtını tek denemede "kırık" saymamalı. Bu tür yanıtlar bir kez yeniden denenip "geçici erişim" olarak raporlanmalı. Değişiklik Copilot/editoryal araç alanında olduğu için yapılmadı.

## 5. Güvenlik incelemesi özeti

| Alan | Durum |
|---|---|
| XSS | React kaçışlama; `dangerouslySetInnerHTML` yok. `/arsiv?q=<script>` ve `/yayinlar` sorgu parametreleri kaçışlanıyor (e2e). |
| URL doğrulama | Arşiv: `validateExternalUrl` (doğrulayıcı). Yayın: `isSafeHttpsUrl` (yeni). Görsel: yalnız https. |
| Güvensiz yönlendirme | Kullanıcı girdisiyle yönlendirme yok. |
| SSRF | Uygulama dış istek atmıyor. Kaynak denetleyicisi DNS ile genel IP denetimi yapıyor ve yönlendirme izlemiyor. |
| Path traversal | Slug regex'i + `dynamicParams = false`; dosya yolları sabit (e2e: `..%2F..` → 404). |
| Yayın onayı atlatma | Yalnız `published` + doğrulanmış insan onayı görünür. Zamanlayıcı onay zamanını denetliyor. Tekrar yayın kimlik düzeyinde engelli. |
| Yönetim sayfası | Uygulamada yönetim rotası yok; editoryal araçlar yerel CLI. |
| Dış bağlantılar | Tümü `target=_blank` + `rel="noopener noreferrer"` (e2e). |
| Bağımlılıklar | `npm audit`: kök, web ve web `--omit=dev` için 0 açık. |

**Kalan riskler:**
- CSP yok; Next.js satır içi betikleri için nonce altyapısı gerekiyor (MKA FORTRESS kapsamı).
- HSTS yok; yalnız HTTPS önizleme ve canlı alan adında açılmalı.
- İnsan onayı içerikle kriptografik olarak bağlı değil: onaydan sonra metin değişirse yeniden onay zorunlu tutulmuyor. V0.7 için içerik özeti (hash) önerilir.
- Hız sınırlama ve WAF yok (barındırma katmanı).

## 6. İnsan onayı nedeniyle engellenen yayın işlemleri

- 151 `published` arşiv kaydı: insan tarih uzmanı incelemesi ve ayrı insan editör yayın onayı yok. Release Quality kapısı bu nedenle bilinçli olarak kapalı. Kayıtlar silinmedi; durumları değiştirilmedi.
- 16 `reviewed` ve 1 `draft` kayıt yayın kapısı dışında. Ayrıntı sayfaları 404 döner (e2e ile doğrulandı).
- Yayın içerikleri: `content/publications/records` boş. İnsan editör onaylı yayın yok; dry-run boş plan üretiyor.
- İnceleme formları otomatik onaylanmadı.

## 7. Production sunucusunda `net::ERR_ABORTED` (site.spec)

İlk kez üretim sunucusuna (`next start`) karşı koşulan tam pakette `site.spec › ana sayfa etkileşimleri` 5 görünümde başarısız oldu. Kanıt toplayan geçici bir testle (commitlenmedi) her başarısız isteğin şu özellikleri taşıdığı doğrulandı:

- `resourceType: fetch`, navigasyon isteği değil, GET, aynı köken
- `_rsc` sorgu parametresi; `rsc: 1` ve `next-router-prefetch: 1` başlıkları (çoğunda `next-router-segment-prefetch: /_tree`)
- `errorText: net::ERR_ABORTED`
- Sayfa hiçbir anda `/` dışına çıkmadı; console ve pageerror yok; aynı turda 6–15 `_rsc` isteği başarıyla tamamlandı

Tetikleyici adımlar: hero slaytının değişmesi, ArrowRight ve mobilde menünün açılması. **Neden:** Next.js yönlendiricisi, DOM'dan kalkan `<Link>` öğelerinin prefetch isteklerini iptal ediyor. Bu bir sayfa navigasyonundan kaynaklanmıyor. Geliştirme sunucusu prefetch yapmadığı için CI bu durumu hiç görmedi. **Sınıf:** B (test altyapısı); uygulama hatası değil.

**Düzeltme** (`web/e2e/support/network.ts`, `site.spec.ts`): Bir istek yalnız yukarıdaki koşulların **tamamı** birlikte sağlanırsa başarısızlık listesinden ayrılır. Ayrılan istekler gizlenmez:

- test notu olarak kaydedilir;
- sayfanın `/` üzerinde kaldığı doğrulanır;
- iptal edilen her hedef rota ayrıca istenip 200 döndüğü kanıtlanır.

Console, pageerror, 404 ve hidrasyon denetimleri değişmedi. `e2e/network-filter.spec.ts` içinde 14 negatif sınıflandırıcı örneği ve 3 gerçek tarayıcı testi bulunuyor. Bu testler şunları doğruluyor:

- `ERR_FAILED`, `ERR_CONNECTION_REFUSED`, DNS hatası, prefetch başlığı olmayan RSC isteği, belge, betik, görsel, POST ve farklı köken raporlanmaya devam eder;
- yalnız gerçek prefetch iptali ayrılır.

## 8. Test sonuçları (bu dal)

| Paket | Sonuç |
|---|---|
| `npm ci` (kök + web) | başarılı |
| TypeScript / ESLint (app, components, lib, tests, e2e) | temiz |
| Production build | başarılı, 163 sayfa (151 arşiv ayrıntısı statik) |
| Web unit | **41/41** (34 mevcut + 7 yeni) |
| Arşiv motoru (Node) | **74/74** |
| Arşiv şema doğrulaması | 168 kayıt, 0 hata (önceden bilinen tarih ve hak uyarıları) |
| Release checker (Python) | **129/129** |
| Editoryal araçlar (Python) | **44 geçti**, 1 opsiyonel dış snapshot atlandı |
| Playwright Chromium, **production sunucusu**, 5 görünüm | **347 geçti, 0 başarısız**, 58 koşullu atlama |
| Firefox (production; site + hardening, masaüstü ve mobil) | tümü geçti |
| WebKit (production) | hardening testleri geçti; `site.spec` 2 başarısız (aşağıda) |
| `npm audit` (kök, web, web `--omit=dev`) | 0 açık |
| Yayın dry-run tekrar çalıştırma | birebir aynı çıktı; depoya yazma yok |

**Kalan bilinen test sorunu — WebKit klavye:** `site.spec` ilk `Tab` tuşunda "İçeriğe geç" bağlantısının odaklanmasını bekliyor. WebKit, Safari geleneği gereği varsayılan olarak `Tab` ile bağlantılara odaklanmıyor. Uygulama kodu içermeyen boş bir sayfada da WebKit `Tab` ile bağlantıyı atlayıp düğmeye gidiyor, Chromium bağlantıya odaklanıyor. Bu bir uygulama hatası ya da bu dalın regresyonu değil. Testin WebKit beklentisi ayrıca kararlaştırılmalı; örneğin WebKit'te `Alt+Tab` yerine programatik odak denetimi. Talimat gereği bu doğrulama gevşetilmedi.

**Ekran görüntüleri:** Test koşuları 24 paylaşılan ekran görüntüsünü yeniden üretti ve 2 Firefox görüntüsü ekledi. Bunlar teslimat değil; geri alındı ve commitlenmedi.
