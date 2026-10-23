# ASRIN KEMALİ V0.5 Entegrasyon Durumu

## Kaynaklar

V0.5 dalı `integration/nextjs-visual-v03` (`beea720`) tabanından oluşturuldu. Aşağıdaki taslak PR dalları geçmişleri korunarak `--no-ff` ile birleştirildi:

- PR #6 / `85a45e3`: Copilot yayın kalite kapıları ve 91 Python testi.
- PR #7 / `e91db72`: Kilo 10 viewport mobil/regresyon paketi.
- PR #8 / `5181a08`: onaylı tasarım referansına göre Next.js görsel iyileştirmeleri.
- PR #9 / `a5a147e`: PR #5 temelini de içeren 68 kayıtlık kurumsal kaynak kataloğu.

PR #4 bu dalın tabanıdır; yeniden birleştirilmedi. PR #5, PR #9 içinde bulunduğu için ayrıca alınmadı. Yerel `feature/codex-content-platform-v04` dalındaki `fd66db3` commit'i korunmuştur; ikinci bir arşiv modeli yaratmamak için topluca taşınmamıştır.

## Çalışan entegrasyon

- 68 JSON kayıt tek sunucu veri sınırından yüklenir.
- PR #9 yayın kapısı korunur: 62 `published` kayıt listelenir ve statik detay sayfası alır; 5 `reviewed` ve 1 `draft` kayıt 404 ile kapalıdır.
- `published`, insan uzman onayı olarak sunulmaz. Arayüz açıkça “kaynak denetimli · uzman onayı bekliyor” der ve detay sayfaları `noindex` taşır.
- `/arsiv` Türkçe karakter duyarlı tam metin araması; tür, kategori, kurum, şehir ve yıl aralığı filtreleri; paylaşılabilir URL ve sayfalama sağlar.
- `/arsiv/[slug]` başlık, tarih, kaynak kurumu, künye, kurumsal dış bağlantı, kullanım hakkı ve inceleme durumunu gösterir. `external_link` kayıtlarına indirme düğmesi eklenmez.
- `/kronoloji` yayımlanabilir olay kayıtlarını yıl/ay/gün ile filtreler ve arşiv detayına bağlar.
- Ana sayfa arşiv kartları gerçek görüntülenebilir sayıları gösterir. Yayınlar gibi henüz doğrulanmış veri bulunmayan alanlar dürüst boş durumunu korur.

## Kalite notları

PR #7'deki Kilo betiklerinin bozuk çıktı dosyası ifadeleri ve eksik `run-all.mjs` dosyası onarıldı. Betikler artık ağ/HTTP, yatay taşma, skip-link ve axe serious/critical ihlallerinde başarısız çıkış kodu üretir.

Üretim alan adı belirlenmediği sürece `robots.txt` tüm taramayı engeller. Ayrıca arşiv detayları, insan uzman incelemesi tamamlanana kadar sayfa düzeyinde `noindex` kalır. Canlı preview/production yayını bu PR'ın kapsamında değildir.

## Manuel kontrol listesi

- [x] 1536×1024, 1440×900, 1024×768, 390×844 ve 360×800 ana sayfa/arşiv ekranları
- [x] Mobil menü, hero slider, arama modalı ve Escape davranışı
- [x] Türkçe arama, filtre URL'leri, sayfalama ve sonuçsuz durum
- [x] Arşiv detayında kaynak, hak, inceleme durumu ve indirme düğmesi yokluğu
- [x] `reviewed` ve `draft` kayıtların 404 yayın kapısı
- [x] Konsol hatası, başarısız istek, beklenmeyen ağ 404 ve yatay taşma denetimi
- [ ] İnsan tarih editörü tarafından içerik onayı
- [ ] Yetkili preview origin'i, indeksleme kararı ve yayın sorumlusu onayı

## Son doğrulama özeti

- `npm ci` (kök ve `web/`) — başarılı.
- Web lint / TypeScript / production build — başarılı; 62 arşiv detayı dahil 72 statik sayfa üretildi.
- Web birim/sözleşme testleri — 5/5.
- OpenCode arşiv testleri — 74/74.
- Copilot release-check testleri — 93/93; bütünleşik koşucu 98/98, CI kapısı geçti.
- Playwright — 80/80; beş proje viewport'u, Kilo'nun 10 viewport döngüsü, menü/slider/modal/404 ve arşiv davranışları.
- Bağımsız Kilo responsive — 10/10; axe serious/critical ihlali 0.
- Üretim bağımlılığı taraması — 0 açık. Geliştirme ağacında ESLint zincirinden gelen 5 yüksek advisory uyarı olarak kalır.
- Görsel fark — MAE 25.492; 32 üzeri kanal farkı oranı %25.584. Antigravity PR #8'in onaylı tasarım kompozisyonu korunmuştur.

Ekran görüntüleri `docs/screenshots/v05-archive-*.png` ve ana sayfa için `docs/screenshots/nextjs-*.png` dosyalarındadır.
