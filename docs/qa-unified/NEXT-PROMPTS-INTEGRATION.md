# Yeni modüller için QA kontratı

Her bağımsız modül `tools/qa-unified/manifest.json` içindeki `modules` dizisine bu alanları eklemelidir:

```json
{
  "moduleId": "archive-reliability",
  "featureBranch": "feature/example-module",
  "sourcePr": 123,
  "routes": ["/example"],
  "requiredData": [],
  "requiresAuth": false,
  "requiresHumanApproval": false,
  "unitCommand": "node tools/qa-unified/cli.mjs run --suite=example --mode=unit",
  "e2eSpecPaths": ["web/e2e/qa-unified/example.spec.ts"],
  "productionVisibilityPolicy": "Describe the exact policy; do not infer public visibility.",
  "reportLocation": "qa/results/<run-id>"
}
```

- Route ve test yolu mevcut branch'te dosyaya bağlanmalıdır. Modül yoksa `NOT_INTEGRATED` / `NOT_APPLICABLE`, test koşmadıysa `NOT_RUN`.
- Modül kendi stable test ID'lerini, owner'ını ve test koşulunu manifestte belirtmelidir. Katalog/snapshot sayısı sabitlenmez.
- `requiresAuth` ve `requiresHumanApproval` ayrı alanlardır. Gerçek auth/onay üretmek ya da kapıyı gevşetmek QA görevi değildir.
- Komutlar trusted manifestte sabit argv olarak tanımlanır; remote URL, dynamic `eval`/import, shell string veya CLI'dan serbest komut yürütülmez.
- E2E çıktıları her çalıştırmada unique `qa/results/<run-id>` altındadır. Modül doğrudan kaynak dizinine fixture/screenshot yazmaz.
- Üretim ve development server farklı run mode olarak raporlanır. Yetki/yayın görünürlüğü production'da da kontrol edilmelidir.
