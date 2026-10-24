# MKA FORTRESS Phase 1 — rapor

- **Dal:** `feature/claude-v08-fortress-foundation`
- **Taban:** `feature/claude-v06-integration-hardening` @ `35f7497` (PR #25)

> **Bu çalışma V1.0 MKA FORTRESS onayı DEĞİLDİR.** Gerçek dağıtım altyapısı, kimlik sağlayıcı, dal koruması, hız sınırlama ve yetkili insan incelemeleri olmadan nihai güvenlik onayı verilemez.

## 1. Gerçek bulgular

| # | Bulgu | Önem | Durum |
|---|---|---|---|
| F1 | CSP yoktu; XSS etkisi sınırlanamıyordu | Yüksek | **Giderildi**: zorunlu temel CSP. Önce Report-Only olarak yayımlandı; Chromium, Firefox ve WebKit'te tüm rotalarda 0 ihlal kanıtlandıktan sonra zorunlu yapıldı. |
| F2 | Onaylar **form** özetine bağlı, **kayıt içeriğine** değil; onaydan sonra kayıt değişirse fark edilmiyor | Kritik | **Tespit eklendi** (`integrity.mjs diff` → `reReviewRequired`) ve **sözleşme eklendi** (`verifyApprovalBinding`). Önleme için editoryal şema değişikliği gerekiyor (öneri). |
| F3 | Onay defterinde aktör kimliği doğrulanmıyor (`actor_role` serbest yazılabiliyor) | Kritik | **Açık**: kimlik sağlayıcı veya imzalı commit gerekiyor. |
| F4 | `334a8d8` ile 3 link-only fotoğraf kaydının `source.url`'si kurumsal sayfadan ham `.jpg` dosyasına çevrilmiş; 2'si yayında (`meclis-onunde-dua-1920`, `tbmm-acilis-fotografi-1920`) | Orta (hak/bağlam) | **Raporlandı**: `LINK_ONLY_SOURCE_IS_MEDIA_FILE` uyarısı, kurumsal sayfa önerisiyle. Kayıtlar değiştirilmedi; karar OpenCode ve editörlere ait. |
| F5 | Planlayıcı tek başına eşzamanlı iki çalışmada aynı yazıyı iki kez planlayabiliyordu | Yüksek (gelecek) | **Giderildi**: `recordPublication` karşılaştır-ve-yaz. |
| F6 | Silinmiş veya yayından çekilmiş arşiv kaydına bağlı yazı planlanabiliyordu | Orta | **Giderildi**: `withArchiveReferenceGate` (dry-run'da etkin). |
| F7 | Yönetim paneli için kapalı-başarısız sınır yoktu | Kritik (gelecek) | **Giderildi**: kayıtlı sağlayıcı yokken `/admin`, `/yonetim`, `/panel`, `/editor` ve `/api/admin` her ortamda 404. |
| F8 | Önizleme için gerçek erişim denetimi yoktu | Yüksek | **Giderildi**: HTTP Basic kapısı; yapılandırma eksikse 503. Gerçek sunucuda doğrulandı. |
| F9 | CI üçüncü taraf eylemleri etiketle sabitlenmiş (9 kullanım) | Orta | Yeni `security.yml` SHA ile sabitlendi. **Mevcut 3 iş akışı açık** (başka ajanların dosyaları; öneri). |
| F10 | Sağlık uç noktası yoktu; `/api/health-integration` sayıları derleme anında statik | Düşük | **Giderildi**: `/api/health` (minimal), `/api/ready` (ad/boolean, 503), ikisi de no-store. |
| F11 | Sunucu günlüklerinde redaksiyon yoktu | Orta | **Giderildi**: `lib/server/log.ts`. |
| F12 | Birim test globu (`tests/**/*.test.mjs`) alt klasör eklendiğinde CI kabuğunda üst klasördeki testleri sessizce dışarıda bırakabilir | Orta (test altyapısı) | **Kaçınıldı**: güvenlik testleri düz `tests/security-*.test.mjs` adıyla tutuldu. Script'in tırnaklanması önerilir. |

**Sorunsuz bulunanlar:**
- İzlenen 634 dosyada sır yok; `.env` commitlenmemiş; tek public değişken `NEXT_PUBLIC_SITE_URL`.
- İstemci paketinde sır ve sunucu yolu sızıntısı yok.
- `npm audit`: 0 açık.
- Kilit dosyaları tutarlı; tüm paketler npm kayıt defterinden, sha512 bütünlük özetiyle.
- İş akışları salt-okunur izinli, gizli değişken yok, `pull_request_target` yok.
- Kaynak bağlantı aracında SSRF koruması mevcut.
- XSS, açık yönlendirme ve path traversal denemeleri başarısız (güvenlik e2e).

## 2. Güvenlik başlıkları ve CSP

| Başlık | Değer |
|---|---|
| `Content-Security-Policy` (zorunlu) | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; …` |
| `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`, `X-DNS-Prefetch-Control` | tüm rotalarda (sayfa, 404, API, sitemap) |
| `Strict-Transport-Security` | yalnız `ASRIN_ENABLE_HSTS=1` ve production'da |
| `X-Powered-By` | kaldırıldı |
| `Cache-Control` | `/api/health` ve `/api/ready` için `no-store` |

**Sınır:** `script-src 'unsafe-inline'` Next.js satır içi betikleri nedeniyle gerekiyor. Nonce tabanlı katı CSP (proxy'de nonce üretimi) V1.0 işidir. Pozitif kontrol testi, politikanın dış kökenli betiği ve çerçeveyi gerçekten engellediğini doğruluyor.

## 3. Test sonuçları (bu dal)

| Paket | Sonuç |
|---|---|
| TypeScript / ESLint | temiz |
| Web unit | **64/64** (24 yeni güvenlik testi) |
| Fortress araç testleri | **15/15** |
| Arşiv motoru | **74/74** |
| Release checker / editoryal | **129/129** / **44 geçti** + 1 opsiyonel atlandı |
| **Playwright Chromium, production sunucusu, CSP zorunlu + proxy, 5 görünüm** | **357 geçti, 0 başarısız**, 98 koşullu atlama |
| Güvenlik + hardening e2e, Firefox ve WebKit (production) | **24 geçti, 0 başarısız** |
| CSP sondası (zorunlu mod), Chromium / Firefox / WebKit | 0 / 0 / 0 ihlal |
| Önizleme kapısı (gerçek `next start`) | kimliksiz 401, yanlış 401, doğru 200 + noindex, RSC 401, admin 404, yapılandırmasız 503 |
| Yedek (gerçek veri) | 337 dosya; doğrulama 0 sorun; dry-run 914.076 B; yalıtılmış geri yükleme 337/337; depo içine geri yükleme reddedildi |
| `integrity.mjs check` | 168 kayıt, 0 hata; 2 hak belirsizliği, 3 tahmini tarih ve 3 link-only medya kaynağı uyarısı; **151 published kaydın 151'i insan onaysız** |
| `secrets.mjs --bundle` / `supply-chain.mjs --audit` | temiz / 0 açık (9 SHA'sız eylem kullanımı: orta) |

Bilinen ve bu dalla ilgisi olmayan madde: `site.spec` ana sayfa testi WebKit'te `Tab` ile bağlantı odağını beklediği için başarısız oluyor (Safari geleneği; PR #25'te kanıtlandı).

## 4. Performans (aynı makine, `next start`, 30 iç içe ölçüm × 2 tur)

| Rota | HTML | RSC | Medyan / p90 (ms), tur 1 → tur 2 |
|---|---:|---:|---|
| `/ataturk` | 550.891 | 254.657 | 21,9/27,8 → 21,8/24,1 |
| `/kronoloji` | 203.073 | 104.918 | 25,9/32,4 → 24,4/27,6 |
| `/arsiv` | 56.829 | 27.296 | 14,2/21,9 → 13,7/17,3 |
| `/api/ready` | 222 | — | 15,8/18,9 → 15,5/17,8 |

- Sunucu belleği: başlangıçta yaklaşık 98 MB; ilk 300 istekten sonra yaklaşık 243 MB; ikinci 300 istekten sonra yaklaşık 247 MB (büyüme yok).
- Sunucunun hazır hâle gelmesi yaklaşık 1,8 sn (npx dahil).
- Hardening kazancı korundu (`/ataturk` HTML 550.891 B).
- Proxy eklendi; hardening dalıyla A/B gecikme karşılaştırması aynı derlemede yapılmadığı için proxy maliyeti **ölçülmüş değil**.

## 5. Kalan riskler ve henüz uygulanmayan önlemler

1. Onay defterinde aktör kimlik doğrulaması ve imza (F3).
2. Onay–içerik özeti bağının şemaya eklenmesi (F2 önleme kısmı).
3. Nonce tabanlı katı CSP; `unsafe-inline` kaldırılması.
4. Hız sınırlama ve WAF (önizleme kaba kuvvet koruması dahil).
5. Mevcut iş akışlarında eylemlerin SHA ile sabitlenmesi; dal koruma kuralları.
6. Gerçek kimlik sağlayıcı (OIDC + MFA), oturum, CSRF ve denetim kaydının yönetim paneline bağlanması.
7. Geçmiş commit'lerde sır taraması (bugün yalnız güncel dosyalar taranıyor).
8. Yedeklerin depo dışında, şifreli ve sürümlü saklanması; düzenli geri yükleme tatbikatı.
9. Gerçek zamanlayıcı için tek yazıcı kilidi ve atomik defter.

## 6. Kullanıcı onayı gerektiren işlemler

- GitHub dal koruma kuralları (`main` ve entegrasyon dalları)
- Mevcut iş akışlarında SHA sabitleme (Codex ve Copilot dosyaları)
- Önizleme barındırma, gizli değişkenler, alan adı ve ilk dağıtım
- F4 kayıtlarının kaynak URL'si kararı (OpenCode ve editörler)
- Editoryal şemaya `record_sha256` eklenmesi (Copilot ve editoryal araçlar)

## 7. V1.0 öncesi son güvenlik çalışmaları

1. Kimlik sağlayıcı entegrasyonu ve yönetim paneli güvenlik testleri (Copilot V0.8 ile)
2. Nonce CSP ve CSP raporlama uç noktası
3. Dağıtım ortamında HSTS, WAF, hız sınırlama ve günlük toplama
4. Bağımsız sızma testi (yetkili kapsamla)
5. Yedekleme ve felaket kurtarma tatbikatı
6. İnsan uzman ve editör onaylarının tamamlanması (Release Quality kapısı)
