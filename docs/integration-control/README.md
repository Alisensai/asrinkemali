# MKA entegrasyon kontrol düzlemi — belgeler

Görev 01 (Claude). Araç: `tools/integration-control/`. Rapor anlık görüntüsü: 2026-10-24, hedef V0.6 @ `10cdbfd`.

| Belge | İçerik |
|---|---|
| [PR-INVENTORY.md](PR-INVENTORY.md) | Tüm PR'lar: durum, taban/baş, SHA, CI, içerilme |
| [DEPENDENCY-GRAPH.md](DEPENDENCY-GRAPH.md) | Git DAG, zincirler, ön koşul ihlalleri |
| [ALREADY-INCLUDED.md](ALREADY-INCLUDED.md) | V0.6'da zaten bulunan PR'lar |
| [CONFLICT-MATRIX.md](CONFLICT-MATRIX.md) | Ortak dosyalar, merge-tree, semantik riskler |
| [CI-GATES.md](CI-GATES.md) | Teknik / editoryal / hak / dış kaynak / dağıtım ayrımı |
| [REHEARSAL-PLAN.md](REHEARSAL-PLAN.md) | Gerçekten koşulan izole provalar ve sonuçları |
| [MODULE-CONTRACT-MAP.md](MODULE-CONTRACT-MAP.md) | Modül sözleşmeleri ve sahipler |
| [NEXT-29-TASKS.md](NEXT-29-TASKS.md) | Görev 02–30 devir notları |
| [TEST-RESULTS.md](TEST-RESULTS.md) | Gerçek komutlar ve sonuçlar |
| [SECURITY-NOTES.md](SECURITY-NOTES.md) | Araç güvenliği |
| [ROLLBACK.md](ROLLBACK.md) | Prova geri alma |
| `reports/` | Makine okunur çıktılar (`cli.mjs report`) |

**Değişmez kural:** Bu araç birleştirme yapmaz ve dağıtım yetkisi vermez. 302 editoryal bulgu ancak gerçek insan tarih uzmanı ve editör onaylarıyla kapanır.
