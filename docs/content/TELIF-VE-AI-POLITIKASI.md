# Telif, Görsel ve Yapay Zekâ Politikası

Bu politika, ASRIN KEMALİ arşiv kayıtlarında telif hakkı, görsel kullanımı,
doğrudan alıntı ve yapay zekâ desteğinin sınırlarını tanımlar. Amaç, doğrulanmamış
bir iddiayı veya hakkı belirsiz bir görseli yayımlamamaktır.

## Temel ilkeler

1. **Kaynak yoksa yayın yok.** Kurumsal veya birincil kaynakla
   doğrulanamayan kayıt `draft` kalır.
2. **Lisans yoksa indirme yok.** Yeniden kullanım izni doğrulanmayan görsel
   indirilmez, kopyalanmaz, yeniden barındırılmaz; yalnızca kaynak sayfaya
   bağlantı verilir.
3. **Alıntı kanıtı zorunlu.** Atatürk'e ait doğrudan alıntı; eser, tarih, özgün
   bağlam ve birebir kaynak pasajı olmadan kullanılamaz.
4. **AI görsel tarihsel kanıt değildir.** Yapay zekâ ile üretilmiş görsel,
   tarihsel fotoğraf gibi sunulamaz.
5. **Şeffaflık.** İnceleme yapay zekâ ile yapıldıysa `reviewedBy` alanında bu
   açıkça belirtilir.

## Hak durumları ve yayın kararı

| `rights.status` | Anlamı | Yayın |
|---|---|---|
| `public_domain` | Kurumsal kaynakta kamu malı olduğu açıkça belirtilmiş | Evet, kaynak kanıtıyla |
| `open_license` | Lisans adı ve lisans URL'si doğrulanmış | Evet, lisans koşullarına uyarak |
| `official_link_only` | Kurumsal sayfa; yeniden kullanım lisansı doğrulanmamış | Evet, yalnızca kaynağa bağlantı |
| `institutional_terms` | Kurumun kullanım koşulları doğrulanmış | Evet, koşullara uyarak |
| `unknown` | Hak sahipliği/lisans bilinmiyor | Hayır |
| `permission_required` | Hak sahibinden izin gerekli | Hayır |
| `ai_representative` | AI/temsili görsel | Tarihsel kayıt olarak hayır |

`official_link_only` seçildiğinde `rightsVerified: true` şu anlama gelir:
"Yeniden kullanım lisansı olmadığı doğrulandı; yalnızca kaynak sayfaya bağlantı
politikası uygulanacak." Bu, eserin kamu malı veya açık lisanslı olduğu anlamına
gelmez.

## Görsel politikası

### İzin verilen

- `image.kind: "digitized_original"` ve `rights.imageReuse: "link_only"`:
  görselin kendisi gösterilmez; `sourcePageUrl` tıklanabilir kaynak bağlantısı
  olur. `image.url` boş, `displayPolicy: "source_link_only"` olur.
- `rights.imageReuse: "permitted"`: yalnızca lisans/izin bilgisi doğrulanmışsa
  ve `license` + `licenseUrl` doluysa.
- Yerel görsel: yalnızca `content/archive/images/` altında, JPEG/PNG/WebP
  imzası, 2 MiB boyut ve yol güvenliği denetiminden geçerse.

### İzin verilmeyen

- Lisansı belirsiz görseli indirmek, depoya koymak veya başka bir sunucudan
  yeniden yayımlamak.
- `link_only` görselde doğrudan `image.url` vermek.
- AI/temsili görseli `reviewed` veya `published` tarihsel kayıt olarak sunmak.
- Görselin alt metninde "temsili"/"AI" etiketi olmadan AI görsel kullanmak.
- Ekran görüntüsü, tasarım mockup'ı veya sosyal medya görselini kaynak sayfa
  yerine koymak.

## Doğrudan alıntı politikası

Doğrudan alıntı yalnızca şu zincir tamamsa eklenir:

1. **Eser/konuşma:** Alıntının hangi metne ait olduğu bellidir.
2. **Tarih:** Konuşmanın/metnin tarihi bellidir.
3. **Bağlam:** Alıntının hangi olay, kurultay veya yayın bağlamında geçtiği
   açıklanır.
4. **Kaynak:** Kurumsal veya birincil kaynak URL'si vardır.
5. **Kanıt:** `evidence.sourceExcerpt` alıntı metnini birebir içerir.
6. **Doğrulama:** `quotation.verified: true` ve yayın için
   `verification.checks.quoteVerified: true`.

Aşağıdakiler kaynak sayılmaz:

- Görsel tasarımdaki metin.
- Sosyal medya alıntısı veya alıntı derlemesi.
- Tarihi/bağlamı belirsiz özdeyiş listeleri.
- Yapay zekâ tarafından "muhtemelen söylemiştir" diye üretilen cümleler.

Alıntı yoksa `quoteVerified: false` kalır. Doğrulayıcı bu alanı yalnızca
`quotation` nesnesi varsa yayın kapısında arar; alıntı yokken `true` değeri
hatadır.

## Yapay zekâ kullanımı

### Kullanılabilir

- Kaynak sayfaların taranması, künye ve tarih karşılaştırması.
- Şema/taksonomi tutarlılığı, yinelenen kayıt ve bağlantı denetimi.
- Türkçe arama ve testlerin hazırlanması.
- Taslak metin ve özet önerileri; nihai künye insan tarafından doğrulanır.

### Kullanılamaz

- Kaynakta bulunmayan bir tarih, arşiv numarası, bağlantı veya alıntı üretmek.
- Tarihsel fotoğraf yerine AI görseli "gerçek" diye yayımlamak.
- İnsan uzman incelemesini gerektiren bir çelişkiyi gizlemek.
- Telif durumu belirsiz görseli indirip "kaynak" göstermek.

### Şeffaflık kaydı

Örnek kayıtlarda `reviewedBy` değeri
`OpenCode arşiv denetimi (yapay zekâ)` olarak tutulur. Bu kayıt, incelemenin
kim tarafından ve hangi araçla yapıldığını gösterir; kurumsal veya akademik
insan onayı anlamına gelmez. Yayın öncesi insan uzman gözden geçirmesi
önerilir.

## Kaynak düzeltme ve geri çekme

- Kırık bağlantı, değişmiş künye, yanlış tarih veya hak değişikliğinde kayıt
  derhal `reviewed` veya `draft` durumuna alınır.
- Eski kaynak ve düzeltme notu silinmez; `verification.notes` ve gerekiyorsa
  `provenance` güncellenir.
- Yayından kaldırılan kayıt, düzeltme tamamlanana kadar arama ve "Tarihte
  Bugün" sonuçlarından çıkar.
- Ayrıntılı prosedür: [KAYNAK-DUZELTME.md](KAYNAK-DUZELTME.md).

## İletişim ve hak talepleri

Bir hak sahibi veya kurum, kayıttaki kullanımın hatalı olduğunu bildirirse
kayıt öncelikle `reviewed`/`draft` durumuna alınır; hak talebi ve kaynak
bilgisi kayıt notuna işlenir. Hak talebi çözülene kadar görsel gösterimi
kapatılır. Bu depo bir hukuki görüş sunmaz; şüpheli durumlarda kurumun yazılı
koşulları veya hukuk uzmanı görüşü esas alınır.
