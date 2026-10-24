# MKA Görev 30 Geri Alma (Rollback) Planı

**PROJE:** ASRIN KEMALİ (MKA)  
**GÖREV:** 30 / 30 — ANTIGRAVITY

---

## 1. Geri Alma Prosedürü

Görev 30 bir audit (denetim) ve test görevidir. Üretim veritabanı, arşiv katalog şemaları veya gizli anahtarlar değiştirilmemiştir.

Değişikliklerin geri alınması gerekirse:

1. **Önceki Görev Dalına Dönüş**:
   ```bash
   git checkout feature/antigravity-v08-qwen-explore-ui
   ```

2. **Dalı Yerel Olarak Silme**:
   ```bash
   git branch -D feature/antigravity-v09-final-visual-release-audit
   ```

3. **Uzaktaki Dalı ve PR'ı Kapatma**:
   ```bash
   gh pr close 53 --delete-branch
   ```
