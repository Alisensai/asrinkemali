# Sprint 3 mimarisi — Next.js üretim hedefi

## Sınırlar

`web/`, üretime hazırlanacak Next.js App Router uygulamasıdır. Kök dizindeki `index.html`, `styles.css`, `app.js` ve `assets/` dosyaları görsel karşılaştırma ve geriye dönük inceleme için korunur. Yeni özellikler `web/` üzerinde geliştirilir; statik sürüm bu entegrasyonda silinmez veya üretim girişi sayılmaz.

## Klasör sözleşmesi

- `web/app/`: route'lar, SEO metadata'sı, hata/404 sınırları ve paylaşılan temel stiller.
- `web/components/`: sayfa bölümlerinin sunum bileşenleri. Her bölüm veri alır; veri kaynağına doğrudan erişmez.
- `web/lib/site-types.ts`: bileşenler ile veri sağlayıcılar arasındaki TypeScript sözleşmeleri.
- `web/lib/site-data.ts`: geçici, doğrulanmamış içerik göstermeyen başlangıç verisi.
- `web/tests/`: mimari sözleşmeler için Node testleri.
- `web/e2e/`: beş ekran boyutunda Playwright etkileşim, erişilebilirlik, taşma ve ağ kontrolleri.
- `web/public/assets/`: kök `assets/` dosyalarının ad ve içerik özdeş Next.js kopyaları.

## Bölüm API'leri

| Bileşen | Girdi | Sorumluluk |
| --- | --- | --- |
| `UtilityBar` | tarih, alıntı | üst yardımcı alan |
| `Masthead` | arama olayı | MKA marka alanı ve arşiv eylemleri |
| `Navigation` | `LinkItem[]` | ana gezinme |
| `Hero` | `HeroSlide[]` | dört panelli klavye kontrollü slider; temsili görsel etiketi |
| `ShortcutGrid` | `Shortcut[]` | hızlı erişim kartları |
| `Publications` | `Publication[]` | yayın listesi |
| `Chronology` | `ChronologyEntry[]` | doğrulanmış olay sıralaması |
| `Archive` | `ArchiveRecord[]` | yalnızca `doğrulandı` kayıtlarını sunma |
| `Footer` | — | bağımsız proje beyanı |
| `SearchDialog` | `SearchItem[]` | istemci taraflı erişilebilir sayfa/bölüm araması |

`ArchiveRecord` kaynak, lisans ve doğrulama statüsünü zorunlu tutar. Böylece ileriki veri/CMS katmanları eksik provenanslı kayıtları yayımlama katmanına aktaramaz. Bu sprint CMS, API veya Supabase içermez.

## Antigravity entegrasyonu

1. Antigravity sonraki görsel ince ayarı için `integration/nextjs-visual-v03` dalını baz alır; aynı dosyalar eş zamanlı değiştirilmez.
2. Görsel kararlar `web/app/globals.css` ve ilgili `web/components/` bileşeninde uygulanır; veri arayüzleri korunur.
3. Yeni tarihî görsel eklenmeden önce kaynak, lisans ve temsil niteliği doğrulanır. Mevcut AI görsellerinin kullanıcıya görünen temsili etiketi kaldırılmaz.
4. 1536×1024, 1440×900, 1024×768, 390×844 ve 360×800 ekran görüntüleri yeniden üretilir; `scripts/visual_diff.py` yalnızca yardımcı bir sapma metriği verir.
5. Statik prototipten üretim yönlendirmesi/deploy ayrı bir onay ve PR gerektirir.

## Doğrulama

`web` içinde `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` ve `npm run test:e2e` çalıştırılır. `.github/workflows/nextjs-ci.yml` bu kontrolleri ve Chromium kurulumunu Next.js değişikliklerinde GitHub Actions üzerinde tekrarlar.
