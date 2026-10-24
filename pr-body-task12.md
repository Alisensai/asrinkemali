### Amaç
MKA Search Evaluation Lab (Görev 12 / MKA-COPILOT-12-SEARCH-EVALUATION): Arama ve sıralama kalitesini API maliyeti ve dış ağ bağımlılığı olmadan ölçen, Precision@K, Recall@K, MRR ve nDCG@K metriklerini standart formüllerle hesaplayan, ReDoS ve CSV formül enjeksiyonuna karşı korumalı çevrimdışı değerlendirme laboratuvarının kurulması.

### Etkilenen Dosyalar
- `tools/search-evaluation/package.json`
- `tools/search-evaluation/src/metrics/precision.mjs`
- `tools/search-evaluation/src/metrics/recall.mjs`
- `tools/search-evaluation/src/metrics/mrr.mjs`
- `tools/search-evaluation/src/metrics/ndcg.mjs`
- `tools/search-evaluation/src/metrics/index.mjs`
- `tools/search-evaluation/src/ranker/local-lexical.mjs`
- `tools/search-evaluation/src/ranker/reranker.mjs`
- `tools/search-evaluation/src/queries/queries.mjs`
- `tools/search-evaluation/src/evaluator.mjs`
- `tools/search-evaluation/src/cli.mjs`
- `tools/search-evaluation/tests/metrics.test.mjs`
- `tools/search-evaluation/tests/ranker.test.mjs`
- `tools/search-evaluation/tests/security.test.mjs`
- `docs/search-evaluation/README.md`
- `docs/search-evaluation/METRICS.md`
- `docs/search-evaluation/BENCHMARK-REPORT.md`

### Çalıştırılan Komutlar ve Test Sonuçları
- `npm --prefix tools/search-evaluation test`: 9/9 birim testi GEÇTİ.
- `node tools/search-evaluation/src/cli.mjs report`: 168 kayıt ve 12 sorgu üzerinde MRR 0.87, P@1 0.80, nDCG@5 0.7850, negatif sorgu doğruluğu %100 olarak başarıyla ölçüldü.
- `npm --prefix web test`: 90/90 web testi GEÇTİ.
- `npm --prefix web run typecheck`: 0 hata.

### Güvenlik ve Uyumluluk
- Haricî ücretli API veya API Key kullanılmamıştır; tüm testler yerel ve çevrimdışıdır.
- Ham sorguların RegExp içine enjeksiyonu engellenmiş, ReDoS açığı kapatılmıştır.
- CSV dışa aktarımı formül enjeksiyonuna (`=`, `+`, `-`, `@`) karşı korunmuştur.
- Arşiv katalogları salt-okunur taranmış; orijinal kayıtlara asla müdahale edilmemiştir.

### Kalan Eksikler
- Canlı arama sunucusu entegrasyonu (Görev 10 DeepSeek V2 ve Görev 15 Büyük Entegrasyon ile birleştirilecektir).
