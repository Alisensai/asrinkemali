# Test Raporu — MKA Evidence Engine V0.7

**Tarih:** 2026-10-23 (rev. 2 — danışman düzeltmeleri sonrası)
**Ortam:** Node v20.20.2, bağımlılıksız (yalnız `node:test`), `feature/perplexity-v07-evidence-engine` dalı
**Sonuç: 90/90 test geçti, 0 hata, 0 atlandı.** Süre: ~3,8 sn.

## Test Matrisi (kullanıcı gereksinimleri ↔ testler)

| İstenen test | Test dosyası | Durum |
|---|---|---|
| Arşiv kayıt sayısı analizi | gap-analysis.test.mjs | Geçti |
| Yıl aralığı analizi | gap-analysis.test.mjs (2 test) | Geçti |
| Eksik dönem tespiti | gap-analysis.test.mjs (2 test) | Geçti |
| Kaynak-kayıt ilişkilendirme | dedupe.test.mjs + integration.test.mjs | Geçti |
| Tekrarlanan kaynaklar | dedupe.test.mjs (4 test) | Geçti |
| Aynı bilginin farklı kaynaklarda bulunması | provenance.test.mjs | Geçti |
| Çelişkili tarih bilgisi | provenance.test.mjs (3 test; konu anahtarlı) | Geçti |
| Kaynak kalitesi sınıflandırması | candidates.test.mjs | Geçti |
| Eksik künye | candidates.test.mjs + convert-dryrun.test.mjs | Geçti |
| Geçersiz URL | url-security.test.mjs (2 test) | Geçti |
| Güvensiz URL | url-security.test.mjs (5 test) | Geçti |
| CSV/JSON veri doğrulama (GİRDİ) | adapters.test.mjs (6 test) + report.test.mjs | Geçti |
| İçe aktarma dry-run | convert-dryrun.test.mjs (çoklu) | Geçti |
| İnsan incelemesi olmadan yayımlama engeli | candidates + convert-dryrun + integration | Geçti |
| Boş veri kümesi | gap-analysis.test.mjs | Geçti |
| 500–10.000 sentetik kayıt ölçeği | scale.test.mjs (3+1 test) | Geçti |
| Sentetik kayıtların gerçeklerle karışmaması | scale.test.mjs + helpers | Geçti |

## Rev. 2 ile eklenen testler (danışman bulguları)

| Konu | Test |
|---|---|
| Mutlak yol / `..` geçişli katalog yazma koruması | adapters.test.mjs (göreli, mutlak, katman geçişli) |
| Ayna/türetilmiş kaynakların bağımsız kanıt SAYILMAMASI | provenance.test.mjs (ayna testi) |
| Konu anahtarsız iddiaların yanlış çelişki üretmemesi | provenance.test.mjs |
| Tema eşleştirmede alt dizgi yanlış pozitifleri (`yaşam`→`şam`, `devlet`→`ev`) | gap-analysis.test.mjs |
| Ayrı kayıt vs kayıt-yıl ölçümü ve payın %100'ü aşamaması | gap-analysis.test.mjs |
| Dry-run taslağının gerçek arşiv şemasıyla doğrulanması (`validateArchive`) | integration.test.mjs |
| Çok satırlı hücreli CSV'in RFC 4180 uyumlu geri okunması | report.test.mjs |
| CSV/JSON GİRDİ doğrulama (bozuk satır, eksik sütun, bozuk JSON) | adapters.test.mjs |
| Sağlayıcı adaptör kayıt ve manuel katalog içe aktarma | adapters.test.mjs |
| Keşif düzenleme (dönem/kişi/konu süzme) | adapters.test.mjs |
| Ölçek testinde TÜM 10.000 adayın denetlenmesi (örneklem değil) | scale.test.mjs |

## Gerçek Veri Üzerinde Çalışan Testler (integration.test.mjs)

- Gerçek arşiv yüklemesi: kayıtlar hatasız okunur (≥150 kayıt; PR #14 sonrası 168).
- Gerçek arşivde 1881–1918 ölçüm alanları tutarlı: `distinctRecords`, `recordYearIncidences`, en az bir boş aralık.
- Gerçek aday havuzu: ≥30 aday, 0 sentetik, ≥3 kurum.
- Aday havuzundaki hiçbir URL mevcut arşivle çakışmıyor; havuz içinde tekrar yok.
- Hiçbir aday `import_ready` + insan onaylı değil; dry-run gerçek adayların tamamını blokluyor.
- Dry-run taslağı, gerçek taksonomi + şemalarla `validateArchive`'ten geçer (yeni hata üretmez).

## Ölçek Testleri

| Boyut | Doğrulama |
|---|---|
| 500 / 1.000 / 10.000 kayıt boşluk analizi | Geçti (30 sn üst sınır) |
| 500 aday tekrar analizi | Geçti |
| 10.000 adayın TAMAMININ sentetik koruması | 10.000/10.000 bloklandı |

## Web Paneli Doğrulamaları

- `npx tsc --noEmit`: 0 hata.
- `npx next build`: başarılı; `/arastirma-laboratuvari` dinamik rota.
- Çalışan sunucu testleri:
  - Production + bayrak YOK → **404**
  - Production + `MKA_RESEARCH_LAB=1` → **404** (geliştirme ortamı dışında bayrak yetki DEĞİLDİR)
  - Geliştirme + bayrak → **200**, 32 aday görüntülendi
- Not: panelin görsel düzeni tarayıcıda ekran görüntüsüyle incelenMEDİ; yalnızca HTTP ve içerik denetimi yapıldı.

## Yeniden Çalıştırma

```bash
cd tools/historical-research && npm test
```
