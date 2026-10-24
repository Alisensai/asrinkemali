# PR: MKA 26 IMMERSIVE MUSEUM — GÜVENLİ SERGİ KAPISI, GERÇEK KAYNAK VE ERİŞİLEBİLİR 3D DENEYİM

## 🎯 Amaç ve Kapsam
PR #27'de hazırlanan MKA Immersive Museum platformunun (`/sergiler` ve `/sergiler/[slug]`) güvenlik, yayın kapısı ve editoryal şeffaflık zafiyetlerinin giderilmesi; gerçek arşiv bağlantılarıyla çalışan 3D Sanal Galeri Odası, Liste Modu ve Kaynak Denetçisi bileşenlerinin sertleştirilmesi.

---

## 🔒 Çözülen Güvenlik & Şeffaflık Zafiyetleri
1. **Production Staging Sızıntısı Engellendi:**
   - `repository.ts` içinde `allowStaging = !isProd && Boolean(filters?.includeStaging)` mantığı işletilerek `NODE_ENV === "production"` altında staging içeriği tamamen kilitlendi. `ALLOW_STAGING_EXHIBITIONS=1` veya parametrelerle üretim kapısı aşılamaz.
2. **Slug Gölgelemesi (Fail-Closed Quarantine):**
   - Staging klasöründeki taslakların yayındaki yayınlanmış sergilerin üzerine yazması engellendi. Çakışan slug durumunda yayınlanan sergi korunur, taslak karantinaya alınır.
3. **Koşulsuz Rozetler Kaldırıldı:**
   - `SourceInspector.tsx` bileşenindeki sabit "BİRİNCİL TARİHÎ KAYNAK" ve "DOĞRULANMIŞ KAYNAK" etiketleri kaldırıldı. Yerine tarafsız `KATALOG KAYDI`, dinamik `DOĞRULANMIŞ KAYNAK` / `İNCELEME BEKLİYOR` ve `TEMSİLÎ GÖRSEL` rozetleri getirildi.
4. **Klavye & A11y Sertleştirmesi:**
   - `SourceInspector` çekmecesinde `role="dialog"`, `aria-modal="true"`, focus trap (`Tab`/`Shift+Tab`) ve `Escape` tuşuyla tetikleyiciye odak restorasyonu sağlandı.
5. **Görünür Taslak Uyarısı:**
   - Editoryal inceleme aşamasındaki sergiler için `TASLAK — İNSAN İNCELEMESİ YOK` başlık uyarısı eklendi.
6. **Kamuya Açık Boş Durum:**
   - `/sergiler` dizininde yayınlanmış içerik bulunmadığında `/arsiv` ve `/donemler` bağlantıları içeren erişilebilir boş durum kartı (`exhibitions-empty-state`) geliştirildi.

---

## 📁 Etkilenen Dosyalar
- `content/exhibitions/staging/` (`cumhuriyetin-ilani.json`, `milli-mucadele-ve-meclis.json`)
- `web/lib/exhibitions/` (`repository.ts`, `workflow.ts`, `types.ts`)
- `web/components/exhibitions/` (`SourceInspector.tsx`, `ExhibitionView.tsx`, `VirtualGalleryRoom.tsx`, `DocumentShowcase.tsx`, `ExhibitionFilterBar.tsx`, `ExhibitionsDirectoryClient.tsx`, `ExhibitionCard.tsx`, `exhibitions.module.css`)
- `web/app/sergiler/page.tsx`
- `web/app/sergiler/[slug]/page.tsx`
- `web/lib/site-data.ts` (Sergiler rotası ve arama entegrasyonu)
- `web/tests/exhibitions.test.mjs` (Genişletilmiş 15 güvenlik & kapı testi)
- `web/playwright.museum-v08.config.ts` (Port 4442 yapılandırması)
- `web/e2e/exhibitions.spec.ts` (9 viewport E2E testleri)
- `docs/exhibitions/V08-MUSEUM-HARDENING.md`

---

## 🧪 Çalıştırılan Komutlar ve Test Sonuçları
1. **Birim Testleri (`node --test web/tests/exhibitions.test.mjs`):**
   - 15/15 PASS (T-26-001 - T-26-023 güvenlik ve iş akışı testleri)
2. **Çalışma Alanı Testleri (`npm test`):**
   - 329/329 PASS (0 hata, 0 atlanan)
3. **AnyCoder Testleri (`node --test web/tests/anycoder-prototype.test.mjs`):**
   - 70/70 PASS
4. **Playwright E2E (`npx playwright test --config=playwright.museum-v08.config.ts` — Port 4442):**
   - 18/18 PASS across 9 viewports (320px–1536px), 0 horizontal overflow
5. **TypeScript Kontrolü (`npm run typecheck`):** 0 hata
6. **Linter Kontrolü (`npm run lint`):** 0 hata, 0 uyarı
7. **Next.js Production Build (`npm run build`):** 170 statik rota başarıyla üretildi
8. **Arşiv Doğrulaması (`node scripts/archive/validate.mjs`):** 168 kayıt, 151 yayınlandı, 0 hata

---

## 📱 Ekran Görüntüleri (docs/screenshots/ & brain artifacts)
- `v08-museum-directory-desktop-1536x1024.png`
- `v08-museum-desktop-1536x1024.png`
- `v08-museum-directory-mobile-390x844.png`
- `v08-museum-mobile-390x844.png`
- `v08-museum-directory-mobile-320x568.png`
- `v08-museum-mobile-320x568.png`
- (Toplam 18 ekran görüntüsü 9 viewport için üretilmiştir)

---

## ⚠️ Kalan Eksikler / Sonraki Görevler
- 302 numaralı sürüm kalitesi kapısı (gerçek insan tarihçi ve editör ıslak imzalı onayı) bağımsız editoryal kurula aittir; sahte onay üretilmemiştir.
- Sıradaki Görev: Görev 27 (Yayınlar ve Tarihte Bugün Deneyimi).
