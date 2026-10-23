# 320 px site başlığı çakışması — düzeltme önerisi

**Hazırlayan:** Claude Code (PR #17, `feature/claude-ataturk-experience-v06`)
**Durum:** Öneri. Bu PR'da **uygulanmadı**, çünkü ilgili dosyalar başka ajanın alanında.
**Etkilenen dosyalar:** `web/app/globals.css` (≤620 px masthead kuralları), `web/components/Masthead.tsx`. Açık PR #11 de `globals.css` dosyasını değiştiriyor.

## Bulgu

Sitenin ortak başlığında 340 px'ten dar ekranlarda "ASRIN KEMALİ" yazısı ve slogan, sağdaki arama ve arşiv düğmelerinin altına giriyor. Sorun yalnız `/ataturk` sayfasında değil, tüm sayfalarda var. Sayfa yatay olarak taşmıyor; sorun yalnız görsel çakışma.

Ölçüm (Chromium, `/ataturk`, mevcut `integration/asrinkemali-v05-release-candidate` CSS'i):

| Genişlik | Marka metni sağ kenarı | Düğmelerin sol kenarı | Çakışma |
|---:|---:|---:|---|
| 320 px | 243 | 230 | **13 px** |
| 340 px | 250 | 250 | yok (sınırda) |
| 360 px | 254 | 270 | yok |
| 390 px | 261 | 300 | yok |

Kök neden: ≤620 px kuralında `.identity-name` en az 19 px (`clamp(19px, 5.5vw, 26px)`), arma 58 px ve `.identity-motto` en fazla 170 px genişliğinde. Bu metinler satır kırmadığı için `.identity` daraldığında küçülemiyor. Sağdaki düğmeler `flex-shrink: 0` olduğu için metin onların altına kayıyor.

## Önerilen düzeltme (yalnız 359 px ve altı)

`web/app/globals.css` içinde, mevcut `@media (max-width: 620px)` bloğundan **sonra**:

```css
@media (max-width: 359px) {
  .identity { gap: 6px; }
  .identity-crest-wrapper, .identity-crest { width: 46px; height: 46px; }
  .identity-name { font-size: 17px; letter-spacing: 0.6px; }
  .identity-motto { max-width: 150px; font-size: 7px; }
  .masthead-actions { gap: 4px; }
}
```

- 360 px ve üzeri görünüm değişmez. Ekran görüntüsü regresyonu oluşmaz.
- Düğmelerin 36 px dokunma alanı korunur; düğmeler küçültülmez.
- `Masthead.tsx` için değişiklik gerekmez.

## Doğrulama (öneri tarayıcıda yalnız simüle edildi, depoya yazılmadı)

| Genişlik | Marka metni sağ kenarı | Düğmelerin sol kenarı | Sonuç |
|---:|---:|---:|---|
| 320 px | 220 | 232 | 12 px boşluk, çakışma yok |
| 340 px | 220 | 252 | çakışma yok |
| 359 px | 220 | 275 | çakışma yok |
| 360 px | 254 | 270 | değişmedi |

Simülasyon sırasında `scrollWidth` her genişlikte görünüm genişliğine eşit kaldı.

- Önce: `docs/screenshots/v06-masthead-320-mevcut.png`
- Sonra (simülasyon): `docs/screenshots/v06-masthead-320-oneri-simulasyonu.png`

## Önerilen test

Ortak QA paketine (Kilo) eklenebilir:

```ts
for (const width of [320, 340, 359]) {
  await page.setViewportSize({ width, height: 700 });
  const name = await page.locator(".identity-copy").boundingBox();
  const actions = await page.locator(".masthead-actions").boundingBox();
  expect(name!.x + name!.width).toBeLessThanOrEqual(actions!.x);
}
```
