# ASRIN KEMALİ — Web sitesi / v0.1

**Durum:** Çalışan, mobil uyumlu **yerel görsel prototip**. Henüz canlı site değildir. `index.html` ile doğrudan açılır; kolay geliştirme için yerel HTTP sunucusu önerilir.

## Yerel çalıştırma (Windows)

1. ZIP'i bir klasöre çıkartın.
2. `index.html` dosyasına çift tıklayın. Alternatif: klasörde PowerShell açıp `python -m http.server 8000` yazın ve `http://localhost:8000` ziyaret edin.
3. VS Code veya Antigravity içinde bu klasörü proje olarak açın.

**Referans görsel:** `design/ONAYLANAN-TASARIM.webp` — 23 Ekim 2026 onaylı masaüstü tasarım. Hedef: mümkün olduğunca birebir; işlevsellik ve tarihsel güvenilirlik korunacak.

**Görsel malzemeler:** `assets/*.webp`, konuşma içinde üretilmiş yapay zekâ görsellerinden türetilmiş **temsili** malzemedir. Gerçek tarihî fotoğraf değildir. Yeni fotoğraf eklenirse kaynak, lisans ve tarih metadata'sı zorunludur.

## Sürümde çalışan özellikler
- Masaüstü ve mobil navigasyon; erişilebilir arama penceresi.
- Açılış slider'ı (3 sayfa), mobil menü, arşiv kategori filtreleri.
- Kronoloji ve hızlı erişim bölümleri, gerçek hedeflere giden bağlantılar.
- Otomatik güncel tarih, daha yüksek kontrast modu, klavye erişimi.

## Henüz yapılmayanlar
- Next.js + TypeScript uygulamasına taşınma; backend/veritabanı/CMS.
- Gerçek tarihî fotoğrafların kaynaklı veri kümesi ve lisans kontrolü.
- İçerik yönetim paneli, arama endeksi, üyelik, çok dil.
- Gerçek alan adı bağlantısı ve üretim yayını.

## Kurallar
1. GitHub, **tek kaynak**. EVREN projesine dokunulmayacak.
2. Tüm ajanlar kendi `feature/<ajan>-<gorev>` dallarında, pull request ile değişiklik gönderecek. `main` değişiklikleri yalnızca inceleme/testten sonra.
3. Referans görseldeki yazıları doğrulanmış tarihî alıntı gibi kullanmayın. Kaynağı doğrulanmayan iddiaları yayımlamayın.
4. Bağımsız dijital proje, devlet kurumu/kurulu enstitü/dernek gibi tanıtılamaz.
5. Gizli anahtar, T.C. kimlik, ödeme kartı veya Google Workspace bilgilerini repoya koymayın.
6. Ekran görüntüsü karşılaştırması en az 1440x900, 1024x768, 390x844 ve 360x800 çözünürlüklerinde yapılmalı.

Ayrıntılı görevler: [`docs/GELISTIRME-PLANI.md`](docs/GELISTIRME-PLANI.md) ve ajan komutları: `agent-prompts/`.
