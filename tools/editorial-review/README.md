# Arşiv editörlük araçları

Bağımsız, Python 3 standart kütüphanesiyle çalışan, arşiv verisini değiştirmeyen insan inceleme yardımcılarıdır. İki katalog kökü taranır:

- `content/archive/records/`
- `data/archive/catalog/`

Envanter JSON, Excel/LibreOffice'e uygun UTF-8 BOM'lu ve formül enjeksiyonuna karşı kaçışlı CSV, ayrıca Markdown üretir. Kayıt sayısı kaynak klasörlerden hesaplanır; kodda sabitlenmez. Muhtemel tekrar ve çelişkili kaynak grupları yalnızca aynı normalize başlık ve başlangıç tarihi eşleşmesine dayanan **inceleme adayıdır**, tarihsel hüküm değildir.

## Kullanım

Repo kökünden:

```powershell
# İnsan inceleme dosyalarını yalnızca eksik olanlar için hazırla.
python tools/editorial-review/editorial_review.py create-forms `
  --root . --forms-dir docs/editorial/forms

# Arşiv ve formları salt okunur tarayıp üç formatta güncel rapor üret.
python tools/editorial-review/editorial_review.py inventory `
  --root . --forms-dir docs/editorial/forms --output-dir docs/editorial/reports

# Yeni arşiv kayıtlarını bekleyen form olarak ekle ve bütün raporları yenile.
python tools/editorial-review/editorial_review.py update `
  --root . --forms-dir docs/editorial/forms --output-dir docs/editorial/reports

# Formları doğrula; bekleyen boş form geçerli durumdur, hata değildir.
python tools/editorial-review/editorial_review.py validate-forms `
  --root . --forms-dir docs/editorial/forms

# Mevcut bir JSONL olay zincirini doğrula (araç olay/approval üretmez).
python tools/editorial-review/editorial_review.py verify-ledger path/to/editorial-audit.jsonl

# Opsiyonel dış link kontrolü: en fazla 50 benzersiz HTTPS URL, host başına en az 1 sn.
python tools/editorial-review/editorial_review.py inventory `
  --root . --forms-dir docs/editorial/forms --output-dir docs/editorial/reports `
  --check-links --timeout 5 --delay 1 --max-link-checks 50 `
  --cache-file docs/editorial/link-cache.json
