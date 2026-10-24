# tools/integration-control — MKA entegrasyon kontrol düzlemi

Bağımlılıksız Node.js (≥ 22) ESM CLI. GitHub'dan **yalnız okur** (`gh api -X GET`). Varsayılan olarak hiçbir dosyaya veya uzak depoya **yazmaz**. Birleştirme yapmaz; provalar işletim sistemi geçici dizinindeki ayrık (detached) worktree'lerde çalışır ve ana depoyu değiştirmediklerini doğrular.

## Ön koşullar

- `git` ≥ 2.38 (`merge-tree --write-tree`), `gh` ve salt-okunur depo erişimi (`gh auth status`)
- PR baş commit'leri yerelde bulunmalı (içerilme ve prova için):
  `git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'`

## Komutlar

```bash
node tools/integration-control/src/cli.mjs collect --out=$TMP/snapshot.json            # canlı, salt-okunur toplama (~28 PR ≈ 80 sn)
node tools/integration-control/src/cli.mjs inventory --snapshot=$TMP/snapshot.json --format=md
node tools/integration-control/src/cli.mjs graph     --snapshot=$TMP/snapshot.json      # Mermaid + topolojik sıra
node tools/integration-control/src/cli.mjs conflicts --snapshot=$TMP/snapshot.json      # ortak dosya, merge-tree, semantik kurallar
node tools/integration-control/src/cli.mjs gates     --report=release-quality.json      # teknik/editoryal/hak/dış kaynak ayrımı
node tools/integration-control/src/cli.mjs plan      --prs=25,23 --snapshot=...         # yalnız plan (varsayılan)
node tools/integration-control/src/cli.mjs rehearse  --prs=25,28,26 --snapshot=... --execute-rehearsal --commands=install,e2e:e2e/admin-v08.spec.ts
node tools/integration-control/src/cli.mjs tasks                                       # 30 görevlik manifest + doğrulama
node tools/integration-control/src/cli.mjs report    --snapshot=...                    # docs/integration-control/reports/* üretir
```

`--snapshot` verilmezse canlı GitHub sorgulanır. `--out` yalnız `docs/integration-control/reports/` veya işletim sistemi geçici dizini altına yazabilir. Prova komutları: `install`, `unit`, `typecheck`, `lint`, `build`, `archive`, `e2e:<e2e/…spec.ts>` (desen denetimli).

## Çıkış kodları

| Kod | Anlam |
|---|---|
| 0 | başarılı |
| 1 | doğrulama, prova veya sıra hatası |
| 2 | kullanım hatası |
| 3 | envanter **stale**: anlık görüntü 24 saatten eski veya baş SHA değişmiş |

## Testler

```bash
node --test tools/integration-control/tests/*.test.mjs
```

`git.test.mjs` gerçek geçici git depoları kurar: ata, eşdeğer ve kısmi içerilme; gerçek satır çakışması; prova güvenliği; zaman aşımı.

Mimari ve güvenlik ayrıntıları: `docs/integration-control/`.
