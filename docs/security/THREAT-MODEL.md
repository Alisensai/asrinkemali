# MKA FORTRESS Phase 1 — Tehdit modeli

- **Kapsam:** `feature/claude-v08-fortress-foundation` (taban: `35f7497`, V0.6 hardening). Bu model gerçek kod incelemesine dayanır. Var olmayan bileşenler (kimlik doğrulama, yönetim paneli, veritabanı, canlı sunucu) için yalnız **gelecek gereksinim** tanımlanır; korunuyormuş gibi gösterilmez.
- **Puanlama:** Etki ve olasılık **nitel** (Kritik/Yüksek/Orta/Düşük) verilmiştir. Ölçülemeyen riskler için sayısal puan uydurulmadı.

## 1. Sistem özeti (bugünkü gerçek durum)

| Bileşen | Gerçek durum |
|---|---|
| Web | Next.js 16 App Router. 163 sayfa; 151 arşiv ayrıntısı statik. Dinamik rotalar: `/arsiv`, `/kronoloji`, `/yayinlar`, `/tarihte-bugun`. |
| Veri | Depodaki JSON dosyaları (`content/archive/records`, `data/archive/catalog`, `content/publications`). Veritabanı yok. |
| Sunucu verisi | `web/lib/archive.ts` ve `web/lib/publishing/repository.ts` (`server-only`); dosya sistemi salt-okunur kullanılıyor. |
| Yazma yolları | Yalnız geliştirici araçları (Python editoryal CLI, arşiv doğrulayıcı) ve Git. Uygulamada yazma uç noktası yok. |
| Kimlik doğrulama / yönetim | **Yok.** Yönetim rotası bulunmuyor (Copilot V0.8 ayrı dalda). |
| API | `/api/health-integration` (statik JSON). Bu fazda `/api/health` ve `/api/ready` eklendi. |
| Yayın motoru | Dry-run planlayıcı; gerçek zamanlayıcı ve AI kapalı. |
| CI | GitHub Actions; 3 iş akışı, `permissions: contents: read`, gizli değişken kullanılmıyor. |

## 2. Güven sınırları

1. **Ziyaretçi tarayıcısı ↔ Next.js sunucusu:** sorgu parametreleri, yol segmentleri, istek başlıkları.
2. **Next.js sunucusu ↔ depo dosya sistemi:** JSON kayıtları güvenilir kabul ediliyor; bütünlüğü Git'e bağlı.
3. **Katkıcı / ajan ↔ Git deposu:** her yazma yetkilisi kayıtları ve onay defterini değiştirebilir.
4. **CI ↔ üçüncü taraf eylemler ve npm kayıt defteri.**
5. **Editoryal araçlar ↔ dış kurum siteleri** (yalnız kaynak bağlantı denetimi).
6. **Gelecek:** yönetim paneli ↔ kimlik sağlayıcı; zamanlayıcı ↔ yayın deposu.

## 3. Varlık bazlı analiz

