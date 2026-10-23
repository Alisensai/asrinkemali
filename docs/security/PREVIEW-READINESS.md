# Korumalı önizleme hazırlık kontrol listesi

> **noindex, robots.txt veya tahmin edilmesi zor bir URL erişim denetimi DEĞİLDİR.** Önizleme yalnız gerçek kimlik doğrulama (aşağıdaki HTTP Basic kapısı veya platform düzeyinde erişim denetimi) ile açılmalıdır.

**Durum:** Teknik altyapı hazır ve yerel production sunucusunda doğrulandı. **Hiçbir önizleme veya canlı dağıtım yapılmadı.** DNS değiştirilmedi.

## Ortam değişkenleri (önizleme)

| Değişken | Değer | Not |
|---|---|---|
| `ASRIN_DEPLOY_ENV` | `preview` | Tüm siteyi kimlik doğrulamaya bağlar. Yapılandırma eksikse site **503** döner. |
| `ASRIN_PREVIEW_USER` | kullanıcı adı | |
| `ASRIN_PREVIEW_PASSWORD_SHA256` | parolanın SHA-256 hex özeti | Düz metin parola **saklanmaz**. Platformun gizli değişken deposunda tutulur; depoya yazılmaz. |
| `NEXT_PUBLIC_SITE_URL` | **ayarlanmaz** | Ayarlanmazsa robots `Disallow: /` ve sayfalar `noindex` kalır. |
| `ASRIN_ENABLE_HSTS` | yalnız önizleme HTTPS ile sunuluyorsa `1` | |
| `ASRIN_CSP_MODE` | varsayılan (`enforce`) | |

Parola özeti şu komutla üretilir (çıktıyı doğrudan platformun gizli değişken deposuna girin):

```bash
read -rs P && printf %s "$P" | sha256sum | cut -d' ' -f1 && unset P
```

## Kontrol listesi

| # | Madde | Durum | Kanıt |
|---|---|---|---|
| 1 | Ayrı preview ortamı ve production'dan ayrı env | Hazır (env sözleşmesi) | Bu belge |
| 2 | Gerçek erişim denetimi | **Uygulandı**: HTTP Basic, sabit zamanlı karşılaştırma, yapılandırma eksikse 503 | Yerel sunucu: kimliksiz 401, doğru kimlik 200, RSC isteği 401; `security-access.test.mjs` |
| 3 | `noindex` | **Uygulandı**: `X-Robots-Tag` + robots disallow | Yerel sunucu |
| 4 | Yönetim rotaları kapalı | **Uygulandı**: kayıtlı sağlayıcı yokken her ortamda 404 | e2e + birim |
| 5 | İnsan onayı olmayan kayıtların görünürlüğü | **Karar gerekli**: 151 `published` kayıt insan onaysız. Önizleme yalnız yetkili ekibe açık olduğundan teknik olarak görünür kalabilir; kamuya açılmadan önce Release Quality kapısı (insan onayı) geçmeli | Release Quality raporu |
| 6 | Ücretli servis yok | Evet | — |
| 7 | Güvenlik başlıkları ve CSP | **Uygulandı**: zorunlu CSP, 3 tarayıcıda 0 ihlal | `csp-probe.mjs` |
| 8 | Kaynak bağlantıları | HTTPS, `noopener`; 3 link-only kayıtta ham medya URL'si bulgusu | `integrity.mjs check` |
| 9 | Hata ekranları sızıntısız | **Doğrulandı** | `e2e/security` |
| 10 | `/api/health` herkese açık, minimal | Evet; `/api/ready` önizlemede kimlik ister | Yerel sunucu |
| 11 | HTTP Basic sınırlamaları kabul edildi | Paylaşılan tek kimlik bilgisi; kişi bazlı denetim kaydı ve hız sınırlama yok. Platform düzeyinde SSO (örneğin barındırma sağlayıcısının ekip erişim koruması) tercih edilir | — |
| 12 | Kaba kuvvet koruması | **Eksik**: uygulamada hız sınırlama yok. Barındırma veya WAF katmanında yapılmalı | — |

## Kullanıcı onayı gerektiren adımlar

- Önizleme barındırma sağlayıcısının seçilmesi ve hesap oluşturulması
- Gizli değişkenlerin girilmesi
- Önizleme alan adı (DNS değişikliği yapılmadı)
- İlk dağıtım
