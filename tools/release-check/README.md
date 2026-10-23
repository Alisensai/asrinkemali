# Release check

Bağımlılıksız Python 3 sürüm hazırlık denetleyicisi. Statik HTML ve isteğe bağlı Next.js hedeflerini kontrol eder; yerel URL/anchor, SEO metadata, AI temsili görsel açıklaması, görsel alt metni, düğme etiket/işlev sinyalleri, JSON veri bütünlüğü, kaynaklı alıntılar, lisans metadata'sı, kritik dosyalar ve eşik üstü dosyaları raporlar. Git branch/diff ve npm lockfile tutarlılığını da özetler.

## Çalıştırma

Repo kökünden Python 3.10+ ile:

```powershell
python tools/release-check/checker.py --target static
python tools/release-check/checker.py --target next --next-root apps/web
python tools/release-check/checker.py --target both --static-root . --next-root apps/web
python -m unittest discover -s tools/release-check/tests -v
```

Bir hedef dizini veya beklenen uygulama ağacı yoksa rapor `SKIP (belirtilen dalda yok)` yazar. Raporlar varsayılan olarak `release-check-reports/release-check.json` ve `release-check-reports/release-check.md` konumundadır; `--output-dir` ile değiştirilebilir. Çalışma ağacında generated report dosyaları tutulmamalıdır.

### Parametreler

| Parametre | Varsayılan | İşlev |
|---|---|---|
| `--target static\|next\|both` | `both` | Kontrol hedefi |
| `--static-root PATH` | `.` | Statik prototip kökü |
| `--next-root PATH` | `next` | Next.js proje kökü |
| `--external-links` | kapalı | Yalnızca seçilirse dış URL'lere rate-limited HEAD/GET isteği |
| `--timeout SEC` | `5` | Her dış bağlantı için zaman aşımı |
| `--rate-limit SEC` | `0.25` | İstekler arasında minimum bekleme |
| `--max-file-mb MB` | `5` | Büyük dosya uyarı eşiği |
| `--fail-on none\|warning\|error` | `none` | Hata/uyarı bulgularında CI exit code 1 |

Exit code: `0` rapor üretildi ve seçilen gate'i geçti; `1` `--fail-on` seviyesi aşıldı; `2` rapor yazılamadı. Varsayılan rapor modu kalite bulgularını gösterir ama eski prototipteki iyileştirme işlerini CI hatasına dönüştürmez. Gate'i sıkılaştırmadan önce bulgular temizlenmelidir.

## Ağ ve gizlilik

Varsayılan testler/çalıştırma ağ kullanmaz ve deterministiktir. `--external-links` açılırsa hedef URL'lere harici HTTP istekleri yapılır; timeout ve rate limit kullanılır, aynı URL tek çalıştırmada cache edilir. Dış ağ hataları uyarıdır. Hiçbir servis, API key, token veya ödeme hesabı gerekmez.

Rapor, domain/DNS/prod durumu veya arama motoru indekslenmesi iddiasında bulunmaz. `canonical`, robots, sitemap ve Open Graph görseli eksikleri SEO uyarısıdır. Yayın alan adı doğrulanıp yapılandırılana kadar canonical URL üretmeyin veya varsayılan gerçek domain eklemeyin.

## Test matrisi

`tests/test_checker.py` unittest testleri; hata, geçerli/eksik girdiler ve offline davranışı kapsayan 35 case:

| # | Senaryo | Beklenti |
|---:|---|---|
| 1 | Hatalı JSON | `invalid-json` |
| 2 | Yinelenen slug | `duplicate-slug` |
| 3 | JSON kaynaksız quote | `unsourced-quote` |
| 4 | JSON kaynaklı quote | Bulgu yok |
| 5 | HTML kaynaksız blockquote | `unsourced-quote` |
| 6 | `cite` özniteliği olan blockquote | Bulgu yok |
| 7 | Bozuk sayfa içi anchor | `broken-anchor` |
| 8 | Geçerli anchor | Bulgu yok |
| 9 | Eksik rota / 404 hedefi | `broken-route` |
| 10 | Geçerli yerel rota | Bulgu yok |
| 11 | Alt metinsiz görsel | `missing-image-alt` |
| 12 | Eksik yerel görsel | `broken-resource` |
| 13 | Eksik CSS arka plan görseli | `broken-resource` |
| 14 | Eksik OG görseli | `broken-og-image` |
| 15 | Boş alt açıklama | `missing-image-alt` |
| 16 | Sayfa title eksik | `missing-title` |
| 17 | Description/robots/canonical/OG eksik | SEO bulguları |
| 18 | Sitemap eksik | `missing-sitemap` |
| 19 | Robots dosyasında Sitemap bildirimi | Sitemap mevcut |
| 20 | Etiketsiz düğme | `unlabeled-button` |
| 21 | İşlev sinyali olmayan düğme | `button-without-action` |
| 22 | JavaScript listener'ı olan düğme | Bulgu yok |
| 23 | Devre dışı düğme | Etkisiz düğme hatası yok |
| 24 | Temsili AI açıklaması eksik | `missing-ai-disclosure` |
| 25 | Temsili AI açıklaması mevcut | Bulgu yok |
| 26 | Olmayan Next hedefi | SKIP |
| 27 | Next.js kaynak rotası bozuk | `broken-route` |
| 28 | Next.js kaynak rotası geçerli | Bulgu yok |
| 29 | Next.js dinamik rota | Var olan `[slug]` rotası eşleşir |
| 30 | Next.js kaynak anchor'ı bozuk | `broken-anchor` |
| 31 | Büyük dosya eşiği | `large-file` |
| 32 | Repo dışına kaçan yerel URL | Kapsam dışı hedef |
| 33 | Offline dış URL | Ağ isteği yok |
| 34 | Tekrarlanan dış URL cache | Tek cache kaydı |
| 35 | Markdown raporu | Bulgu rapora yansır |

Testler repo kökünden Python standard library ile çalışır.
