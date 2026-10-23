# MKA EVIDENCE ENGINE V0.7 — İlerleme Defteri

**Dal:** `feature/perplexity-v07-evidence-engine`
**Temel dal:** `feature/opencode-v06-archive-expansion` (başlangıç SHA: `334a8d8ff8075a2adf3a43f558709950297bb81c`)
**Ajan:** Perplexity (bu belge)
**Son güncelleme:** 2026-10-23

Bu dosya oturum kesilirse önceki çalışmanın kaybolmaması için her aşamada
güncellenen ilerleme defteridir.

## Aşamalar

| # | Aşama | Durum |
|---|---|---|
| 1 | GitHub erişimi doğrulama (okuma + yazma) | Tamamlandı — `gh` CLI `Alisensai` hesabıyla tam yetkili (push: true) |
| 2 | Depo incelemesi (şema, katalog, PR #14/#15/#17) | Tamamlandı — bkz. `DEPO-ANALIZI.md` |
| 3 | Veri sözleşmesi (`tools/historical-research/lib/types.mjs`) | Tamamlandı |
| 4 | Çekirdek yazılım (okuyucu, boşluk analizi, aday havuzu, URL güvenliği, tekrar, provenans, dry-run) | Tamamlandı |
| 5 | Otomatik testler (node:test) | Tamamlandı — 90 test, 0 hata (rev.2 düzeltmeleriyle) |
| 6 | Gerçek arşiv boşluk analizi raporu | Tamamlandı — bkz. `BOSLUK-RAPORU-2026-10-23.md` |
| 7 | Gerçek kaynak adayı araştırması (1881–1918) | Tamamlandı — 32 aday, 0 sentetik |
| 8 | Web paneli `/arastirma-laboratuvari` (yalnız dev) | Tamamlandı — kapı `MKA_RESEARCH_LAB=1` |
| 9 | Entegrasyon dokümanı | Tamamlandı — bkz. `INTEGRASYON.md` |
| 10 | Test raporu | Tamamlandı — bkz. `TEST-RAPORU.md` |
| 11 | Push + taslak PR | Tamamlandı — PR #19 (taslak) |

## Kritik kararlar

1. **Şema uyumu:** Aday → arşiv dönüşümü mevcut `ArchiveRecord` v1.1.0
   sözleşmesine (`schemas/archive-record.types.ts`) birebir uyar; doğrulama
   için `scripts/archive/lib/validate.mjs` yeniden kullanılır.
2. **Yayın kapısı:** Dönüştürücü yalnızca `draft` üretir. `published` durumu
   insan uzman onayı olmadan hiçbir koşulda üretilemez (kod düzeyinde engelli).
3. **Katalog koruması:** `data/archive/catalog/` ve `content/archive/records/`
   yollarına yazma, kod düzeyinde yasaklanmıştır (guard). Dışa aktarım yalnızca
   `data/research/candidates/exports/` dizinine olur.
4. **URL güvenliği:** Ağ getirmesi varsayılan olarak kapalıdır; yalnızca yapısal
   doğrulama + izinli DNS çözümlemesi yapılır. SSRF karşıtı kurallar
   `lib/url-security.mjs` içinde.
5. **Tekrar tespiti:** URL normalizasyonu + kurum arşiv kimliği + başlık/yıl
   benzerliği; aynı özgün belgeden türeyen sayfalar bağımsız kanıt sayılmaz.
6. **Sentetik izolasyon:** Sentetik test verisi `synthetic: true` bayrağı taşır
   ve gerçek aday havuzuna asla karışmaz (test düzeyinde doğrulanır).

## Değişiklik günlüğü

- 2026-10-23: Aşama 1–2 tamamlandı; depo analizi yazıldı.
- 2026-10-23: Aşama 3–5: çekirdek modül + 90 test yazıldı, tamamı geçti (rev.2: mutlak yol koruması, ayna kanıt, şema doğrulaması, CSV/JSON girdi, adaptörler).
- 2026-10-23: Aşama 6: gerçek 168 kayıtlık arşivde boşluk analizi çalıştırıldı.
- 2026-10-23: Aşama 7: 32 gerçek kaynak adayı toplandı ve doğrulandı (ayrıntılar
  `KAYNAK-ADAYLARI-RAPORU.md`).
- 2026-10-23: Aşama 8: dev-özel laboratuvar paneli eklendi; production'da kapalı.
- 2026-10-23: Aşama 9–11: entegrasyon dokümanı, test raporu, push ve taslak PR #19
  (https://github.com/Alisensai/asrinkemali/pull/19, commit 220ec54).

## Rev.2 — Danışman düzeltmeleri (2026-10-23)

1. `assertNoCatalogWrite` mutlak yol ve `..` geçişli çağrıları da yakalar (test edildi).
2. Panel yalnızca geliştirme ortamında açılır; production'da bayrak set olsa bile 404.
3. ATAM yayın yılları yıl-kesinliğine indirgendi (`2008`, `2023`, `2025`); Şemsi Efendi adayından dayanaksız `eventYear` çıkarıldı.
4. İddia 006/007/010 ifadeleri kaynak kapsamı iddialarına daraltıldı (komuta süresi iddiası verilmedi).
5. Devlet Arşivleri derlemesi ikincil olarak yeniden sınıflandırıldı.
6. `rightsKnown` anlamı "hak bilgisi kayıtlı"ya indirgendi; dry-run `rightsVerified: false` üretir.
7. Boşluk ölçümleri ayrıldı: `distinctRecords` (4, %2,4) ve `recordYearIncidences`; tema sayımı yalnızca hedef dönem kayıtlarından.
8. Tema eşleştirme kelime-sınırlı yaptı; `yaşam`→`şam` yanlış pozitifleri test edildi.
9. Ayna/türetilmiş kaynaklar bağımsız kanıt sayılmıyor (evaluateClaim).
10. Tarih çelişkisi yalnızca aynı konu anahtarlı iddialar arasında aranıyor.
11. Dry-run taslağı gerçek `validateArchive` ile doğrulanıyor; kurumsal alan adı beyaz listesi uygulanıyor.
12. CSV/JSON girdi doğrulama, sağlayıcı adaptör kaydı ve keşif süzme yetenekleri eklendi.
13. Ölçek testi 10.000 adayın tamamını denetliyor; kırılgan sabit beklentiler kaldırıldı.
14. Aday → iddia karşılıklı bağlantıları havuza işlendi; rapor tablosuna URL sütunu eklendi.
