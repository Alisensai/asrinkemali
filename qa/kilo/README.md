# Kilo QA Suite

Bu paket V0.5 entegrasyonundaki gerçek `web/` Next.js uygulamasını denetler.

- `responsive-regression.mjs`: 320×568 ile 1536×1024 arasındaki 10 viewport'ta HTTP durumu ve yatay taşmayı doğrular, ekran görüntüsü üretir.
- `a11y-smoke.mjs`: skip-link odağını ve axe-core serious/critical ihlallerini denetler.
- `run-all.mjs`: iki paketi sıralı çalıştırır ve ilk başarısızlıkta hata kodu döndürür.

Önce `web/` uygulamasını `http://127.0.0.1:4173` adresinde başlatın. Ardından depo kökünde:

```powershell
npm ci
npm run test:next:all
```

JSON raporları ve ekran görüntüleri `qa/kilo/results/` altında üretilir; bu çalışma çıktıları Git'e eklenmez.
