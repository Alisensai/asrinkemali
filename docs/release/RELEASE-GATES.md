# Sürüm kalite kapıları

Bu belge bir hazırlık denetimi ve süreç rehberidir; canlı site, domain/DNS yapılandırması veya arama motoru indekslenmesi beyanı değildir. Asrın Kemali bağımsız bir dijital tarih-kültür projesidir.

## PR kabul kuralları

1. PR yalnızca kendi dalında açılır; `main` üzerine doğrudan push, force push veya bu CI'dan otomatik merge yoktur.
2. Yeni/yinelenen içeriğin JSON'u geçerli olmalı; slug'lar tekil olmalı; Atatürk'e atfedilen alıntılar kaynak/künye taşımadan eklenmemelidir.
3. Yerel sayfa rotaları ve anchor'lar var olmalı; görsellerin anlamlı alt metni, temsili AI görsellerinin açık etiketi bulunmalıdır.
4. Her düğme erişilebilir ada ve gerçek işleve sahip olmalı; henüz hazır olmayan kontroller `disabled` olarak belirtilmelidir.
5. Title, description, canonical, robots, sitemap ve Open Graph metadata'sı sürüm hedefinde değerlendirilmelidir. Alan adı doğrulanana dek canonical yapılandırılmamalı/uydurulmamalıdır.
6. Büyük dosya uyarıları incelenmeli; lisans metadata'sı (LICENSE veya paket metadata'sı) eklenmelidir.
7. PR açıklaması amaç, dosyalar, çalıştırılan komutlar, test sonucu, desktop/mobile görüntüleri ve eksikleri içermelidir.
8. GitHub Actions raporları PR'da artifact olarak incelenmelidir. `--fail-on error` ve daha sonra `--fail-on warning` etkinleştirme kararı bulgular temizlendikten sonra verilmelidir.

## Tek komut ve CI raporu

```powershell
python tools/release-check/checker.py --target both --static-root . --next-root apps/web
python -m unittest discover -s tools/release-check/tests -v
```

`release-quality.yml` Python standard library ile testleri çalıştırır, JSON ve Markdown raporlarını artifact olarak yükler ve hiçbir deploy adımı içermez. Kontrol aracı dış ağ bağlantılarını varsayılan olarak doğrulamaz. `--external-links` sadece istek üzerine, timeout/cache/rate-limit ile açılır. Exit code `0` rapor/gate başarılı; `1` seçilen gate başarısız; `2` rapor üretilemedi anlamına gelir. Yeni yapılar mevcut değilse hedefler `SKIP (belirtilen dalda yok)` olarak raporlanır.

## SEO metadata

- **Title:** sayfaya özgü, özlü ve anlamlı `<title>` / framework metadata.
- **Description:** her sayfanın içeriğini doğru anlatan özgün açıklama.
- **Canonical:** yalnızca gerçek alan adı sahipliği ve yayın rotaları doğrulandıktan sonra mutlak URL olarak ayarlanır. `.com.tr` DNS veya canlı hosting varsayılmaz; placeholder gerçek URL gibi yayınlanmamalıdır.
- **Robots:** taslak/önizleme indekslenmeye kapalı; üretim robots kuralları yayın kararıyla ayrıca belirlenir.
- **Sitemap:** yalnızca yayınlanabilir gerçek rotaları içermeli; staging veya hayalî URL eklenmemeli.
- **Open Graph:** başlık, açıklama ve siteye ait OG görseli; Atatürk AI görselleri temsili olarak etiketlenir ve tarihî fotoğraf gibi sunulmaz.

## Önizleme ve ortam ayrımı

Geliştirme yerel sunucu veya PR preview ortamında yapılabilir. Gizli key gerektirmeyen statik preview için GitHub Actions artifact'ını indirip `python -m http.server 8000` ile yerelde önizleyin; PR önizleme hosting'i seçilecekse public artifact/static hosting gibi secret'sız ve production deploy tetiklemeyen yöntem kullanılmalı. Preview içeriği production/canonical olarak işaretlenmemeli. CI production deploy, DNS değişikliği veya ücretli servis başlatmaz.

## 0.3 yayın koşulları

- Next.js geçişi ve 0.3 kapsamı ayrı PR olarak kararlaştırılmış, build/test ve erişilebilirlik kontrolleri başarılı olmalı.
- İçerik modeli, doğrulanmış kaynak/künye, alıntı ve görsel lisans/provenans şartlarını zorunlu kılmalı.
- AI temsili görseller her sayfa/asset kullanımında tanımlanmalı; kaynaklı gerçek görsellerin belge tarihi ve arşiv bağlantısı olmalı.
- Tüm rotalar/anchor'lar, alt metinler, düğme davranışları, metadata, sitemap ve robots üretim origin'i üzerinde doğrulanmalı.
- Mobil (360px+) ve desktop görsel kabulü; performans, SEO ve güvenlik incelemesi tamamlanmalı.
- Domain sahipliği/DNS ve hosting kararı yetkili kişi tarafından ayrıca onaylanmalı. Gerçek domain, yayın onayı alınmadan config'e eklenmemeli.
- Release branch/etiket, rollback ve yedekleme planı belgelenmeli. Bu gate aracı kendi başına sürüm yayınlamaz veya deploy etmez.
