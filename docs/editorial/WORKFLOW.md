# Tarihî arşiv insan editörlük iş akışı

Bu akış, arşivdeki tüm mevcut girdileri ve ileride eklenecek kayıtları insan tarih uzmanı ile yayın editörünün incelemesine hazırlar. Araçlar `content/archive/records/` ve `data/archive/catalog/` içeriğini salt okunur tarar; kaynak kayıtlarını yeniden yazmaz.

## İlk çalışma ve güncelleme

Repo kökünde:

```powershell
python tools/editorial-review/editorial_review.py create-forms --root . --forms-dir docs/editorial/forms
python tools/editorial-review/editorial_review.py inventory --root . --forms-dir docs/editorial/forms --output-dir docs/editorial/reports
python tools/editorial-review/editorial_review.py validate-forms --root . --forms-dir docs/editorial/forms
```

İlk komut her kayıt için bekleyen JSON form oluşturur, var olan formları korur. Diğer komutlar arşivi ve formu doğrulayarak `inventory.json`, `inventory.csv`, `inventory.md` raporlarını günceller. Yeni kayıtlar bir sonraki envanterde otomatik bulunur. Silinmiş/ID'si değişmiş kayıtların eski formları otomatik silinmez; manuel olarak incelenmelidir. Formdaki `record_snapshot_sha256`, kaynağın inceleme sırasında değiştiğini saptar; eski form tekrar inceleme gerektirir.

Raporlar kaynak erişim durumunu üç farklı kavram olarak sunar: kayıtta önceden `sourceReachable` beyanı, bu çalışmada ağla kontrol durumu ve uzman doğrulaması. Varsayılan durumda ağ isteği yapılmaz ve `source_access_status` `not_checked` kalır. İsteğe bağlı `--check-links` 24 saat cache (geçici/DNS hatası için 5 dakika, erişim kısıtı için 1 saat), 5 saniye varsayılan timeout, host başına en az 1 saniye ara ve varsayılan en fazla 50 benzersiz URL uygular. Yerel hostname veya non-public IP'ye çözümlenen host engellenir. Yönlendirme otomatik izlenmez. 2xx HTTP yanıtı tarihsel doğruluk/özgünlük delili değildir; kaynak belgesinin kendisi incelenmelidir.

## Formu insanın tamamlaması

`docs/editorial/forms/<record-id>.json` formunda:

1. İnsan uzman `reviewer.name`, `reviewer.role: "human_expert"` ve geçmiş `review_date` alanlarını doldurur.
2. Tarihî bilgi, kaynak özgünlüğü, kaynağın kayıtla tutarlılığı, varsa alıntı ve telif/yeniden kullanım koşulları `pass`, `fail` veya bağlama uygun `not_applicable` olarak işaretlenir.
3. Sonuç `approved`, `correction_required` veya `rejected` seçilir; kanıt referansı ve gerekçe yazılır. Her karar için birincil/kurumsal belge ve telif koşulları gerektiğinde ayrıca uzman tarafından incelenir.
4. Yalnızca `approved` uzman incelemesinden sonra, yetkili bir **insan yayın editörü** ayrı `publicationApproval` kaydını doldurur. Bu nesnenin alanları V0.6 PR #12 yayın denetimiyle uyumludur (`status`, `authority`, `role`, `approvedBy`, timezone içeren `approvedAt`).
5. Form ve arşiv değişikliği ayrı, gözden geçirilebilir bir PR üzerinden değerlendirilir. İnceleme merkezi otomatik biçimde arşiv içeriğine approval kopyalamaz.

Bilinen `AI`, `OpenCode`, `Copilot`, `Claude`, agent/bot/automation adları uzman veya editör gibi kullanılamaz. Regex denetimi bir kişinin kimliğini kanıtlayamaz; ad/rol/yetki, GitHub hesabı ve kurum sorumlusu tarafından doğrulanmalıdır. Sahte isim, sahte imza ve otomatik uzman onayı yasaktır.

## Mevcut otomatik triage özeti

Oluşturulan rapor kayıt bazında aşağıdakileri kapsar:

