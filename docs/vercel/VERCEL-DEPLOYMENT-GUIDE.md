# ASRIN KEMALİ — Vercel Hosting ve Resmî Domain (asrinkemali.com.tr) Kurulum Rehberi

**PROJE:** Mustafa Kemal Atatürk odaklı bağımsız tarih ve kültür platformu  
**MARKA:** ASRIN KEMALİ | **KISALTMA:** MKA  
**MOTTO:** BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI  
**RESMÎ DOMAIN:** `asrinkemali.com.tr`  
**DOMAIN SAĞLAYICISI:** Natro (`ns1.natrohost.com`, `ns2.natrohost.com`)  
**HOSTING PLATFORMU:** Vercel  
**GÜNCEL SÜRÜM TABANI:** `integration/asrinkemali-v11-fortress-x`  

---

## 1. Giriş ve Güvenlik İlkeleri

Bu rehber, **ASRIN KEMALİ** platformunun Vercel üzerinde güvenli, profesyonel ve kontrol edilebilir bir şekilde devreye alınmasını sağlamak amacıyla hazırlanmıştır.

### Temel Güvenlik Kuralları:
1. **GitHub `main` Dalı Canlı Üretim Değildir:** `main` dalı eski V0.1 prototipidir; güncel V1.1 sürümü `integration/asrinkemali-v11-fortress-x` dalı üzerindedir. Vercel'in yanlışlıkla `main` dalını production olarak yayına alması kesinlikle önlenmelidir.
2. **Korumasız Halka Açık Dağıtım Yapılamaz:** Testler tamamlanana ve editoryal onay verilene kadar hiçbir dağıtım kamuya açık olarak yayınlanamaz.
3. **Natro DNS Kayıtları Erken Değiştirilmez:** Domain yönlendirmesi ancak tüm preview testleri, güvenlik taramaları ve insan onayları tamamlandıktan sonra yetkili karar ile yapılacaktır.
4. **Geleneksel VPS Betikleri Vercel'de Çalışmaz:** `origin-firewall.sh`, `egress-lockdown.sh` ve `sysctl` betikleri VPS/Linux ortamları içindir. Vercel'in sunucusuz (serverless/edge) mimarisinde güvenlik; Next.js Proxy/Middleware, HTTP Güvenlik Başlıkları, Vercel Authentication ve Cloudflare WAF katmanlarıyla sağlanır.

---

## 2. Vercel Proje Kurulumu ve Yapılandırma Parametreleri

Vercel Kontrol Paneli (`vercel.com`) veya CLI üzerinden proje bağlanırken aşağıdaki parametreler **birebir** uygulanmalıdır:

| Parametre | Değer | Açıklama |
|---|---|---|
| **Project Name** | `asrinkemali` | Proje tanımlayıcı adı. |
| **Connected Git Repository** | `Alisensai/asrinkemali` | Resmî GitHub deposu. |
| **Framework Preset** | `Next.js` | Otomatik Turbopack/Next.js algılama. |
| **Root Directory** | `web` | **KRİTİK:** Next.js uygulaması `web` dizini altındadır. Boş bırakılırsa derleme başarısız olur. |
| **Build Command** | `next build` (Varsayılan) | `web/package.json` içindeki `next build` komutu. |
| **Output Directory** | `.next` (Varsayılan) | Standart Next.js derleme çıktısı. |
| **Install Command** | `npm ci` (veya `npm install`) | `package-lock.json` ile kilitli bağımlılık kurulumu. |
| **Node.js Version** | `20.x` veya `22.x LTS` | Vercel Settings -> General -> Node.js Version. |
| **Production Branch** | Geçici olarak devre dışı veya korumalı dal | Vercel Settings -> Git -> Production Branch ayarında `main` SEÇİLMEMELİDİR. Entegrasyon tamamlanana kadar `integration/asrinkemali-v11-fortress-x` veya özel bir sürüm adayı dalı belirlenmelidir. |

---

