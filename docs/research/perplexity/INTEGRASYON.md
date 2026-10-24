# MKA Evidence Engine — Entegrasyon Dokümanı

**Dal:** `feature/perplexity-v07-evidence-engine`
**Tarih:** 2026-10-23

## Amaç

Evidence Engine, arşivin **araştırma ve kaynak keşfi katmanını** kurar. Diğer ajanların
yaptıklarını yeniden yapmaz; onları besleyen bağımsız bir modüldür.

| Ajan | Alanı | Evidence Engine ile ilişkisi |
|---|---|---|
| Codex | Ana entegrasyon | Adımları `AGENTS.md` akışına uygun: dal → PR → elle onay → merge |
| Claude | Atatürk yaşam deneyimi (PR #17) | **Aday → kayıt** akışı onaylandığında Claude'un kronolojik deneyimi otomatik zenginleşir (bkz. aşağıdaki "otomatik yansıma") |
| OpenCode | Arşiv katalogları (PR #14) | Evidence Engine'in `validate`/`load` çekirdeğini birebir yeniden kullanır |
| Copilot | Kalite/editörlük (PR #15) | Aday havuzundaki `verification` bayrakları Copilot kalite denetimine girdi sağlar |
| Antigravity | Tasarım | Panel, MKA bordo/siyah/altın kimliğiyle ayrı modül CSS kullanır; global dosyalara dokunmaz |
| Kilo | Performans/mobil test | Ölçek testleri 500–10.000 kayıt aralığında çalışır; yeni yük yok |

## Veri Akışı

```
Keşif (araştırma)          →  data/research/candidates/pool.json   (aday havuzu, YAYINLANMAMIŞ)
Künye doğrulama            →  verification bayrakları (citationComplete, rightsKnown, urlReachable)
Tekrar/çakışma denetimi    →  URL + kurum arşiv kimliği + mevcut 168 kayıt
İnsan uzman incelemesi     →  durum: awaiting_human_review → import_ready (insan kararı)
Dry-run dönüşüm            →  ArchiveRecord v1.1.0 TASLAK (draft; published üretilemez)
Katalog yazımı             →  YOK. Yalnız insan onayıyla, ayrı PR'da, mevcut kurallarla
```

### Yayın kapısı (kod düzeyinde garanti, testlerle doğrulanır)

- `convertCandidateToDraft` her zaman `verification.status: "draft"` üretir; `published` değeri **üretilemez**.
- `assertNoCatalogWrite`, göreli, **mutlak** ve katman geçişli (`..`) yollar için `data/archive/catalog/`, `content/archive/records/`, `schemas/` yazmalarını reddeder (test edildi).
- Dry-run taslağı, mevcut arşivin gerçek taksonomi ve şemalarıyla `validateArchive` üzerinden doğrulanır; taslak yeni şema hatası üretemez (entegrasyon testi).
- Dry-run URL'si yalnızca kurumsal alan adı beyaz listesinden geçebilir (`scripts/archive/lib/security.mjs` kuralı).
- Aday havuzunda `humanReviewed: true` + `import_ready` durumu olmadan dry-run bile kayıt üretmez.
- Yani: **insan incelemesi olmadan yayımlama, kod düzeyinde engellenir ve otomatik testlerle kanıtlanır.**

## Claude'nin Atatürk Yaşam Deneyimine Yansıma

1. Erken dönem (1881–1918) adayları onaylanıp arşive kayıt olarak girdiğinde (ayrı PR, ayrı onay), kayıtlar `ArchiveRecord` v1.1.0 şemasına uygun JSON olur.
2. Arşiv sorguları `web/lib/archive.ts` üzerinden tüm yayımlanmış kayıtları okur; şemaya uygun yeni kayıtlar arşiv/kronoloji sorgularına otomatik düşer.
3. NOT: Claude'nin deneyim kodu (PR #17) bu turda satır satır incelenMEDİ; "otomatik yansıma" iddiası yalnızca şema uyumu varsayımına dayanır. Doğrulama için PR #17'nin veri okuma katmanının ayrıca gözden geçirilmesi önerilir.
4. `recordYearRange` boşluk analizi, yeni kayıtlarla otomatik daralır; `gap-report` komutu her çalıştırmada güncel durumu raporlar.

## Komutlar

```bash
node tools/historical-research/cli.mjs gap-report           # 168 kayıtlık arşivde boşluk analizi
node tools/historical-research/cli.mjs pool-status          # aday havuzu özeti
node tools/historical-research/cli.mjs dry-run --all        # adayların dry-run dönüşümü (yalnız taslak)
node tools/historical-research/cli.mjs claims               # iddia-kanıt ağı özeti
node tools/historical-research/cli.mjs verify-url URL       # tek URL yapısal güvenlik denetimi
cd tools/historical-research && npm test                    # 75 otomatik test
```

## Panel Erişimi (yalnızca geliştirme ortamı)

```bash
cd web && MKA_RESEARCH_LAB=1 npm run dev    # http://localhost:3000/arastirma-laboratuvari
```

- Panel yalnızca `NODE_ENV` production OLMADIĞINDA ve `MKA_RESEARCH_LAB=1` bayrağıyla açılır; production ortamında bayrak set edilse bile **404** döner (test edildi).
- Sayfa `force-dynamic`'tir; aday verisi statik pakete girmez.
- Yönetici yetkilendirmesi kurulana kadar ortam bayrağı + geliştirme ortamı çift kuralı geçerlidir; kimlik doğrulama varmış gibi davlanılmaz.
- **Kapsam notu:** Bu panelin mevcut sürümü minimal bir aday listesi görünümüdür. Filtreleme, kaynak detay incelemesi, karşılaştırma, boşluk haritası görselleştirme, ilişki grafiği ve dışa aktarma denetimleri HENÜZ UYGULANMADI (bkz. Gelecek Adımlar).

## Gelecek Adımlar

1. İBB Atatürk Kitaplığı ve TBMM dijital koleksiyonlarından erken dönem adaylarının keşfi.
2. Eksik künyeli 8 adayın künye tamamlaması (kurum sayfalarından).
3. Telif/lisans doğrulama adımının insan inceleme sürecine bağlanması.
4. `claims.json` iddia ağının genişletilmesi; çelişkili tarih örneklerinin insan uzmana raporlanması.
5. Panelde boşluk haritası görselleştirmesinin eklenmesi (veri mevcut: `gap-report --format json`).
