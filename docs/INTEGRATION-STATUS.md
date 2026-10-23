# Entegrasyon durumu — Next.js görsel v03

Tarih: 23 Ekim 2026

Entegrasyon dalı: `integration/nextjs-visual-v03`

Hedef: `main` (merge edilmedi)

## Kaynak PR ve dal durumu

| Kaynak | HEAD | Entegrasyon yöntemi | Doğrulanan durum |
| --- | --- | --- | --- |
| PR #1 — `feature/codex-app-foundation` | `8cbb1dfc43b32f1d65fa8c8bb49cf7f54ce4c26c` | `--no-ff`, merge commit `2c14958` | Açık, taslak; smoke ve Next.js CI başarılı |
| PR #2 — `feature/antigravity-visual-fidelity` | `b9d519e134875e5f7baea289d0e9db5a666d5b17` | `--no-ff`, merge commit `885a824` | Açık, taslak; smoke başarılı |

Dal `origin/main` üzerindeki `42352e6da93ee3eea1cd6d1dca1f1908f438642e` commit'inden oluşturuldu. Birleştirmelerde çatışma oluşmadı. PR #1 ve PR #2 kapatılmadı; hiçbiri `main` dalına merge edilmedi.

## Uygulanan mimari

- Üretime hazırlanacak uygulama `web/` altındaki Next.js App Router + TypeScript uygulamasıdır; kök statik prototip korunur.
- Utility bar, MKA masthead, navigasyon, dört slaytlı hero, hızlı erişim kartları, yayınlar, kronoloji, arşiv, arama penceresi ve footer gerçek bileşenlerdir.
- `/`, `/ataturk`, `/kronoloji`, `/arsiv`, `/arsiv/[slug]`, `/yayinlar` ve `/hakkimizda` rotaları vardır. Bilinmeyen arşiv kaydı 404 döndürür.
- Yayın ve günlük kronoloji verisi doğrulanana kadar açık boş durum gösterilir. Kaynaksız doğrudan Atatürk sözü veya hayalî tarih olayı yayımlanmaz.
- `error.tsx`, `not-found.tsx`, robots, sitemap, canonical ve sosyal paylaşım metadata'sı eklenmiştir. Canlı site URL'si tanımlanana kadar indeksleme kapalıdır.
- Görseller Next Image ile sunulur. Google fontları `next/font` ile derleme sırasında alınır ve uygulamada self-host edilir. `dangerouslySetInnerHTML` veya istemciye taşınan gereksiz veri katmanı yoktur.

## Asset doğrulaması

Kök `assets/` içindeki 10 WebP dosyası, adları değiştirilmeden `web/public/assets/` altına kopyalandı. Her dosyanın byte boyutu ve SHA-256 özeti kaynakla eşleşti. Yapay zekâ ile üretilen kapak görseli kullanıcı arayüzünde temsili canlandırma olarak belirtilir.

## Görsel karşılaştırma ve iyileştirme turları

Referans: `design/ONAYLANAN-TASARIM.webp` (1536×1024).

Çıktılar: `docs/screenshots/nextjs-*.png`; otomatik fark: `docs/screenshots/nextjs-reference-diff.png` ve `.json`.

1. İlk turda masaüstü yatay taşma 42–68 px ölçüldü. Masthead dekorasyonu ve kök overflow davranışı düzeltilerek beş viewport'ta taşma sıfırlandı.
2. İkinci turda arama alanı odaktayken Escape'in modalı kapatmaması ve mobil masthead ikonunun erişilebilir adını kaybetmesi düzeltildi. Mobil menü ve arama için klavye testleri eklendi.
3. Üçüncü turda onaylı kompozisyonla eşleşmesi için ana konteyner 1364 px'e, masthead 144 px'e ve masaüstü hero 414 px'e ayarlandı. Ortalama mutlak piksel farkı 27,356'dan 25,974'e; kanal farkı 32'yi aşan piksel oranı %28,047'den %25,971'e indi.

Başlık/masthead ve hero oranları referansa yaklaştırıldı. Kart ızgarası ve yayın/takvim kolonları referans ritmini izler. Yayın ve takvim içeriği ise bilerek birebir değildir: referanstaki kaynaksız örnek olaylar yerine doğrulama bekleyen boş durumlar bulunur. Font rasterizasyonu ve güvenli içerik farkları piksel metriğine dahildir.

## Test matrisi

Yerel doğrulama komutları:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`

Playwright projeleri: 1536×1024, 1440×900, 1024×768, 390×844, 360×800. Senaryolar slider, rota bağlantıları, mobil menü, arama, klavye, Escape ile kapatma, boş yayın durumu, 404, yatay taşma, tarayıcı konsolu, sayfa hatası, başarısız istek ve beklenmeyen ağ 404'lerini kapsar. Son yerel çalıştırma sonucu: 10/10 başarılı; normal gezinme akışında konsol hatası, başarısız istek veya beklenmeyen 404 yok.

## Kalan işler ve manuel kontrol listesi

- [x] PR #1 ve PR #2 HEAD/CI durumunu doğrula.
- [x] Kaynak geçmişlerini entegrasyon dalında koru.
- [x] Referansın görsel diliyle çalışan Next.js ana sayfası oluştur.
- [x] Beş viewport'ta etkileşim ve taşma testlerini çalıştır.
- [x] Statik prototipi değiştirmeden koru.
- [ ] Tarih editörü onaylı yayın, günlük olay ve arşiv kayıtlarını kaynak/lisans metadata'sıyla sağlasın.
- [ ] Canlı alan adı kararlaştırıldığında `NEXT_PUBLIC_SITE_URL` tanımlansın ve indeksleme kararı ayrı incelemeden geçsin.
- [ ] Gerçek tarihî görseller kullanılırsa lisans ve kaynak kaydı ayrıca incelensin.
- [ ] Antigravity, sonraki görsel ince ayarını bu entegrasyon dalını baz alarak ayrı dal/PR'da yapsın; aynı dosyalarda eş zamanlı çalışma yapılmasın.

Bilinen engelleyici çalışma zamanı hatası yoktur. Production deploy, DNS, hesap, Supabase, CMS, ödeme ve admin paneli bu kapsamda değildir.

`npm audit --omit=dev` üretim bağımlılıklarında 0 açık bildirdi. Tam geliştirme ağacı denetiminde, ESLint zincirinin `fast-glob` → `micromatch` → `braces` geçişli bağımlılığı için 5 yüksek önem dereceli geliştirme-zamanı bildirimi vardır. NPM'in önerdiği otomatik çözüm Next/ESLint yapılandırmasını uyumsuz bir ana sürüme düşürdüğü için uygulanmadı; CI ve üretim paketine giren bağımlılıklar etkilenmiyor. Üst paket güvenli bir geçişli sürüm yayımladığında lockfile kontrollü olarak güncellenmelidir.