## 3. Gizli / Korumalı Preview Test Ortamı

Sitenin kamuya açık hale gelmeden önce doğrulanması için **iki katmanlı erişim koruması** tasarlanmıştır:

### Katman A: Vercel Yerleşik Dağıtım Koruması (Deployment Protection)
- **Vercel Authentication (Önerilen - Vercel Pro/Team):**
  - Vercel Dashboard -> Proje -> Settings -> Deployment Protection -> **Vercel Authentication: ENABLED**.
  - Tüm preview URL'leri (ör. `asrinkemali-git-*.vercel.app`) yalnızca Vercel hesabına sahip yetkili ekip üyelerine açılır; dışarıdan gelen istekler Vercel SSO ekranına yönlendirilir.
- **Password Protection (Alternatif):**
  - Standart şifreli erişim kapısı ile tüm önizlemeler tek bir parola ardına gizlenir.

### Katman B: MKA FORTRESS Dahili Preview Koruması (`web/proxy.ts` & `access-contract.ts`)
Vercel Hobby planında veya üçüncü taraf harici önizlemelerde, Next.js Proxy katmanımız tam güvenlik sağlar:
- **Ortam Değişkenleri:**
  ```env
  ASRIN_DEPLOY_ENV=preview
  ASRIN_PREVIEW_USER=onizleme
  ASRIN_PREVIEW_PASSWORD_SHA256=4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
  ```
- **Davranış:**
  1. `ASRIN_DEPLOY_ENV=preview` olduğunda, HTTP Basic Authorization başlığı olmadan gelen tüm istekler `401 Unauthorized` ile durdurulur.
  2. Ortam değişkenleri tanımlanmamış veya bozuksa site açılmaz; **fail-closed 503** döner.
  3. Tüm yanıtlara `X-Robots-Tag: noindex, nofollow, noarchive` eklenerek arama motorlarının dizine eklemesi kesin olarak engellenir.
  4. Platform canlılık denetimi `/api/health` izleme ve deployment kontrolleri için serbest bırakılır.

---

## 4. Ortam Değişkenleri (Environment Variables) Şablonu

Vercel Dashboard -> Settings -> Environment Variables bölümünde tanımlanması gereken değişkenler:

| Değişken Adı | Hedef Ortam | Örnek / Değer | Açıklama |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production | `https://asrinkemali.com.tr` | Kanonik site adresi. |
| `NEXT_PUBLIC_SITE_URL` | Preview | `https://preview.asrinkemali.com.tr` | Önizleme adresi. |
| `ASRIN_DEPLOY_ENV` | Preview | `preview` | Dahili erişim korumasını ve noindex etiketini açar. |
| `ASRIN_DEPLOY_ENV` | Production | `production` | Kamusal yayını açar. |
| `ASRIN_PREVIEW_USER` | Preview | `onizleme` | Preview kullanıcı adı. |
| `ASRIN_PREVIEW_PASSWORD_SHA256` | Preview | `<64 hex sha256>` | Preview parolasının SHA-256 özeti (düz metin parola girilmez!). |
| `ASRIN_CSP_MODE` | Tüm Ortamlar | `enforce` | İçerik Güvenlik Politikası (CSP) modu. |
| `ASRIN_ENABLE_HSTS` | Production | `1` | Yalnızca canlı özel domainde HSTS'i (31536000 sn) etkinleştirir. |
| `ASRIN_RESEARCH_LAB` | Production | `0` | Araştırma laboratuvarı deney rotasını canlıda kapalı tutar. |

---

## 5. Domain Hazırlığı ve Natro DNS Yapılandırma Rehberi

**Domain:** `asrinkemali.com.tr`  
**DNS Sağlayıcı:** Natro (`ns1.natrohost.com`, `ns2.natrohost.com`)  