```

`inventory` dış ağa çıkmaz. `--check-links` açıkça verilirse en fazla belirtilen sayıda benzersiz adres kontrol edilir; sonuçlar 24 saatlik yerel JSON cache'e yazılır. Yerel hostname ve non-public IP'ye çözümlenen host engellenir; DNS hatası ayrı raporlanır. 301/302 yönlendirme hedefi otomatik izlenmez; 401/403/407/429/451 erişim kısıtı, 404/410 bulunamadı, 5xx/timeout geçici hata olarak ayrı işaretlenir. 405/501 yanıtında yalnızca bir bayt aralığı talep eden GET fallback uygulanır. HTTP 2xx yalnızca sayfanın o anda yanıt verdiğini belirtir; içerik, tarih, alıntı, telif veya kaynak gerçekliğini doğrulamaz. Kontrol edilemeyen/limit dışındaki adresler başarılı sayılmaz.

`create-forms` açıkça çağrılmadıkça form yazmaz; mevcut formu hiçbir zaman üzerine yazmaz. `inventory` ve `update` rapor klasörüne yalnızca rapor dosyalarını yazar; arşiv JSON'larını güncellemez. Formlarda kişisel adres, telefon, kimlik numarası veya hassas belge bulundurmayın.

`update`, katalogdaki kayıtları yeniden tarar; sadece eksik form dosyalarını `pending` olarak oluşturur, mevcut/doldurulmuş formları byte-for-byte korur, formları doğrular ve raporları tek çalıştırmada yeniler. Eski formun kayıt snapshot'ı değişmişse form korunur ve `stale_record_snapshot` bulgusu raporlanır; güncelleme insanın önceki incelemesini değiştirmez. Komut varsayılan olarak offline çalışır.

Her yenileme `inventory.{json,csv,md}`, `review-priority.{json,csv,md}` ve `schema-compatibility.{json,csv,md}` dosyalarını üretir. Öncelik P0; eksik/geçersiz kaynak-künye, tarih veya kaynağı belirtilmemiş alıntı; P1 belirsiz haklar ya da tahmini/bilinmeyen tarih; P2 diğer metadata boşlukları; P3 belirgin metadata boşluğu olmayan kayıtlardır. Bu sıralama araştırma kuyruğudur, tarihsel doğruluk kararı veya onay değildir. İnsan uzman incelemesi ve insan editör yayın onayı ayrı alanlar olarak raporlanır.

Şema raporu arşiv kayıtlarındaki `schemaVersion` dağılımı ve üst düzey alan farklarını editörlük formlarının `schema_version` dağılımından ayrı gösterir. Bu iki sürüm alanı farklı sözleşmelerdir; aynı metin sürümünde olmaları beklenmez. Eksik sürüm metadata'sı veya bozuk form JSON'u ayrıca raporlanır.

## İnceleme formu ve release gate uyumu

Her kayıt için `docs/editorial/forms/<record-id>.json` başlangıç formu `review_status: "pending"`, `outcome: "pending"`, inceleme alanları `not_reviewed`, insan ve yayın onay alanları boş şekilde oluşturulur. Araç hiçbir insan adı, inceleme, karar, imza veya onay üretmez. Form `reviewer.role: human_expert` bekler; AI/ajan kimliği olan bilinen adları kabul etmez.

Onay sonucu seçilebilmesi için tarihî bilgi, özgün kaynak, kaynak-kayıt tutarlılığı ve telif/yeniden kullanım kontrolleri `pass`; alıntı varsa alıntı kontrolü `pass`, yoksa `not_applicable` olmalıdır. Tarih/künye, inceleme tarihi, kanıt bağlantısı/referansı ve açıklama da formda bulunmalıdır. Ayrı `publicationApproval` nesnesi, PR #12'nin `publication_guard.py` sözleşmesiyle aynı camelCase alanları ve değerlerini kullanır:

```json
{
  "status": "approved",
  "authority": "human",
  "role": "human_editor",
  "approvedBy": "Yetkili insan editörü",
  "approvedAt": "2026-10-22T10:30:00Z"
}
```

Onay tarihi timezone taşımalı, geçmişte olmalı ve uzman incelemesinden önce olamaz. İnsan formu doğrulayıcısı bu iddiaları kontrol eder; bir metin alanındaki isim gerçek kimliği veya yetkiyi kriptografik olarak ispatlamaz. PR #12'nin yayın kapısı ayrıca katalog kaydındaki `verification.status == "published"` ve `publicationApproval` alanını gerektirir. Bu araç formu katalog kaydına kopyalamaz veya gate'i gevşetmez. İnsan uzman incelemesi ve yayın editörü kararı birbirinin yerine geçmez.

## Denetlenebilirlik modeli

`approval-event.schema.json`, olayları JSONL'de sıralı `sequence`, timezone'lu `timestamp`, `record_id`, insan rolü, inceleme formunun SHA-256 özeti, kanıt referansları, önceki olay özeti ve geçerli olay özetiyle tanımlar. `verify-ledger` biçimi, hash zincirini ve bilinen AI aktörlerini doğrular. Araç yalnızca doğrular; olay yazmaz ve imza üretmez.

Hash zinciri düzenleme/sıra bozulmasını fark ettirir; defteri tümden değiştirebilen bir kişi zincirin tamamını yeniden hesaplayabileceğinden tek başına kimlik doğrulama veya değiştirilemezlik değildir. Gerçek bütünlük için insan onayı PR incelemesiyle kaydedilmeli, ana dala yazma erişimi kısıtlanmalı ve organizasyon politikası uygunsa imzalı commit/korumalı dal zorunlu tutulmalıdır. Hiçbir özel anahtar veya imza bu araçta saklanmaz/üretilmez.

## Testler

```powershell
python -m unittest discover -s tools/editorial-review/tests -v
```

Testler iki katalog kökünü, malformed JSON, alan/şema kontrolünü, bekleyen ve doldurulmuş formu, stale snapshot, AI kimlik reddini, PR #12 yayın kapısı alanları/tarih sırasını, CSV formula injection, tekrar/kaynak çelişkisi sezgisini, tüm JSON/CSV/Markdown raporlarını, öncelik/şema farklarını, idempotent form eklemeyi, link durum sınıflandırma/cache/limit/rate limitini, redirect takibini kapalı tutmayı ve hash zinciri bozulmasını kapsar. Link testleri dış ağa çıkmaz.

Haricî/entegrasyon katalog snapshot'ını ayrıca test etmek için arşiv kökünü `EDITORIAL_ARCHIVE_TEST_ROOT` değişkeniyle verin. Test, kayıt sayısını katalogdan keşfeder; sabit sayıya dayanmaz:

```powershell
$env:EDITORIAL_ARCHIVE_TEST_ROOT = "C:\path\to\archive-snapshot"
python -m unittest discover -s tools/editorial-review/tests -p test_editorial_review.py -v
Remove-Item Env:EDITORIAL_ARCHIVE_TEST_ROOT
```
