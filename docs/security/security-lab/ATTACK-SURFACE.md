# MKA FORTRESS X — RED TEAM LAB saldırı yüzeyi envanteri

Bu envanter yalnız V1.1 entegrasyon dalındaki kodu kapsar. Laboratuvar varsayılan olarak yalnız `127.0.0.1`, `localhost` veya `::1` hedeflerine istek gönderir.

| Sınıf | Rotalar / alan | Beklenen davranış |
|---|---|---|
| Herkese açık sayfalar | `/`, `/arsiv`, `/kronoloji`, `/ataturk`, `/yayinlar`, `/hakkimizda` | 200; güvenlik başlıkları korunur |
| Salt-okunur API | `/api/health`, `/api/ready`, `/api/health-integration` | GET dışında 405; operasyonel cevaplarda `no-store` |
| Geliştirme araştırma API | `/api/arastirma-laboratuvari/export` | Production'da her formatta 404; geliştirmede açık bayrak gerekir |
| Yönetim yolları | `/admin`, `/yonetim`, `/panel`, `/editor`, `/api/admin/*` | Gerçek sağlayıcı yokken 404; varlık açıklanmaz |
| Arama/filtre | `/arsiv`, `/kronoloji`, `/tarihte-bugun`, `/yayinlar` sorguları | Zararlı/bozuk girdi 5xx veya yürütülebilir içerik üretmez |
| Gizli yollar | `/.env`, `/.git/config`, `/package.json`, traversal varyantları | 404 veya güvenli 400; ayrıntı sızmaz |
| Dosya içe aktarma | Yok | N/A — laboratuvar sahte yükleme rotası oluşturmaz |
| Durum değiştiren API | Yok | N/A — CSRF/IDOR mutasyon testi için gerçek uç nokta yok |
| BLACKOUT | Claude'un `feature/claude-v11-fortress-x-blackout` dalında | N/A — entegrasyona gelince ayrı test adaptörü çalıştırılmalı |

## Sınırlar

Bu laboratuvar SQL veritabanı, gerçek oturum sağlayıcısı, dış HTTP istek yapan URL çekicisi veya dağıtık rate-limit altyapısı olmadığını raporlar; bunları varmış gibi test etmez. Bu alanlar sisteme eklendiğinde yeni davranışsal senaryolar eklenmelidir.
