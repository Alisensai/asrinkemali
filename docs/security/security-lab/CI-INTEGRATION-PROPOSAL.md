# RED TEAM LAB — CI entegrasyon önerisi

Bu belge bir workflow değişikliği değildir. Gemini'nin DevSecOps dosyalarının sahipliğine
dokunmadan, ilgili sahip tarafından uygulanabilecek en küçük entegrasyon sözleşmesini verir.

## Önerilen bağımsız job

`red-team-lab` adlı iş, mevcut lint/typecheck/build işlerinden sonra ayrı bir Ubuntu
runner'da çalışmalıdır. Önerilen adımlar:

```text
cd web && npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 49499 &
node tools/security-lab/run.mjs
```

İş, rapor özetinde `failed > 0` olduğunda başarısız olmalıdır. `na` sonuçları ayrı
raporlanmalı, başarılı sayılmamalı ve işi tek başına kırmamalıdır. `latest.json` kısa
süreli CI artefaktı olarak saklanabilir; rapor zaten sır/çerez/ham yönlendirme değeri
içermemelidir.

## Çakışmama kuralları

- Gemini sahipliğindeki workflow YAML dosyaları bu PR'da değiştirilmez.
- Job yalnız kendi `127.0.0.1:49499` sürecine bağlanır; başka ajan sunucusuna veya dış
  ağa istek atmaz.
- BLACKOUT ve SQL N/A durumları artefakta görünür biçimde yazılır. Bunlar otomatik
  başarıya dönüştürülmez; ilgili bileşenler entegre edildiğinde senaryolar genişletilir.
