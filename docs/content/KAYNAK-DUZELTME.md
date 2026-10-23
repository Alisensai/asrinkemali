# Kaynak Düzeltme ve Yayından Geri Çekme

Bu belge, bir arşiv kaydının kaynağı, tarihi, künyesi veya hak durumu
değiştiğinde izlenecek yolu tanımlar. Temel kural: **şüphe varsa yayını durdur,
kaydı silme; düzeltmeyi ve gerekçeyi kaydet.**

## Ne zaman düzeltme açılır?

- Kaynak URL'si 404/410 döndürüyor veya başka bir adrese taşınmış.
- Kurumsal sayfadaki tarih, başlık, arşiv numarası veya fotoğraf açıklaması
  değişmiş.
- Kayıttaki tarih ile kaynak arasında çelişki bulunmuş.
- Hak/lisans durumu değişmiş veya yeni bir kullanım koşulu yayımlanmış.
- Aynı olay/fotoğraf için yinelenen kayıt tespit edilmiş.
- Doğrudan alıntının kaynak pasajı değişmiş veya alıntı yanlış atfedilmiş.
- Bir hak sahibi veya kurum itiraz etmiş.

## 1. Yayını durdur

Kayıt `published` ise önce `reviewed` veya `draft` durumuna alın:

```json
"verification": {
  "status": "reviewed",
  "reviewedBy": "OpenCode arşiv denetimi (yapay zekâ)",
  "reviewedAt": "2026-10-23",
  "checks": {
    "sourceReachable": false,
    "dateVerified": false,
    "rightsVerified": false,
    "quoteVerified": false,
    "duplicateChecked": true
  },
  "notes": "Kaynak URL'si 23 Ekim 2026'da 404 döndü; düzeltme için yayından çekildi."
}
```

Notlar:

- `status: "draft"` ise `reviewedBy`/`reviewedAt` boş olabilir; `reviewed` ise
  inceleyen ve tarih zorunludur.
- `checks` alanındaki tüm anahtarlar şemada zorunludur. Doğrulanmayanlar
  `false` kalır.
- Kayıt `reviewed` durumundayken arama varsayılan olarak onu göstermez;
  "Tarihte Bugün" yalnızca `published` kayıtları kullanır.

## 2. Kaynağı ve kanıtı güncelle

- `source.url`, `source.title`, `source.accessedAt`, `source.archiveIdentifier`
  alanlarını yeni kurumsal sayfaya göre güncelle.
- `provenance` listesine yeni URL'yi ekle; eski URL'yi silme, notla koru.
- Tarih değiştiyse `date.start`, `date.end`, `date.precision`, `date.display`
  ve `date.note` alanlarını birlikte güncelle.
- Alıntı etkilendiyse `quotation.evidence.sourceExcerpt`, `retrievedAt` ve
  `verifiedBy` alanlarını yenile; `quotation.text` kaynakta birebir yoksa
  alıntıyı kaldır veya düzelt.
- Görsel etkilendiyse `image.sourcePageUrl` ve `rights` alanlarını güncelle;
  lisans yoksa görseli indirme, `link_only` politikasını koru.

Örnek kaynak taşınması:

```json
"source": {
  "institution": "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
  "institutionType": "institutional",
  "institutionUrl": "https://ataturkansiklopedisi.gov.tr/",
  "title": "Atatürk Ansiklopedisi: Örnek Kayıt",
  "url": "https://ataturkansiklopedisi.gov.tr/detay/1/Ornek-Kayit",
  "accessedAt": "2026-10-23",
  "publishedAt": null,
  "archiveIdentifier": "1",
  "note": "Eski URL 2026-10-23'te 404 döndü; yeni kurumsal adres kullanıldı."
},
"provenance": [
  {
    "institution": "Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi)",
    "collection": "Atatürk Ansiklopedisi",
    "identifier": "1",
    "url": "https://ataturkansiklopedisi.gov.tr/detay/1/Ornek-Kayit",
    "accessedAt": "2026-10-23",
    "note": "Yeni adres; eski adres arşiv notunda korunur."
  }
]
```

## 3. Yeniden doğrula

```bash
node scripts/archive/validate.mjs
node scripts/archive/validate.mjs --links
node --test "scripts/archive/tests/*.test.mjs"
```

- `--links` yalnızca ağ erişimi varsa çalıştırılır; kırık bağlantı varsa çıkış
  kodu `1` olur.
- `--strict` uyarıları da hata sayar. Bilinçli istisnalar (ör. tarihi bilinmeyen
  taslak) varsa normal doğrulama kullanılır ve istisna gerekçesi kayda yazılır.
- Doğrulama geçmeden kayıt `published` yapılmaz.

## 4. Denetim kaydını güncelle

`docs/content/AUDIT.md` içine tarihli bir bölüm ekle:

```markdown
## 2026-10-23 — Kaynak düzeltmesi

- Kayıt: `ornek-kayit`
- Neden: Kaynak URL'si 404 döndü.
- Yapılan: Yeni kurumsal URL ve provenans eklendi; kayıt `reviewed` durumuna alındı.
- Doğrulama: `0 hata, 1 uyarı`; bağlantı denetimi 1/1 başarılı.
- Kalan iş: İnsan uzman onayı.
```

## 5. Yayına geri alma

Şu koşullar birlikte sağlanınca kayıt tekrar `published` olabilir:

- Kaynak URL'si erişilebilir ve belirli bir kayıt sayfası.
- Tarih, künye ve hak durumu doğrulanmış.
- `reviewedBy` ve `reviewedAt` dolu.
- `sourceReachable`, `dateVerified`, `rightsVerified`, `duplicateChecked`
  `true`; alıntı varsa `quoteVerified` da `true`.
- `node scripts/archive/validate.mjs` sıfır hata veriyor.
- Denetim kaydı güncellenmiş.

## Geri çekme (unpublish) kararı

Aşağıdaki durumlarda kayıt yayından tamamen çekilir (`draft`):

- Kaynak tamamen kaybolmuş ve alternatif kurumsal kaynak bulunamıyorsa.
- Tarih/atıf hatası kaydın bütününü geçersiz kılıyorsa.
- Hak sahibi itirazı çözülmemişse.
- Kayıt yinelenen bir kaydın kopyasıysa ve birleştirme yapılamıyorsa.

Geri çekilen kayıt silinmez; `verification.notes` alanında gerekçe, tarih ve
karar veren bilgisi tutulur. Böylece ileride kaynağın yeniden bulunması hâlinde
kayıt izlenebilir kalır.

## Sorumluluk

- Veri girişi ve ilk künye: katkıda bulunan kişi.
- Kaynak/tarih/hak incelemesi: `reviewedBy` alanında belirtilen kişi veya araç.
- Yayın kararı: depo sorumlusu; yapay zekâ denetimi tek başına yayın onayı
  sayılmaz.
- Hak talepleri: kayıt öncelikle yayından çekilir, ardından kurumun yazılı
  koşulları veya hukuk uzmanı görüşü alınır.
