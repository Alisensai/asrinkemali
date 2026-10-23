# Asrın Kemali — Geliştirme planı ve sorumluluklar

## Nihai amaç
Onaylanan ekranın görsel kompozisyonunu mümkün olan en yüksek doğrulukla yeniden kurmak; aynı zamanda mobil erişilebilirlik, kaynaklı arşiv, düşük maliyetli barındırma ve ileride CMS'ye evrilme imkânı.

## Marka / tasarım tokenları
- İsim: **ASRIN KEMALİ**; monogram: **MKA**; motto: **BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI**.
- Renkler: `#0b0a09` gece siyahı, `#260707` bordo, `#6a0e13` vurgu kırmızısı, `#d1a36d` altın, `#f4e8d6` kırık beyaz.
- Başlık: serif; küçük navigasyon: serif; yardımcı arayüz: sans serif.
- Referans: `design/ONAYLANAN-TASARIM.webp` (1536×1024). Yapay zekâ referansında fiziksel olarak imkânsız görüntü / okunamayan metin olabilir; bu ayrıntıları işlevsel, doğru karşılıklarıyla düzeltin.

## Mimari karar
**V0.1** bağımsız HTML/CSS/JS (sıfır bağımlılık), anında görüntülenebilir. **V0.2** Next.js App Router + TypeScript bileşenlerine **testli göç**; tasarımın bozulmaması zorunlu. **V0.3** CMS/veritabanı (gerekirse Supabase), doğrulanmış veri modeli, yönetim paneli.

## İş dağılımı (aynı dosyada çakışma yok)
| Ajan | İş | Dal önerisi | Çıktı |
|---|---|---|---|
| Antigravity | Ekran birebir UI ve responsivity | `feature/antigravity-visual-fidelity` | Bölümlendirilmiş React bileşenleri ve ekran karşılaştırmaları |
| Codex | Next.js/TS kurulum, veri sözleşmeleri, CI, test altyapısı | `feature/codex-app-foundation` | Çalışan build/test ve doküman |
| OpenCode | Tarihî arşiv veri modeli ve arama prototipi, **kaynaklı** | `feature/opencode-archive` | JSON schema, filtreden geçen demo kayıtlar |
| Kilo Code | Mobil UX, a11y, hız auditleri | `feature/kilo-mobile-a11y` | Erişilebilirlik raporu, mobil test ve düzeltmeler |
| Cline | Kod inceleme / bağımlılık ve güvenlik kontrolü | `feature/cline-quality-check` | Audit ve testler; doğrudan main'e yazmaz |
| Copilot | Günlük kod yardımı, küçük testler ve dokümantasyon | `feature/copilot-tests-docs` | Test/dokümantasyon PR'ları |
| ChatGPT | Sistem tasarımı, koordinasyon ve görsel kabul | İnceleme | İnceleme, revizyon planı, görsel QA |

## Sprint 0 — İlk kurulum (bugün)
- [x] Referans ve markayı varlıklara dönüştür.
- [x] İşlevli ilk HTML/CSS/JS prototip oluştur.
- [x] Responsive ekran ve etkileşimleri kontrol et.
- [ ] Ayrı GitHub deposu aç, dosyaları ana dala ilk kez aktar.
- [ ] Her ajana doğru repo klasörünü aç ve farklı branch ver.

## Sprint 1 — Görsel sadakat
- [ ] 1536x1024 ref vs gerçek ekran kıyas: üst bar, header, nav, hero, hızlı kartlar, yayınlar, kronoloji.
- [ ] Yazı ölçüleri, kenar boşlukları, kırpma/kontrast, altın çizgiler.
- [ ] 390px mobil menü, hero, tile sıralaması, yerleşim ve overflow.
- [ ] Kapak görselinin yüksek çözünürlüklü orijinal üretimi; kaynaklı gerçek tarihî fotoğraflar ayrıca eklenecek.

## Sprint 2 — Üretim altyapısı
- [ ] Next.js App Router + TS + component architecture.
- [ ] Lint, TypeScript check, Playwright tests, CI.
- [ ] Arşiv data interface: id,title,type,date,description,source,license,image,verificationStatus.
- [ ] Kaynaksız içerikleri yayımlamayı engelleyen editör iş akışı.
- [ ] Güvenli, düşük maliyetli hosting ve DNS bağlantısı.

## Sprint 3 — İçerik ve ürün
- [ ] Arşiv filtresi, arama, belge/fotoğraf detay sayfaları.
- [ ] Nutuk/kütüphane kaynak bağlantıları; lisans denetimi.
- [ ] Yönetim paneli, taslak/onay/yayın statüleri, düzeltme geçmişi.
- [ ] Türkçe içerik, İngilizce için ayrı çevrilmiş kayıtlar.

## İşleyiş
Yeni görev -> ayrı branch -> PR -> otomatik test -> ekran karşılaştırması -> kod inceleme -> merge. Ajanların altı tanesi aynı anda aynı `index.html` veya `styles.css` dosyasını değiştirmeyecek. İlk etapta Antigravity ve Codex paralel çalışırken OpenCode veri belgeleri, Kilo testlerle ilgilenir; Copilot/Cline kalite kontrol için sonradan devreye girer.
