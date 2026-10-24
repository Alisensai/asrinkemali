# Editoryal güven aracı (Görev 04)

İnsan onayı **vermez**. Gerçek insan kararları henüz yokken yayını güvenli biçimde engelleyen ve bu kararların ileride güvenilir biçimde kaydedilebilmesini sağlayan çekirdeği raporlar.

- Çekirdek mantık tek yerde: `web/lib/editorial-trust/*.ts`. CLI, Node 24 tip ayıklamasıyla aynı dosyaları içe aktarır; kopya mantık yoktur.
- Varsayılan davranış salt-okunurdur. Rapor yalnız açık `--output` ile ve yalnız izinli dizine yazılır: `docs/editorial/trust-gates/reports/` veya işletim sistemi geçici dizini.
- `--approve-all`, `--publish-all`, `--auto-fix-approvals` gibi komutlar **yoktur** ve reddedilir (çıkış 2).

## Komutlar

```bash
node tools/editorial-trust/cli.mjs audit --root . --output docs/editorial/trust-gates/reports
```

```bash
node tools/editorial-trust/cli.mjs review-status --root . --format json
```

```bash
node tools/editorial-trust/cli.mjs gate-check --root . --technical-tests passed
```

```bash
node tools/editorial-trust/cli.mjs snapshot-diff --record-id anitkabir --root .
```

```bash
node tools/editorial-trust/cli.mjs inspect-form --record-id anitkabir --root .
```

```bash
node tools/editorial-trust/cli.mjs compatibility --root .
```

Ortak seçenekler:

| Seçenek | Değerler |
|---|---|
| `--format` | `json`, `md`, `csv` |
| `--now` | Saat dilimli ISO 8601 (belirlenimci rapor için) |
| `--technical-tests` | `passed`, `failed`, `unknown` |

## Çıkış kodları

| Kod | Anlam |
|---|---|
| 0 | Analiz başarılı. Yayına hazır anlamına **gelmez**. |
| 1 | İş kuralı engeli. `gate-check` için: `release_ready=false`. Bugün gerçek repoda beklenen sonuç budur. |
| 2 | Yanlış kullanım veya geçersiz parametre |
| 3 | Veri okunamıyor ya da güvenlik sınırı ihlali (yol geçişi, izinsiz çıktı dizini, eksik katalog) |

## Testler ve ölçek

```bash
node --test tools/editorial-trust/tests/*.test.mjs
```

```bash
node tools/editorial-trust/bench/scale.mjs 500 2000 10000
```

Ölçek denemesi sentetik dosyaları yalnız geçici dizinde üretir ve sonunda siler.

Ayrıntılar: `docs/editorial/trust-gates/`.
