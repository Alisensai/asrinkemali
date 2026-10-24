# Haklar ve Barındırma

Bu belge, yeni 150 kaydın (ilk genişletme 50 + v06 genişletmesi 100) telif/
kullanım durumunu ve içeriğin dosya olarak mı yoksa yalnızca dış bağlantı
olarak mı sunulduğunu açıklar.

## Temel karar

**Yeni 150 kaydın tamamı yalnızca dış bağlantı olarak sunulur.** Depoda
indirilmiş PDF, görsel, ses veya tam metin yoktur.

| Alan | Değer | Yeni kayıt |
|---|---|---:|
| `holding.mode` | `external_link` | 150 |
| `holding.filePath` | `null` | 150 |
| `rights.status` | `official_link_only` | 150 |
| `rights.imageReuse` | `link_only` | 18 |
| `rights.imageReuse` | `not_downloaded` | 132 |
| Depoda barındırılan dosya | yok | 0 |
| `metadata_only` | yok | 0 |

Tüm arşivde (18 eski + 150 yeni) görseli olan 21 kayıt vardır; bunların 18'i
yeni İBB Atatürk Kitaplığı kaydı, 3'ü eski kayıtlardır. Görselli kayıtlarda
`image.url` ve `image.localPath` boştur; `image.sourcePageUrl` kurumun öğe
sayfasına işaret eder. Next.js tarafı görseli gömmek yerine bu sayfaya bağlantı
vermelidir.

## Neden dosya indirilmedi?

- Kurum sayfalarında açık bir yeniden kullanım lisansı (CC0, CC BY, kamu malı
  beyanı vb.) bulunmuyor; çoğu sayfa yalnızca "kurumsal kullanım" veya genel
  telif koşullarına atıf yapıyor.
- TBMM tutanakları resmî belge niteliğinde olsa da PDF'lerin toplu indirilmesi
  ve yeniden dağıtımı için ayrıca koşul/izin kontrolü gerekir.
- İBB Sayısal Arşiv görsellerinde yeniden yayın izni açıkça belirtilmemiştir.
- Millî Kütüphane katalog kayıtlarında eserlerin telif durumu her kayıt için
  ayrıca değerlendirilmelidir.
- Kullanıcı talimatı gereği telif/erişim izni belirsiz PDF, fotoğraf ve metinler
  indirilmemiş; yalnızca künye ve kaynak bağlantısı tutulmuştur.

Bu nedenle `official_link_only` + `external_link` kombinasyonu kullanılır.
Bu, kaynağın resmî ve doğrulanabilir olduğunu gösterir; içeriğin yeniden
yayımlanmasına izin verildiği anlamına gelmez.

## Kayıt bazında barındırma durumu

Aşağıdaki 150 kaydın tamamı `external_link` ve `filePath: null` değerlerine
sahiptir. Ayrıntılı satırlar için [KAYNAK-ENVANTERI.md](KAYNAK-ENVANTERI.md)
dosyasındaki "Barındırma" sütununa bakın.

### Görselli kayıtlar (`imageReuse: link_only`)

İlk genişletmede 8, v06 genişletmesinde 10 olmak üzere 18 yeni görselli kayıt
vardır. Tamamı İBB Atatürk Kitaplığı kaynaklıdır.

| Kayıt | Kurum | Görsel durumu |
|---|---|---|
| `ibb-refet-pasa-ziyafeti-fotografi-1923` | İBB | Yalnızca öğe sayfasına bağlantı |
| `ibb-erzincan-sapka-fotografi-1926` | İBB | Yalnızca öğe sayfasına bağlantı |
| `ibb-ertugrul-yati-fotografi-1927` | İBB | Yalnızca öğe sayfasına bağlantı |
| `ibb-nutuk-okuma-fotografi-1927` | İBB | Yalnızca öğe sayfasına bağlantı |
| `ibb-canakkale-fotografi-1928` | İBB | Yalnızca öğe sayfasına bağlantı |
| `ibb-10-yildonumu-meclis-fotografi-1933` | İBB | Yalnızca öğe sayfasına bağlantı |
| `ibb-lozan-mektubu-1923` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |
| `ibb-taksim-abide-komisyonu-tutanagi-1928` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |
| `ibb-canonica-taksim-abidesi-mektubu-1928` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |
| `ibb-dolmabahce-naas-ziyaret-usulu-1938` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |
| `ibb-tuzer-ataturk-vefati-mektubu-1938` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |
| `ibb-tuzer-ankara-secim-mektubu-1935` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |
| `ibb-leipzig-illustrirte-zeitung-mektubu-1937` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |
| `ibb-ataturk-albumu-1881-1938` | İBB | Albüm kapağı; yalnızca öğe sayfasına bağlantı |
| `ibb-fotograflarla-ataturk-rafet-zaim-1940` | İBB | Albüm kapağı; yalnızca öğe sayfasına bağlantı |
| `ibb-19-mayis-1941-kutlamalari-albumu` | İBB | Albüm kapağı; yalnızca öğe sayfasına bağlantı |
| `ibb-taksim-abidesi-gumruk-muafiyeti-1928` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |
| `ibb-anadolu-bagdad-taksim-abidesi-1926` | İBB | Belge görseli; yalnızca öğe sayfasına bağlantı |