> [!WARNING]
> **ÖNEMLİ:** Natro DNS panelindeki kayıtları **HENÜZ DEĞİŞTİRMEYİN**.  
> DNS geçişi ancak Vercel üzerinde preview testleri tamamlandıktan, SSL sertifikası hazırlandıktan ve insan onayı verildikten sonra yapılacaktır.

### Vercel İçin Gereken DNS Kayıtları

Desteklenecek iki adres mevcuttur:
1. `asrinkemali.com.tr` (Kök / Apex domain)
2. `www.asrinkemali.com.tr` (Subdomain)

| Kayıt Tipi | Ad / Host / Alan Adı | Hedef / Değer / Yönlendirme | TTL | İşlev |
|---|---|---|---|---|
| **A** | `@` (veya `asrinkemali.com.tr`) | `76.76.21.21` | `3600` (veya `300`) | Kök alan adını Vercel Anycast IP'sine yönlendirir. |
| **CNAME** | `www` | `cname.vercel-dns.com.` | `3600` | www alt alan adını Vercel kenar ağına yönlendirir. |
| **TXT** *(Gerekirse)* | `_vercel` | `vc-domain-verify=asrinkemali.com.tr,...` | `3600` | Vercel'in alan adı sahipliğini doğrulaması için özel belirteç. |

### Natro DNS Panelinde Kayıt Giriş Adımları:
1. `www.natro.com` adresine giderek kurumsal hesap bilgileriyle giriş yapın.
2. Üst menüden **"Hesabım"** -> **"Alan Adı Yönetimi"** sayfasına geçin.
3. Listeden **`asrinkemali.com.tr`** alan adını bulun ve **"Yönet"** butonuna tıklayın.
4. Sol menüde veya sayfa ortasında yer alan **"Gelişmiş DNS Yönetimi"** veya **"DNS Kayıtları"** sekmesini açın.
5. Mevcut kayıtları inceleyin ve ekran görüntüsü / metin olarak **yedekleyin**.
6. **A Kaydı Ekleme:**
   - Tür: `A`
   - Ad / Host: `@` (Natro paneli `@` kabul etmiyorsa boş bırakın veya `asrinkemali.com.tr` yazın)
   - IP / Değer: `76.76.21.21`
   - TTL: `3600`
7. **CNAME Kaydı Ekleme:**
   - Tür: `CNAME`
   - Ad / Host: `www`
   - Değer: `cname.vercel-dns.com`
   - TTL: `3600`
8. Eğer Vercel panelinde `Domain Verification Required` uyarısı çıkarsa:
   - Tür: `TXT`
   - Ad: `_vercel`
   - Değer: Vercel'in ekranda verdiği `vc-domain-verify=...` metni
9. "Kaydet" butonuna basarak değişiklikleri onaylayın (DNS yayılımı 15 dakika ile 24 saat arasında sürer).

---

## 6. MKA FORTRESS X V1.1 Uyumluluğu ve Mimari Seçenekler

### A. Vercel'de Doğrudan Çalışan Güvenlik Katmanları:
- **TLS / HTTPS:** Vercel, Let's Encrypt aracılığıyla otomatik HTTP/2 ve TLS 1.3 sertifikalandırması sağlar.
- **DDoS Koruması:** Vercel Edge Network, L3/L4 volumetrik saldırıları otomatik emer.
- **Edge Middleware / Proxy (`web/proxy.ts`):** Rota koruması, Basic Auth ve noindex başlıkları Vercel Edge Function olarak çalışır.
- **HTTP Güvenlik Başlıkları (`web/next.config.ts`):** CSP, Frame-Options DENY, nosniff, COOP, CORP ve HSTS başlıkları her yanıtta yerel olarak üretilir.
- **Korumalı API:** `/api/arastirma-laboratuvari/export` gibi hassas rotalar canlı üretim modunda kapalı kalır.

### B. Vercel Sunucusuz Mimaride Doğrudan Çalışmayan Katmanlar:
- `infra/fortress-x-v11/origin-shield/origin-firewall.sh` (Linux iptables / ip6tables)
- `infra/fortress-x-v11/host-hardening/egress-lockdown.sh` (Kernel egress drop)
- `infra/fortress-x-v11/host-hardening/sysctl-fortress.conf` (Linux CIS L2 kernel parametreleri)

