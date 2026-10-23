# GitHub ilk kurulum — tek defalık

GitHub'da kullanıcının hesabı altında **ayrı** `asrinkemali` adlı depo oluşturuldu. Başlangıç dosyaları bu proje klasöründedir.

1. GitHub deposu: `https://github.com/Alisensai/asrinkemali.git`.
2. ZIP'i çıkarıp klasörü VS Code/Antigravity'de aç. İlk yükleme gerekirse terminalde:

```powershell
git init
git add .
git commit -m "feat: initial Asrin Kemali interactive prototype"
git branch -M main
git remote add origin https://github.com/Alisensai/asrinkemali.git
git push -u origin main
```

İlk GitHub deposu varsayılan README ile oluşturulmuşsa push çatışabilir; **repo oluştururken** README eklememek kolaylaştırır. Eğer repo adresi başka olacaksa `git remote` URL'sini değiştir.

3. Antigravity, Codex, OpenCode, Kilo, Cline ve Copilot'ta aynı `asrinkemali` klasörünü veya GitHub deposunun clone'unu aç. Her biri kendi branch'inde çalışsın. `agent-prompts/` dosyalarından uygun görevi kopyala.
4. GitHub Actions, deployment veya domain bağlantısı daha sonra doğrulanacak. Henüz web yayını yok.
