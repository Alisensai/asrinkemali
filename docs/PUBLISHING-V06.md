# V0.6 yayın platformu

## Mimari

Yayın sistemi mevcut OpenCode arşiv modelini ikinci bir arşiv oluşturmadan kullanır. `PublicationRecord.relatedArchiveIds` ve kaynakça girdileri `ArchiveRecord.id` ile ilişkilidir. Kullanıcıya açık rotalar yalnızca hem çalışma zamanı doğrulamasından geçen hem de `published` durumunda tarihli insan editör onayı taşıyan kayıtları okur.

- `schemas/publication-record.types.ts`: yayın, kaynakça, hak, onay ve otomasyon sözleşmesi.
- `web/lib/publishing/model.ts`: doğrulama, durum geçişi ve görünürlük kapısı.
- `web/lib/publishing/repository.ts`: dosya tabanlı sunucu okuyucusu; tarayıcı paketine veri yüklemez.
- `web/lib/publishing/draft.ts`: yayın kapısından geçmiş arşiv kayıtlarından deterministik `draft` üretir. AI adaptörü için dry-run, kaynak listesi ve kuruş cinsinden sert maliyet tavanı zorunludur; V0.6 hiçbir harici AI çağrısı yapmaz.
- `web/lib/publishing/today.ts`: ay/gün ve `day` hassasiyetine göre kaynaklı olay seçer.
- `web/lib/publishing/scheduler.ts`: yalnızca `scheduled`, insan onaylı ve zamanı gelmiş kayıtları idempotency anahtarıyla planlar.
- `scripts/publishing/dry-run.mjs`: salt okunur yerel plan çıktısı. Kayıt veya ledger yazmaz.

## Editoryal akış

`draft → in_review → approved → scheduled → published`. İnceleme aşamasında taslağa, zamanlanmış içerikte onaylı durumuna geri dönüş mümkündür. `published` son durumdur. AI/deterministik otomasyon yalnızca taslak üretebilir; insan editör onayı olmadan sonraki kapılar açılamaz.

Zamanlayıcı anahtarı `publication:<id>:<scheduledAt>` biçimindedir. Başarılı gerçek yayın adaptörü ileride bu anahtarı atomik bir ledger'a yazmalıdır. Aynı anahtar tekrar görüldüğünde işlem atlanır. V0.6'da gerçek yürütücü yoktur; yalnızca `npm run publishing:dry-run -- --now=2026-10-23T12:00:00Z` plan üretir.

## İçerik ve güvenlik

Gövde HTML değil, `heading` ve `paragraph` metin bloklarıdır; React metni kaçışlayarak XSS riskini azaltır. Dış kaynaklar yalnızca HTTPS kabul edilir ve yeni sekmede `noopener noreferrer` ile açılır. Lisans, hak sahibi, kaynakça ve en az bir arşiv ilişkisi zorunludur. Henüz insan editörün onayladığı yayın veri kümesi bulunmadığından site sahte örnek makale göstermez.

## Sonraki entegrasyon

1. İnsan editör kimliği ve sorumluluk süreci tanımlanmalı.
2. Gerçek yayın kayıtları bağımsız kaynak/telif incelemesinden sonra `content/publications/records` altına eklenmeli.
3. Gerçek zamanlayıcı ancak atomik/kalıcı ledger, kilit ve geri alma tasarımı tamamlandıktan sonra ayrı sprintte etkinleştirilmeli.
4. Antigravity görsel ince ayarı `publishing.module.css` üzerinden yapılabilir; `components/` ve `globals.css` bu çalışmada değiştirilmemiştir.
