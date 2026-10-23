# ASRIN KEMALİ — Web sitesi / v0.1

**Durum:** `web/` altında çalışan, mobil uyumlu **Next.js App Router uygulaması** ve kök dizinde karşılaştırma amacıyla korunan statik v0.1 prototipi bulunur. Henüz canlı site değildir. Üretime hazırlanacak ana uygulama `web/` dizinidir.

## Yerel çalıştırma (Windows)

1. `web/` dizininde `npm ci` çalıştırın.
2. `npm run dev` komutunu çalıştırıp `http://localhost:3000` adresini açın.
3. Statik v0.1'i karşılaştırmak için kök `index.html` dosyasını ayrıca açabilirsiniz.

**Referans görsel:** `design/ONAYLANAN-TASARIM.webp` — 23 Ekim 2026 onaylı masaüstü tasarım. Hedef: mümkün olduğunca birebir; işlevsellik ve tarihsel güvenilirlik korunacak.

**Görsel malzemeler:** `assets/*.webp`, konuşma içinde üretilmiş yapay zekâ görsellerinden türetilmiş **temsili** malzemedir. Gerçek tarihî fotoğraf değildir. Yeni fotoğraf eklenirse kaynak, lisans ve tarih metadata'sı zorunludur.

## Sürümde çalışan özellikler
- Masaüstü ve mobil navigasyon; erişilebilir arama penceresi.
- Dört panelli açılış slider'ı, mobil menü, erişilebilir arama penceresi ve gerçek Next.js rotaları.
- Kronoloji ve hızlı erişim bölümleri, gerçek hedeflere giden bağlantılar.
- Otomatik güncel tarih, daha yüksek kontrast modu, klavye erişimi ve doğrulanmamış içerik için dürüst boş durumlar.
- `/`, `/ataturk`, `/kronoloji`, `/arsiv`, `/arsiv/[slug]`, `/yayinlar` ve `/hakkimizda` sayfaları.

## Henüz yapılmayanlar
- Backend/veritabanı/CMS ve doğrulanmış içerik veri hattı.
- Gerçek tarihî fotoğrafların kaynaklı veri kümesi ve lisans kontrolü.
- İçerik yönetim paneli, arama endeksi, üyelik, çok dil.
- Gerçek alan adı bağlantısı ve üretim yayını.

## Kurallar
1. GitHub, **tek kaynak**. EVREN projesine dokunulmayacak.
2. Tüm ajanlar kendi `feature/<ajan>-<gorev>` dallarında, pull request ile değişiklik gönderecek. `main` değişiklikleri yalnızca inceleme/testten sonra.
3. Referans görseldeki yazıları doğrulanmış tarihî alıntı gibi kullanmayın. Kaynağı doğrulanmayan iddiaları yayımlamayın.
4. Bağımsız dijital proje, devlet kurumu/kurulu enstitü/dernek gibi tanıtılamaz.
5. Gizli anahtar, T.C. kimlik, ödeme kartı veya Google Workspace bilgilerini repoya koymayın.
6. Ekran görüntüsü karşılaştırması 1536x1024, 1440x900, 1024x768, 390x844 ve 360x800 çözünürlüklerinde yapılmalı.

Ayrıntılı görevler: [`docs/GELISTIRME-PLANI.md`](docs/GELISTIRME-PLANI.md) ve ajan komutları: `agent-prompts/`.