### Görselsiz kayıtlar (`imageReuse: not_downloaded`)

Diğer 132 yeni kayıt: 94 Atatürk Ansiklopedisi, 20 TBMM, 15 ATAM Yayınları ve
3 Millî Kütüphane kaydı. Bu kayıtlarda `image: null`; yalnızca kaynak sayfası ve
künye bilgisi vardır. Ayrıca 3 eski kayıtta görsel vardır; toplam görselli kayıt
sayısı 21'dir.

## Şema ve doğrulama kuralları

Şema v1.1.0'da `holding` ve `source.citation` alanları opsiyoneldir; böylece
mevcut v1.0.0 kayıtları geçerli kalır. Yeni kayıtlar için doğrulayıcı şu
kuralları uygular:

- `schemaVersion: "1.1.0"` ise `source.citation` zorunludur.
- `holding` yoksa `KAYIT_BARINDIRMA` hatası verilir.
- `holding.mode` yalnızca `external_link`, `hosted_file` veya `metadata_only`
  olabilir.
- `external_link` ve `metadata_only` modlarında `holding.filePath` boş
  olmalıdır.
- `hosted_file` modunda dosya yolu `data/archive/files/` ile başlamalı,
  `..` veya ters bölü içermemeli ve hak durumu `public_domain` ya da
  `open_license` olmalıdır.
- `hosted_file` dışındaki modlarda `rights.imageReuse` izinliyse uyarı
  üretilir; çünkü dosya barındırılmıyorsa yeniden kullanım izni beyanı
  yanıltıcı olabilir.

Bu kurallar `scripts/archive/lib/validate.mjs` içinde uygulanır ve
`scripts/archive/tests/validate.test.mjs` ile sınanır.

## İleride dosya barındırma

Bir kaydın dosyasını depoya eklemek için yalnızca şu durumda izin verilir:

1. Kaynak kurum sayfasında açık kamu malı veya açık lisans beyanı vardır.
2. Dosyanın kendi lisansı ve atıf koşulları belgelenmiştir.
3. Dosya `data/archive/files/` altına, kayıt kimliğiyle uyumlu bir adla
   eklenmiştir.
4. Kayıt `holding.mode: "hosted_file"`, `holding.filePath` ve uygun
   `rights.status` ile güncellenmiştir.
5. `node scripts/archive/validate.mjs` ve testler geçmiştir.

Bu koşullar sağlanmadan dosya eklenmemelidir. Özellikle TBMM PDF'leri ve İBB
görselleri için kurumdan yazılı izin veya açık lisans teyidi olmadan toplu
indirme yapılmamalıdır.

## Next.js tarafında gösterim

- Tüm kayıtlarda "Kaynağı aç" bağlantısı `source.url` adresine gitmelidir.
- Görselli kayıtlarda kart görseli yerine "Görseli kaynak sayfada aç"
  bağlantısı kullanılmalı; `image.sourcePageUrl` hedef alınmalıdır.
- Bağlantılar `target="_blank"` ve `rel="noopener noreferrer"` ile açılmalıdır.
- İndirme düğmesi, dosya sunucusu veya `download` özniteliği eklenmemelidir.
- `rights.status: "official_link_only"` rozeti "Yalnızca resmî bağlantı"
  biçiminde gösterilebilir; "kamu malı" veya "serbest kullanım" denmemelidir.
- `verification.status: "reviewed"` kayıtlar yayımlanmış gibi gösterilmemeli;
  "İnceleniyor" etiketiyle ve varsayılan olarak gizli tutulmalıdır.

## Düzeltme ve kaldırma

Bir kaynak bağlantısı kırılırsa veya kurum telif/erişim koşulunu değiştirirse:

1. Kayıt `reviewed` veya `draft` durumuna alınmalıdır.
2. `source.url` ve `provenance` alanları güncellenmelidir.
3. Gerekirse kayıt katalogdan çıkarılmalı; başka bir URL ile değiştirilmemeli,
   uydurma kayıt eklenmemelidir.
4. Değişiklik doğrulama ve testlerden geçirilmelidir.

## Yapay zekâ denetimi uyarısı

`reviewedBy` alanı `OpenCode arşiv denetimi (yapay zekâ)` değerini taşır. Bu,
kaynağın makine tarafından künye ve erişilebilirlik açısından denetlendiğini
gösterir; insan uzman onayı, tarihsel yorum onayı veya hukuki görüş değildir.
