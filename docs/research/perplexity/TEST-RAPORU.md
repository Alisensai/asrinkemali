# Test Raporu — MKA Evidence Engine V0.7

**Tarih:** 2026-10-23
**Ortam:** Node v20.20.2, bağımlılıksız (yalnız `node:test`), `feature/perplexity-v07-evidence-engine` dalı
**Sonuç: 75/75 test geçti, 0 hata, 0 atlandı.** Süre: ~2,1 sn.

## Test Matrisi (kullanıcı gereksinimleri ↔ testler)

| İstenen test | Test dosyası | Durum |
|---|---|---|
| Arşiv kayıt sayısı analizi | gap-analysis.test.mjs | Geçti |
| Yıl aralığı analizi | gap-analysis.test.mjs (2 test) | Geçti |
| Eksik dönem tespiti | gap-analysis.test.mjs (2 test) | Geçti |
| Kaynak-kayıt ilişkilendirme | dedupe.test.mjs + integration.test.mjs | Geçti |
| Tekrarlanan kaynaklar | dedupe.test.mjs (4 test) | Geçti |
| Aynı bilginin farklı kaynaklarda bulunması | provenance.test.mjs | Geçti |
| Çelişkili tarih bilgisi | provenance.test.mjs (2 test) | Geçti |
| Kaynak kalitesi sınıflandırması | candidates.test.mjs | Geçti |
| Eksik künye | candidates.test.mjs + convert-dryrun.test.mjs | Geçti |
| Geçersiz URL | url-security.test.mjs (2 test) | Geçti |
| Güvensiz URL | url-security.test.mjs (5 test) | Geçti |
| CSV/JSON veri doğrulama | report.test.mjs (3 test) | Geçti |
| İçe aktarma dry-run | convert-dryrun.test.mjs (çoklu) | Geçti |
| İnsan incelemesi olmadan yayımlama engeli | candidates.test.mjs + convert-dryrun.test.mjs + integration.test.mjs | Geçti |
| Boş veri kümesi | gap-analysis.test.mjs | Geçti |
| 500–10.000 sentetik kayıt ölçeği | scale.test.mjs (3+1 test) | Geçti |
| Sentetik kayıtların gerçeklerle karışmaması | scale.test.mjs + helpers | Geçti |

## Gerçek Veri Üzerinde Çalışan Testler (integration.test.mjs)

- Gerçek arşiv yüklemesi: **168/168 kayıt**, 0 yükleme hatası.
- Gerçek arşivde 1881–1918 payı %30'un altında ve en az bir boş aralık raporlanıyor.
- Gerçek aday havuzu: ≥30 aday, 0 sentetik, ≥3 kurum.
- Aday havuzundaki hiçbir URL mevcut arşivle çakışmıyor; havuz içinde tekrar yok.
- Hiçbir aday `import_ready` + insan onaylı değil; dry-run gerçek adayların tamamını blokluyor.

## Ölçek Testleri

| Boyut | Süre (yaklaşık) | Doğrulama |
|---|---|---|
| 500 kayıt | < 1 sn | Geçti |
| 1.000 kayıt | < 1,5 sn | Geçti |
| 10.000 kayıt | < 15 sn | Geçti |
| 10.000 adaydan 200 örneklemde sentetik koruması | anlık | 200/200 bloklandı |

Üst limit 30 sn olarak sabitlendi; 10.000 kayıtta analiz derinlemesine (yıl dağılımı + tema
araması) çalışır ve kayıt sayısı 1.000'e çıktığında ek ayar gerektirmez.

## Web Paneli Doğrulamaları (manuel + derleme)

- `npx tsc --noEmit`: 0 hata.
- `npx next build`: başarılı; `/arastirma-laboratuvari` dinamik rota.
- Çalışan sunucu testi: bayrak yokken **404**, `MKA_RESEARCH_LAB=1` ile **200** ve 32 aday
  görüntülendi; aday verisi statik pakete girmiyor.

## Yeniden Çalıştırma

```bash
cd tools/historical-research && npm test
```