- ID, başlık, tür, tarih aralığı/hassasiyeti/kesinliği, kaynak kurumu ve URL, künye ve önceki erişim iddiası.
- Belirsiz kullanım/telif durumu, AI denetimi, insan uzman incelemesi, insan editör yayın onayı, doğrulama durumu.
- Eksik/geçersiz kaynak, künye, tarih ve hak alanları; tahmini tarihler, AI temsil görseli, alıntı kaynağı riskleri.
- Tür ve kurum dağılımları, insan incelemesi/ kaynak / hak eksiği / tahmini tarih / tekrar adayları / çelişkili kaynak iddiaları / onay bekleyen yayın listeleri.

İlk snapshot'ta **68 kayıt** bulunmuştur: `event` 29, `document` 13, `publication` 12, `photograph` 9, `place` 3, `speech` 2. Kaynak kurumları: Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi) 37; Türkiye Büyük Millet Meclisi 15; İstanbul Büyükşehir Belediyesi Atatürk Kitaplığı 8; Atatürk Araştırma Merkezi Yayınları 5; Millî Kütüphane 3. Bu sayılar kod sabiti değil; rapor her çalışmada diskten yeniden hesaplanır.

Mevcut veride 67 kayıt `OpenCode arşiv denetimi (yapay zekâ)` ile işaretlenmiş, birinde reviewer alanı yoktur. İnsan uzman incelemesi doğrulanmış hiçbir form henüz bulunmadığı için 68 kayıt insan incelemesi bekler. `rights.status: unknown` olan 2 kayıt, `date.certainty: estimated` olan 3 kayıt ve `date.precision/certainty: unknown` olan 1 kayıt uzman değerlendirmesi gerektirir. Mevcut kayıtlarda source kurum/URL/künye alanları dolu görünse dahi bu, gerçek kaynağın iddiaları desteklediğini ispatlamaz. Ayrı geçerli insan editör `publicationApproval` kaydı yoksa kayıt yayın onayı bekleyen olarak listelenir.

Muhtemel tekrarlar, yalnızca eşleşen normalleştirilmiş başlık ve tarih başlangıcıyla; kaynak çelişkileri de bu eşleşme altında farklı kaynak URL/kurum bulunmasıyla işaretlenir. Bu algoritma farklı isimlerle aynı belgeyi, yanlış metadata'yı veya iki ayrı belgenin aynı tarihi paylaşmasını kesin olarak çözemez; liste uzmanın araştırma kuyruğudur.

## Onay ve kayıt bütünlüğü

Form şeması `tools/editorial-review/review-form.schema.json`, audit olay şeması `tools/editorial-review/approval-event.schema.json` içindedir. Audit JSONL olayında sıra, insan rolü, form hash'i, kanıt referansları, önceki olay hash'i ve olay hash'i bulunur. `verify-ledger` zinciri doğrular ama olay/approval kaydetmez veya dijital imza üretmez.

Hash zinciri tutarsız değişiklikleri saptamaya yarar; yetkili bir aktör tüm zinciri yeniden oluşturabileceği için tek başına immutable log değildir. Gerçek koruma: PR inceleme izi, kısıtlı branch write erişimi, merge onayı/korumalı dal ve kurum politikası uygunsa imzalı commit zorunluluğu. Bu depo aracı kimlik sağlayıcısı, GitHub branch protection veya anahtar yönetimini değiştirmez.

## Yayın öncesi neden zorunlu?

Arşivdeki tarih, Atatürk'e atfedilen alıntı, kaynak provenansı ve yeniden kullanım hakkı ziyaretçi güvenini ve hukuki riski doğrudan etkiler. Kaynak URL'sinin açılması, AI taraması veya mevcut `published` etiketi bir insan tarih uzmanının belge/bağlam incelemesi değildir. Bu nedenle doğrulanabilir kaynak kanıtı ve uzman kararı olmadan yayın editörü onayı verilemez; V0.6 release gate insan onayı olmadan kritik bulgu ile başarısız olmaya devam eder. Bu çalışma otomatik doğruluğu veya güncel bir canlı siteyi iddia etmez.
