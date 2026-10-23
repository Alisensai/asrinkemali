# AGENTS.md — Asrın Kemali ortak ajan anayasası

**PROJE:** Mustafa Kemal Atatürk odaklı *bağımsız* tarih ve kültür platformu. Marka: **ASRIN KEMALİ**, kısaltma **MKA**, motto **BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI**.

1. Onaylı görünüm: `design/ONAYLANAN-TASARIM.webp`. Bu görsel tasarımın **tek ana referansıdır**. Tasarım tartışmasında referansa bakmadan büyük stil değişikliği yapma.
2. GitHub tek gerçek kaynak; projeyi diğer repolardan, özellikle EVREN'den ayrı tut.
3. Her özellik için kendi dalın. `main`'e izinsiz force push/merge yok. Başka bir ajanın işini üzerine yazma.
4. Her PR açıklamasında: amaç, etkilenen dosyalar, çalıştırılan komutlar, test sonuçları, desktop ve mobile ekran görüntüleri, kalan eksikler bulunmalı.
5. İşlevsiz dekoratif düğmeler üretme; her tıklanabilir öğe gerçek iş görsün veya geliştirilene kadar açıkça devre dışı olsun.
6. Görsel üretimlerinden gelen Atatürk görselleri **temsili/AI** olarak etiketlenmeli. Tarihî fotoğraf diye paylaşma. Gerçek resim için provenans, lisans, arşiv bağlantısı ve belge tarihi.
7. Tarihî alıntı, takvim, haberler ve kurumsal unvanlar uydurulmaz. Orijinal tasarım görüntüsündeki metinler tarihî kaynak değildir.
8. Resmî kamu kurumu, kurulmamış dernek/enstitü, hukuken var olmayan şube/yönetim kurulu izlenimi oluşturma; kendini bağımsız proje olarak tanıt.
9. Şifre/API key/TC kimlik/ödemeler, müşteri belgeleri gibi hassas bilgileri ekleme. `.env` dosyaları commitlenmez.
10. Erişilebilirlik, 360px mobil genişliği, SEO ve performans ilk sürümden itibaren gereklidir.
11. Önce görev listesi ve etkilenecek dosyaları açıkla; sonra uygula, test et, kendi dalına commit et, PR aç. Test edemiyorsan dürüstçe belirt.
12. Türkçe karakter ve yazım kontrolüne dikkat et; kullanıcıya Türkçe rapor ver.
