# Sprint 2 mimarisi — Next.js uygulama temeli

## Sınırlar

`web/`, statik v0.1 prototipten bağımsız bir Next.js App Router uygulamasıdır. Kök dizindeki `index.html`, `styles.css`, `app.js` ve `assets/` dosyaları bu PR'da değiştirilmez. Bu sınır, Antigravity'nin görsel sadakat çalışmasının aynı anda güvenle ilerlemesini sağlar.

## Klasör sözleşmesi

- `web/app/`: route, kök yerleşim ve yalnızca paylaşılan temel tokenlar.
- `web/components/`: sayfa bölümlerinin sunum bileşenleri. Her bölüm veri alır; veri kaynağına doğrudan erişmez.
- `web/lib/site-types.ts`: bileşenler ile veri sağlayıcılar arasındaki TypeScript sözleşmeleri.
- `web/lib/site-data.ts`: geçici, doğrulanmamış içerik göstermeyen başlangıç verisi.
- `web/tests/`: mimari sözleşmeler için Node testleri.

## Bölüm API'leri

| Bileşen | Girdi | Sorumluluk |
| --- | --- | --- |
| `UtilityBar` | tarih, alıntı | üst yardımcı alan |
| `Masthead` | başlık, motto | marka alanı |
| `Navigation` | `LinkItem[]` | ana gezinme |
| `Hero` | `HeroSlide` | tek slider karesi; temsili görsel etiketi |
| `ShortcutGrid` | `Shortcut[]` | hızlı erişim kartları |
| `Publications` | `Publication[]` | yayın listesi |
| `Chronology` | `ChronologyEntry[]` | doğrulanmış olay sıralaması |
| `Archive` | `ArchiveRecord[]` | yalnızca `doğrulandı` kayıtlarını sunma |
| `Footer` | — | bağımsız proje beyanı |
| `SearchDialog` | — | istemci taraflı erişilebilir arama kabuğu |

`ArchiveRecord` kaynak, lisans ve doğrulama statüsünü zorunlu tutar. Böylece ileriki veri/CMS katmanları eksik provenanslı kayıtları yayımlama katmanına aktaramaz. Bu sprint CMS, API veya Supabase içermez.

## Antigravity entegrasyonu

1. Antigravity, statik prototipte onaylanan her bölümün son HTML/CSS kararını tamamlar.
2. Görsel QA onayından sonra o kararlar, **yalnızca** `web/app/globals.css` ve gerekirse bölüm yanındaki CSS Module dosyasına taşınır; `web/components` prop API'leri korunur.
3. Kök `assets/` içeriği taşınmadan önce kaynak/lisans kontrolü yapılır. Next uygulamasında kullanılacak dosyalar `web/public/assets/` altına, temsili/AI etiketi korunarak kopyalanır.
4. 1440×900, 1024×768, 390×844 ve 360×800 ekran görüntüsü karşılaştırmalarından sonra statik prototipten yönlendirme/geçiş kararı ayrı bir PR'da alınır.

## Doğrulama

`web` içinde `npm run lint`, `npm run typecheck`, `npm test` ve `npm run build` çalıştırılır. `.github/workflows/nextjs-ci.yml` bu dört kontrolü Next.js değişikliklerinde GitHub Actions üzerinde tekrarlar.
