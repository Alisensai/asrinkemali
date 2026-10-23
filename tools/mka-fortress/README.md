# MKA FORTRESS araçları (Phase 1)

Bağımlılıksız Node.js araçları. **Hiçbiri arşiv veya yayın dosyalarına yazmaz.** Tümü yerel veya yetkili test ortamında çalıştırılmalıdır.

| Araç | Amaç | Çıkış kodu |
|---|---|---|
| `integrity.mjs check` | ID/slug benzersizliği, ilişki referansları, URL güvenliği, provenans, tarih kesinliği, hak belirsizliği, link-only medya kaynağı; insan onaysız `published` sayısı | 1: veri hatası |
| `integrity.mjs manifest [--out=]` | Kanonik SHA-256 içerik manifesti (arşiv dizinlerine yazmayı reddeder) | 0 |
| `integrity.mjs diff --base=git:REF\|manifest.json [--allow=] [--ledger=] [--mass-threshold=0.1]` | Eklenen, silinen ve değişen kayıtlar; kaynak URL/alan adı değişikliği; toplu değişiklik; insan onaylı kayıt değişince `reReviewRequired`; gerekçeli izin listesi | 1: beklenmeyen değişiklik, yeniden inceleme veya toplu değişiklik |
| `backup.mjs create\|verify\|restore` | Manifestli yedek; hash, bozulma ve kurcalama doğrulaması; şema uyumu; yalnız depo dışı boş hedefe, varsayılanı dry-run olan geri yükleme | 1: doğrulama hatası |
| `secrets.mjs [--bundle]` | İzlenen dosyalarda ve istemci paketinde sır deseni, `.env`, riskli `NEXT_PUBLIC_`, sunucu yolu sızıntısı. **Değer yazdırmaz** | 1: bulgu |
| `supply-chain.mjs [--audit] [--compare=git:REF]` | Kilit bütünlüğü, kayıt defteri kaynağı, doğrudan/dolaylı envanter, sürüm farkı, olası kullanılmayan paket, iş akışı en az yetki ve SHA sabitleme, `npm audit` | 1: yüksek/kritik |
| `csp-probe.mjs --base= [--browser=]` | Gerçek tarayıcıda tüm rotalar ve etkileşimler için CSP ihlali; yalnız yerel adres | 1: ihlal |
| `perf.mjs --base= [--runs=] [--pid=]` | HTML/RSC boyutu, gecikme medyan/p90/sapma, derleme boyutu, sunucu belleği; yalnız yerel adres | 0 |

**İzin listesi biçimi** (`--allow`): `{ "kayit-id": "en az 8 karakterlik gerekçe (PR/editör kararı)" }`

Testler: `node --test tools/mka-fortress/tests/*.test.mjs`

## Sınırlar

- Değişiklik tespiti yetkisiz değişikliği **önlemez**. Başlangıç noktası korumalı dal veya imzalı etiket gibi güvenilir bir referans olmalıdır.
- Onay defterinde aktör kimliği doğrulanmaz. Tespit, defterin dürüst tutulmasına bağlıdır.
- Sır taraması bilinen desenlerle sınırlıdır; geçmiş commit'leri taramaz (yalnız güncel izlenen dosyalar).
