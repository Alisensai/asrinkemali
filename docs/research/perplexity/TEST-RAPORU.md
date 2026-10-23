# Test Raporu — MKA Evidence Engine V0.7

**Tarih:** 2026-10-23 (rev. 3 — ikinci tur danışman düzeltmeleri sonrası)
**Ortam:** Node v20.20.2, bağımlılıksız (yalnız `node:test`), `feature/perplexity-v07-evidence-engine` dalı
**Sonuç: 100/100 test geçti, 0 hata, 0 atlandı.** Süre: ~4,1 sn.

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

## Rev.3 ile eklenen testler (ikinci tur danışman bulguları)

| Konu | Test |
|---|---|
| Dış içe aktarmada onay bayraklarının SIFIRLANMASI (`state`, `humanReviewed`) | regressions.test.mjs |
| JSON `null` / dizi olmayan girdinin güvenli reddi (exception yok) | regressions.test.mjs |
| Kapanmamış son tırnaklı CSV satırının reddi | regressions.test.mjs |
| Geçersiz yıl değeri taşıyan CSV satırının reddi | regressions.test.mjs |
| `partial` kanıtın tek başına corroborated ÜRETMEMESİ | regressions.test.mjs |
| IPv4-eşlenmiş onaltılık IPv6 özel adresinin reddi (`::ffff:7f00:1`) | regressions.test.mjs |
| Dry-run yürütme yolunun GERÇEK şema doğrulayıcısı kullanması (`convertAndValidate`) | regressions.test.mjs |
| Yıl-kesinlikli ATAM adayının gerçek şemadan geçmesi | regressions.test.mjs |
| Gerçek yükleyicinin 500 kayıt sınırının belgelenmesi (600 dosyalık geçici fixture) | regressions.test.mjs |
| CLI dry-run: 32 adayın tamamı bloklandı (insan onayı yok) | manuel doğrulandı |

## Önemli sınırlar (belgelenmiş)

- **Gerçek arşiv yükleyicisi 500 kayıt üstünde hata üretir** (`scripts/archive/lib/security.mjs` → `MAX_RECORDS=500`, OpenCode'un dosyası).
  1.000+ kayda ölçeklenme, bellek-içi analiz fonksiyonlarında test edildi; GERÇEK yükleme hattı için bu sınırın
  OpenCode tarafında kaldırılması gerekir. Bu, arşiv 500 kaydı aşmadan önce çözülmeli.
- Dry-run `source.publishedAt` yalnız tam tarih (YYYY-MM-DD) kabul eder; yıl-kesinlikli künyelerde alan boş bırakılır
  (yıl, künye metninde ve notta korunur; gün/ay uydurulmaz).

## Görsel Denetim (tarayıcı)

- Panel, gerçek tarayıcıda ekran görüntüleriyle incelendi (1440px): tablo başlıkları görünür, tarih sütunu tek satırda,
  yatay taşma yok, Türkçe karakterler doğru. Tarih sütunu kayması ve düşük kontrast düzeltildi.
- **Site geneli önceden var olan kusur (bu PR'ın kapsamı dışında):** üst barda "Dijital Arşiv" düğmesinin sağında
  "Arş" metni kırpılıyor; `/arsiv` sayfasında da aynı kusur mevcut (SiteHeader bileşeni — ilgili ajanın dosyası).
  Bu PR'da değiştirilmedi.
