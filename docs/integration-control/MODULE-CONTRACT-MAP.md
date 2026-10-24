# Modül sözleşme haritası

| Modül | Sahip PR / görev | Sözleşme | Bilinen risk |
|---|---|---|---|
| Arşiv veri katmanı (`web/lib/archive.ts`) | V0.6, #25 (dizinler, `getPublishedArchiveRecordById`) | Tek sunucu tarafı kaynak; `id` ile `slug` ayrı; yalnız `published` görünür | `id == slug` varsayımı (`id-vs-slug` kuralı) |
| Arşiv şeması (`schemas/`) | #14 → Görev 05/06 | ArchiveRecord 1.0.0 / 1.1.0 birlikte okunur | Şema değişikliği tüm okuyucuları etkiler (`schema-version`) |
| Yayın motoru (`web/lib/publishing`) | #21 (V0.6), #25, #28 → Görev 03/04 | Dry-run; insan onayı; kimlik düzeyinde tekrar engeli; CAS defter (#28) | Otomatik yayın fail-open (`autopublish-fail-open`) |
| İnsan onayı / editoryal | #12, #15 (V0.6) → Görev 04 | Teknik `published` ≠ insan onayı; onay olayları hash zincirli | Onay içerik özetine bağlı değil (Fortress F2); aktör doğrulanmıyor (F3) |
| Güvenlik katmanı (`web/proxy.ts`, `next.config.ts`) | #25, #28 (Claude) | CSP, başlıklar, kapalı-başarısız yönetim rotaları, önizleme kapısı | #26 ile `/yonetim` etkileşimi (`REHEARSAL-PLAN.md`) |
| Yönetim paneli (`web/app/yonetim`, `web/lib/admin-v08`) | #26 → Görev 14 | Kayıtlı kimlik sağlayıcı yoksa erişim kapalı | #28 proxy'si `/yonetim`'i 404 ile önceden yanıtlar |
| Kanıt motoru (`tools/historical-research`, `web/app/arastirma-laboratuvari`) | #19 → #24 → Görev 07/08 | Kanıt ≠ insan onayı; dış kaynak erişimi ≠ doğruluk | #24 lint hatası; taban #14 dalı (V0.6'ya yeniden hedeflenmeli) |
| Kaynak güvenilirliği | #20 → Görev 05 | Puan, insan kararı değildir | Taban #14 dalı |
| Sergiler (`web/app/sergiler`) | #27 → Görev 26 | #23 olmadan uygulanamaz | Taslak sergiler yayında görünmemeli |
| Görsel katman | #23 → Görev 16+ | `globals.css` ve tasarım bileşenleri Antigravity'nin alanında | #25 ile `web/app/arsiv/[slug]/page.tsx` ortak dosya (metin düzeyinde temiz) |
| Atlas | Görev 21/22 (ZIP/patch) | — | **MISSING_ARTIFACT**: `MKA_ATLAS_V07_KAYNAK_KOD.zip` ve `MKA_ATLAS_V07_GITHUB.patch` bu çalışma ortamında bulunamadı; kullanıcıdan istenmeli |
