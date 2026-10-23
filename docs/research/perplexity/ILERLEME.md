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
| 5 | Otomatik testler (node:test) | Tamamlandı — 137 test, 0 hata |
| 6 | Gerçek arşiv boşluk analizi raporu | Tamamlandı — bkz. `BOSLUK-RAPORU-2026-10-23.md` |
| 7 | Gerçek kaynak adayı araştırması (1881–1918) | Tamamlandı — 36 aday, 0 sentetik |
| 8 | Web paneli `/arastirma-laboratuvari` (yalnız dev) | Tamamlandı — kapı `MKA_RESEARCH_LAB=1` |
| 9 | Entegrasyon dokümanı | Tamamlandı — bkz. `INTEGRASYON.md` |
| 10 | Test raporu | Tamamlandı — bkz. `TEST-RAPORU.md` |
| 11 | Push + taslak PR | Tamamlandı — PR #18 (taslak) |

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
- 2026-10-23: Aşama 3–5: çekirdek modül + 137 test yazıldı, tamamı geçti.
- 2026-10-23: Aşama 6: gerçek 168 kayıtlık arşivde boşluk analizi çalıştırıldı.
- 2026-10-23: Aşama 7: 36 gerçek kaynak adayı toplandı ve doğrulandı (ayrıntılar
  `KAYNAK-ADAYLARI-RAPORU.md`).
- 2026-10-23: Aşama 8: dev-özel laboratuvar paneli eklendi; production'da kapalı.
- 2026-10-23: Aşama 9–11: entegrasyon dokümanı, test raporu, push ve taslak PR #18.