| Varlık | Giriş noktası / saldırı yüzeyi | Olası kötüye kullanım | Etki | Mevcut koruma | Eksik koruma | Önerilen düzeltme | Test yöntemi |
|---|---|---|---|---|---|---|---|
| **Arşiv kayıtları** | Git commit; PR birleştirme | Kaynak, tarih veya alıntının sessizce değiştirilmesi; toplu bozma | Kritik (tarihî güvenilirlik) | Şema doğrulayıcı, yayın kapısı, PR incelemesi | İçerik özeti tabanı, değişiklik raporu, toplu değişiklik alarmı | **Uygulandı:** `tools/mka-fortress/integrity.mjs` (SHA-256 manifest, Git referansıyla fark, toplu değişiklik eşiği) | `tools/mka-fortress/tests/integrity.test.mjs` |
| **Kaynak bağlantıları** | Kayıt `source.url`, `image.url`, yayın kaynakçası | `javascript:`, kimlik bilgili veya boşluklu URL; zararlı alan adına yönlendirme | Yüksek | `validateExternalUrl`, `isSafeHttpsUrl`, https görsel denetimi, `rel=noopener` | Kaynak alan adı değişikliğinin ayrı raporlanması | **Uygulandı:** bütünlük raporunda `sourceUrlChanged` ve alan adı değişikliği | integrity testleri; e2e dış bağlantı testi |
| **Makaleler (yayınlar)** | `content/publications/records/*.json` | Onaysız yayın, çift yayın, bozuk JSON ile hizmet kesintisi | Yüksek | V0.6 hardening: yapı denetimi, kimlik düzeyinde tekrar engeli, onay zamanı | Eşzamanlı yürütme kilidi (gerçek zamanlayıcı yok) | Sözleşme: zamanlayıcı yalnız tek yazıcı + defter tabanlı karşılaştır-ve-yaz. **Uygulandı:** eşzamanlı plan testi | `web/tests/security-publishing.test.mjs` |
| **Editör kararları ve insan uzman onayları** | `docs/editorial` defteri (hash zinciri), formlar | Sahte "human_expert" olayı; onaydan sonra kaydın değiştirilmesi | Kritik | Hash zinciri (`audit_ledger.py`); rol listesi | Aktör kimlik doğrulaması yok; onay **form** özetine bağlı, **kayıt** özetine bağlı değil | **Uygulandı:** bütünlük aracı, onaylı kayıt değişince `reReviewRequired` raporluyor. **Öneri:** onay olayına `record_sha256` alanı ve imzalı commit veya kimlik sağlayıcı | integrity testleri |
| **Yönetici hesapları** | Henüz yok | Varsayılan açık panel, kimliksiz yönetim | Kritik (gelecek) | Rota yok → 404 | Kimlik doğrulama, RBAC, CSRF, denetim kaydı | **Uygulandı:** `web/lib/security/access-contract.ts` (kapalı-başarısız yetki, RBAC, CSRF köken denetimi, denetim olayı); hassas rota 404 testleri | `security-access.test.mjs`; e2e hassas rotalar |
| **Kullanıcı oturumları** | Henüz yok | Çerez çalınması, oturum sabitleme | Yüksek (gelecek) | Çerez kullanılmıyor | Çerez politikası | **Uygulandı:** sözleşmede zorunlu çerez öznitelikleri (`__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict`) ve doğrulayıcı | `security-access.test.mjs` |
| **Gizli anahtarlar** | Depo, istemci paketi, günlükler | Commit edilmiş anahtar, `NEXT_PUBLIC_` ile sızma | Yüksek | `.env*` gitignore'da; yalnız `NEXT_PUBLIC_SITE_URL` var | Otomatik tarama, günlük redaksiyonu | **Uygulandı:** `tools/mka-fortress/secrets.mjs` (değer göstermeden tarama), `web/lib/server/log.ts` (redaksiyon) | secrets ve log testleri |
| **Yayın zamanlayıcıları** | Gelecekteki cron/iş | Tekrar çalışma, çökme sonrası çift yayın, saat sapması | Yüksek (gelecek) | Dry-run, idempotency anahtarı + kimlik engeli | Kalıcı kilit, atomik defter | Sözleşme (`docs/security/PUBLISHING-SECURITY.md`) | yayın güvenlik testleri |
| **Kaynak doğrulama araçları** | `source_links.py` dış HTTP | SSRF, iç ağ taraması, agresif istek | Orta | DNS genel IP denetimi, yönlendirme izlenmiyor, gecikme zorunlu | — | Korundu; regresyon için mevcut Python testleri | `tools/editorial-review/tests` |
| **CI/CD** | İş akışları, üçüncü taraf eylemler, npm | Etiket kaydırma ile kötü amaçlı eylem; bağımlılık zinciri | Yüksek | `contents: read`, gizli değişken yok, `npm ci` | Eylemler SHA ile sabit değil; tedarik zinciri raporu yok | **Uygulandı:** `tools/mka-fortress/supply-chain.mjs`; yeni `security.yml` SHA ile sabit. Mevcut iş akışları için öneri | supply-chain testleri |
| **Depo geçmişi** | Force-push, geçmiş yeniden yazma | Kanıtın silinmesi | Yüksek | Ajan kuralları (force-push yok) | Dal koruma kuralları (GitHub ayarı) | **Kullanıcı onayı gerekir:** `main` ve entegrasyon dallarına koruma kuralı | Elle (GitHub ayarı) |
| **Önizleme ortamı** | Gelecekteki preview URL'si | Onaysız içeriğin herkese açık yayımı; indekslenme | Yüksek | `robots` → disallow (SITE_URL yoksa) | Gerçek erişim denetimi | **Uygulandı:** `previewAccessDecision` (kimlik sağlayıcı yoksa reddet), kontrol listesi | `security-access.test.mjs` |

## 4. Risk sıralaması (nitel)

| # | Risk | Önem | Durum |
|---|---|---|---|
| 1 | Onaydan sonra arşiv içeriğinin değişmesi, insan onayının geçersiz hâle gelmesi | Kritik | **Tespit** aracı eklendi. **Önleme** için onay–içerik özeti bağı gerekiyor (editoryal araç değişikliği; öneri). |
| 2 | Onay defterinde aktör kimliğinin doğrulanmaması | Kritik | Açık. İmzalı commit veya kimlik sağlayıcı gerekiyor (V1.0 öncesi). |
| 3 | Yönetim paneli kimlik doğrulamasız devreye alınması | Kritik (gelecek) | Kapalı-başarısız sözleşme ve testler eklendi; panel yok. |
| 4 | CI'da etiketle sabitlenmiş üçüncü taraf eylemler | Yüksek | Yeni iş akışı SHA ile sabit; mevcutlar için öneri (başka ajanların dosyaları). |
| 5 | CSP olmaması (XSS etkisinin sınırlanamaması) | Yüksek | **Report-Only CSP** eklendi; tarayıcıda 0 ihlal kanıtlandı. Zorunlu CSP için nonce gerekiyor. |
| 6 | Dal koruma kuralları | Yüksek | Kullanıcı onayı gerekiyor. |
| 7 | Gizli anahtar sızıntısı | Orta (bugün sır yok) | Tarama + redaksiyon eklendi. |
| 8 | Büyük sorgu girdileriyle kaynak tüketimi | Düşük–Orta | Girdiler 120 karakterle kırpılıyor; büyük URL testleri eklendi. Hız sınırlama barındırma katmanında yapılmalı. |
| 9 | SSRF | Düşük | Uygulama dış istek atmıyor; araç korumalı. |

## 5. Bu modelin sınırları

- Tespit araçları değişikliği **önlemez**. Yazma yetkisi olan biri hem kaydı hem başlangıç manifestini değiştirebilir. Başlangıç manifesti ancak güvenilir bir referansla (imzalı etiket veya korumalı dal) karşılaştırıldığında anlamlıdır.
- Gerçek dağıtım, WAF, hız sınırlama, kimlik sağlayıcı ve dal koruması olmadan **V1.0 FORTRESS onayı verilemez**.
