# Test ve Doğrulama Raporu

- **Tarih:** 23 Ekim 2026
- **Kapsam:** `scripts/archive/` modülleri, CLI, şema doğrulaması ve örnek arşiv
- **Test çerçevesi:** Node.js yerleşik `node:test`; ek npm bağımlılığı yok
- **Sonuç:** 68 test / 68 başarılı / 0 başarısız

## Çalıştırılan komutlar

```bash
node scripts/archive/validate.mjs
node scripts/archive/validate.mjs --strict
node scripts/archive/validate.mjs --links
node scripts/archive/validate.mjs --json
node --test "scripts/archive/tests/*.test.mjs"
npx -y node@22 --test "scripts/archive/tests/*.test.mjs"
```

## Ortam

| Ortam | Sürüm | Sonuç |
|---|---|---|
| Windows + Node | v24.19.0 | 68/68 başarılı |
| Node 22 (npx) | v22.23.4 | 68/68 başarılı |

Kod, Node 22+ ile uyumlu API'ler kullanır: `fetch`, `node:test`,
`node:assert/strict`, `fs/promises`, `AbortController`. Node 24'e özgü bir API
kullanılmamıştır.

## Test dağılımı

| Dosya | Test sayısı | Kapsam |
|---|---:|---|
| `tests/text.test.mjs` | 8 | NFC/NFD, `ı/i`, `İ/i`, `ş/s`, tokenizasyon, takvim tarihi |
| `tests/search.test.mjs` | 8 | Türkçe arama, exact/folded, yıl/kategori/tür/etiket, sıralama |
| `tests/today.test.mjs` | 5 | Takvim günü eşleşmesi, 23 Ekim boş mesajı, durum/tür süzgeci |
| `tests/security.test.mjs` | 8 | URL allowlist, HTML/şema enjeksiyonu, mojibake, görsel imzası, boyut |
| `tests/validate.test.mjs` | 12 | Şema, yayın kapısı, alıntı kanıtı, hak, tekrar, taksonomi |
| `tests/load.test.mjs` | 6 | JSON/BOM/bozuk dosya, kayıt dizini, şema/taksonomi yükleme |
| `tests/links.test.mjs` | 7 | HEAD/GET, 404, yönlendirme güvenliği, URL-kayıt eşleme |
| `tests/cli.test.mjs` | 5 | `--json`, `--strict`, `--help`, hatalı seçenek, çıkış kodları |
| `tests/integration.test.mjs` | 9 | Gerçek arşiv, 12-20 kayıt, altı tür, yayın kapısı, arama, bugün |
| **Toplam** | **68** | |

## Doğrulama sonucu

```text
ASRIN KEMALİ arşiv doğrulaması
Kayıt: 18 | Yayımlandı: 15 | İncelendi: 2 | Taslak: 1
Türler: fotoğraf 3, belge 1, konuşma 1, olay 8, yayın 2, mekân 3
Alıntılı kayıt: 1 | Görselli kayıt: 3 | Tarihi bilinmeyen: 1

UYARILAR (4):
  [TARIH_EKSIK] selanikteki-ataturk-evi $.date
  [HAK_BELIRSIZ] selanikteki-ataturk-evi $.rights.status
  [HAK_BELIRSIZ] vatandas-icin-medeni-bilgiler-1930 $.rights.status
  [INCELEME_HAK] vatandas-icin-medeni-bilgiler-1930 $.rights.status

Sonuç: başarılı (uyarılar var).
```

Dört uyarı bilinçli olarak kabul edilir:

- `selanikteki-ataturk-evi`: tarih ve hak durumu bilinmiyor; `draft`.
- `vatandas-icin-medeni-bilgiler-1930`: hak durumu bilinmiyor; `reviewed`.

`--strict` bu dört uyarıyı hata sayar ve çıkış kodu `1` olur. Bu, "sıfır uyarı"
politikası isteyen CI işleri için beklenen davranıştır; mevcut örnek arşivde
bilinçli istisnalar olduğu için varsayılan komut `--strict` kullanmaz.

## Bağlantı denetimi

```text
checked 17, ok true, failures 0
```

17 tekil kaynak URL'si (58 referans) 23 Ekim 2026'da HTTP 200 döndü. Bağlantı
denetimi ağa bağlıdır; `--links` başarısız bağlantıyı hata sayar ve `1` ile
çıkar. CI'da ayrı ve zamanlanmış bir iş olarak çalıştırılması önerilir.

## CLI çıkış kodları

| Durum | Kod | Test |
|---|---:|---|
| Temiz doğrulama | 0 | `cli.test.mjs` |
| `--strict` ile uyarı varken | 1 | `cli.test.mjs` |
| Yükleme hatası | 1 | `cli.test.mjs` |
| Bilinmeyen seçenek | 2 | `cli.test.mjs` |
| `--help` | 0 | `cli.test.mjs` |

## Test edilen güvenlik davranışları

- Yalnızca `https`, izinli kurumsal alan adları, 443 portu, kimlik bilgisi
  içermeyen URL'ler.
- Özel/yerel ağ adresleri ve `tbmm.gov.tr.evil.example` gibi aldatıcı alan
  adları reddedilir.
- HTML/script, `on*=` olay işleyicisi, `javascript:`/`data:` şeması, mojibake,
  U+FFFD ve kontrol karakterleri reddedilir.
- JSON 512 KiB, görsel 2 MiB, toplam 500 kayıt sınırı.
- Görsel yolu `content/archive/images/` dışına çıkamaz; uzantı, boyut ve dosya
  imzası denetlenir.
- `__proto__`, `prototype`, `constructor` anahtarları reddedilir.
- Bağlantı denetiminde yönlendirmeler elle izlenir; her yeni konak yeniden
  allowlist'e karşı sınanır.

## Bilinen sınırlar

- Tarayıcı/E2E veya görsel regresyon testi yoktur; bu çalışma veri ve CLI
  katmanıyla sınırlıdır.
- Bağlantı denetimi dış sitelere bağlıdır; 403/429 gibi bot koruması durumları
  gerçek bir kırık bağlantı olmasa da hata üretebilir.
- İnsan uzman incelemesi otomatik testlerle ikame edilemez. Özellikle
  `ii-inonu-zaferi-fotografi-1921` tarih çelişkisi ve
  `vatandas-icin-medeni-bilgiler-1930` hak durumu açıktır.
- Testler örnek arşivin 18 kayıtla sınırlı olduğu varsayımını doğrular; kayıt
  sayısı değişirse ilgili sabitler güncellenmelidir.

## Tekrarlanabilirlik

Testler her çalıştırmada geçici dizinler oluşturur ve siler; gerçek arşiv
dosyalarını değiştirmez. Ağ erişimi yalnızca `links.test.mjs` içindeki sahte
`fetch` uygulamalarıyla değil, gerçek bağlantı denetimi istendiğinde kullanılır.
Varsayılan test paketi çevrimdışı çalışır.
