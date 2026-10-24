# MKA FORTRESS X — RED TEAM LAB

`tools/security-lab/run.mjs`, yerel bir production Next.js sunucusuna karşı 37 güvenlik senaryosu çalıştırır ve JSON kanıtı üretir. Hedefi `MKA_SECURITY_LAB_BASE_URL` ile verilebilir; motor döngüsel geri dönüş adresleri dışındaki hedefleri isteği göndermeden reddeder. `localhost` verildiğinde istek, DNS yeniden çözümlemesini önlemek için fetch öncesi `127.0.0.1` literaline sabitlenir.

Örnek yerel kullanım:

```powershell
cd web
npm run build
npm run start -- --hostname 127.0.0.1 --port 49499
# başka bir terminalde, depo kökünden:
node tools/security-lab/run.mjs
```

Rapor varsayılan olarak `docs/security/security-lab/reports/latest.json` konumuna yazılır. JSON, geçen, başarısız ve uygulanamaz senaryoları ayrı sayar. Kanıt çıktısı yalnız izinli güvenlik başlıklarını içerir; `Set-Cookie`, yetkilendirme, token, sır ve kimlik bilgisi başlıkları hiç saklanmaz. `Location` değeri ham olarak yazılmaz; yalnız aynı-origin, dış-origin-engellendi veya bozuk-konum durumu tutulur.

BLACKOUT senaryoları bu entegrasyon dalında henüz yoktur. Claude'un ayrı dalına dokunmadan N/A sayılır; kod entegre edildiğinde yanlış alarm, tekil sinyal, çoklu güvenilir sinyal, depo kesintisi, yetkisiz lockdown, ayrık onay, güvenli moda giriş/çıkış ve kanıt korumasını sınayan adaptör eklenmelidir.

Bu sınıflandırma 24 Ekim 2026'da Claude dalının (`8bf7dea7eb3498742b3b16d091a1bd05c39af17f`)
izole, salt-okunur checkout'ında doğrulandı: `web/tests/security-blackout.test.mjs` 21 geçti,
0 başarısız oldu. Bu, temel dalın bileşimini değiştirmez ve BLACKOUT'u V1.1'e entegre edilmiş
gibi göstermez.
