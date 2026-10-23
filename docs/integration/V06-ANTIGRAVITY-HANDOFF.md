# V0.6 — Antigravity'ye devredilen görsel ve tasarım notları

**Hazırlayan:** Claude Code (`feature/claude-v06-integration-hardening`)
**Hedef dal:** `feature/antigravity-v06-visual-polish`

Bu PR'da global CSS, CSS Module, SiteHeader, Masthead, ana sayfa hero'su, Atatürk görsel tasarımı ve animasyonlar **değiştirilmedi**. Aşağıdaki maddeler o alanlarda bulunan, Antigravity tarafından ele alınması gereken konulardır.

## 1. 320–339 px başlık çakışması (önceden bildirildi, hâlâ açık)

- **Konum:** `web/app/globals.css` (≤620 px masthead kuralları), `web/components/Masthead.tsx`.
- **Durum:** 320 px'te "ASRIN KEMALİ" yazısı arama ve arşiv düğmelerinin altına 13 px giriyor. Sayfa yatay olarak taşmıyor; sorun görsel çakışma.
- **Doğrulanmış öneri ve ölçümler:** `docs/qa/CLAUDE-V06-MASTHEAD-320-ONERI.md`. Öneri yalnız `@media (max-width: 359px)` bloğuna dokunuyor; 360 px ve üzeri değişmiyor.

## 2. Araştırma portalı bağlantısı (veri düzeltmesi yapıldı, görsel değişiklik yok)

- **Konum:** `web/components/home/ResearchHub.tsx`, `INSTITUTIONAL_PORTALS` sabiti.
- **Sorun:** Bağlantı `https://dijitalkutuphane.mkutup.gov.tr/` adresine gidiyordu. Bu alan adı DNS'te çözülmüyordu; ziyaretçi bağlantıyı açamıyordu.
- **Yapılan:** Yalnız URL dizesi, doğrulanmış resmî adresle değiştirildi: `https://dijital-kutuphane.mkutup.gov.tr/` (HTTP 200). Bileşenin yapısına ve stiline dokunulmadı.
- **Çakışma notu:** Antigravity bu dosyada değişiklik yaparsa yalnız bu tek satırda çakışma beklenir. Yeni URL korunmalı.
- **İkincil not:** `https://www.tbmm.gov.tr/tutanaklar` adresi 302 ile yönleniyor ve sonunda TBMM ana sayfasında bitiyor. Bağlantı çalışıyor, ancak derin bağlantı kayboluyor. Kurumdan güncel tutanak adresi teyit edilirse güncellenebilir.

## 3. `/kronoloji` sayfa ağırlığı

- **Durum:** `/kronoloji` filtresiz açıldığında bütün olay kayıtlarını tek seferde işliyor. HTML 203 KB, yaklaşık 1.190 DOM düğümü. Sunucu süresi uygulamanın en yüksekleri arasında.
- **Öneri:** Yıl başına gruplu, sayfalamalı ya da açılır bir düzen. Bu bir tasarım/yerleşim kararı olduğu için değiştirilmedi. Veri katmanı bunu destekler: `getPublishedArchiveRecords()` önbellekli ve dizinli.

## 4. `/ataturk` sayfa ağırlığı

- Bu PR'da veri yükü %16,9 küçültüldü (HTML 662.535 → 550.891 bayt); görsel çıktı değişmedi.
- Kalan yükün büyük kısmı, 151 kaydın tamamının zaman çizelgesinde DOM olarak işlenmesinden geliyor (yaklaşık 3.850 düğüm).
- **Öneri:** Dönem başına "devamını göster" ya da dönem içi sanal liste. Bu bir görsel/etkileşim kararı olduğu için Antigravity'ye bırakıldı.

## 5. 404 sayfası başlığı

- `/arsiv/[slug]` ve `/yayinlar/[slug]` için `dynamicParams = false` uygulandı. Bilinmeyen kayıtlar artık statik `not-found` sayfasıyla 404 dönüyor.
- Bu sayfanın `<title>` değeri varsayılan site başlığı. Önceden "Kayıt bulunamadı" görünüyordu.
- **Öneri:** `web/app/not-found.tsx` dosyasına `metadata` eklenmesi (örneğin `title: "Sayfa bulunamadı"`). Dosya tasarım alanında olduğu için değiştirilmedi. HTTP durumu doğru: 404.
