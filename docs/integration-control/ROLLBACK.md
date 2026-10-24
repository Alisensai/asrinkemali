# Geri alma — izole prova

Provalar ana depoda kalıcı iz bırakmaz. Yine de elle temizlik gerekirse:

1. **Kalan geçici worktree'leri listeleyin:**
   ```bash
   git worktree list
   ```
   Prova dizinleri `<geçici dizin>/mka-rehearsal-<zaman>-<rastgele>` biçimindedir.
2. **Yalnız prova dizinini kaldırın** (içinde `.mka-rehearsal-owner.json` bulunmalı):
   ```bash
   git worktree remove --force "<dizin>"
   git worktree prune
   ```
3. **Prova commit'leri** yalnız ayrık HEAD üzerinde oluşur. Hiçbir dala bağlanmazlar ve worktree kaldırılınca erişilemez hâle gelirler. `git gc` bunları zamanla temizler. Uzak depoya hiçbir şey gönderilmez.
4. **Doğrulama:** `git for-each-ref refs/heads refs/remotes` çıktısı provadan önceki hâliyle aynı olmalı. Araç bunu her provada `mainRepoUnchanged` alanıyla raporlar.

Araç, sahiplik işareti olmayan, geçici alan dışındaki veya izlenen dosyası değişmiş dizinleri **silmeyi reddeder**.