### C. Önerilen Kurumsal Mimari: Çift Çember Savunması (Cloudflare + Vercel)
V1.1 güvenlik kurallarının (WAF, Bot Fight Mode, Rate Limiting, PROJECT BLACKOUT Worker) tam kapasite çalışması için en profesyonel tasarım:

```
[İnternet Trafiği]
       │
       ▼
[Natro DNS / Nameserver Yönlendirmesi]
       │
       ▼
[DIŞ ÇEMBER: Cloudflare Anycast WAF & DDoS]
  ├── Cloudflare WAF Kuralları (cloudflare-ruleset.tf)
  ├── OWASP Core Ruleset (Managed CRS Phase)
  ├── Adaptive Rate Limiting (/arsiv, /arastirma)
  ├── Enterprise Bot Koruması
  └── PROJECT BLACKOUT Edge Fallback Worker (edge-blackout-worker.js)
       │
       ▼ (mTLS / Strict Host Header)
[İÇ ÇEMBER: Vercel Global Edge & Next.js Runtime]
  ├── Edge Proxy / Middleware (web/proxy.ts)
  ├── Security Headers (CSP, HSTS, X-Frame-Options DENY)
  ├── Serverless Next.js App Router (web/app)
  └── Fail-Closed Admin & API Rotaları
```

---

## 7. Güvenli 9 Aşamalı Yayın İş Akışı

1. **Vercel Proje Bağlantısı:** Vercel Dashboard üzerinde GitHub deposu bağlanır, Root Directory `web` olarak ayarlanır.
2. **Korumalı Preview Ortamı:** `ASRIN_DEPLOY_ENV=preview` ve parola hash'i atanarak gizli test ortamı oluşturulur.
3. **Build ve Güvenlik Doğrulaması:** `npm --prefix web run build` ve birim testleri Vercel CI ortamında çalıştırılır.
4. **PR Entegrasyon Kontrolleri:** GitHub Actions ve Vercel Preview check'leri yeşile döner.
5. **Domain Sahipliği Doğrulaması:** Natro DNS üzerinden `_vercel` TXT kaydı ile domain sahipliği Vercel'e kanıtlanır.
6. **Yayın Öncesi İnsan Onayları:** Tarihçi ve editoryal kurul içeriği ve tasarımı preview ortamında inceler.
7. **Yetkili Production Yayın Kararı:** Proje lideri tarafından canlıya geçiş kararı verilir.
8. **HTTPS ve Natro DNS Geçişi:** Natro üzerinde `@` -> `76.76.21.21` ve `www` -> `cname.vercel-dns.com` kayıtları girilir.
9. **Yayın Sonrası Denetim:** SSL el sıkışması, CSP başlıkları, `/api/health` ve 360px mobil görünüm doğrulanır.

---

## 8. Mevcut Durum ve Kalan Manuel İzinler (Dürüst Beyan)

- **Vercel CLI Durumu:** `Logged out` (Ortamda kayıtlı Vercel API belirteci veya kullanıcı oturumu bulunmamaktadır).
- **Otomatik Dağıtım Engeli:** CLI oturumu olmadığı için yetkisiz/erken bir otomatik canlı dağıtım tetiklenmemiştir; bu durum projeyi erken ifşa riskinden korumuştur.
- **Kullanıcıdan Gereken İzin / Eylemler:**
  1. `vercel.com` adresinde oturum açarak `Alisensai/asrinkemali` deposunu import etmek veya geliştirici ortamında `vercel login` komutunu çalıştırmak.
  2. Vercel Dashboard üzerinde Root Directory ayarını `web` olarak seçmek.
  3. Natro DNS kayıtlarını yukarıdaki tabloya göre zamanı geldiğinde girmek.
