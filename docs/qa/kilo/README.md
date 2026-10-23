# Kilo V0.6 QA Paketi

Bu dizin V0.5 uygulamasýnýn baðýmsýz QA'sý ve V0.6 için yeniden kullanýlabilir testler içerir.

## Dizinyapýsý
- `qa/kilo/scripts/` - Otomatik scriptler (responsive, a11y, performans)
- `web/e2e/kilo-v06/` - Playwright E2E testleri
- `docs/qa/kilo/` - Raporlar, test planý, hata tablosu

## Çalýþtýrma
```bash
npm run test:next:responsive
npm run test:next:a11y
npm run test:next:all
```

```bash
cd web
npx playwright test
```
