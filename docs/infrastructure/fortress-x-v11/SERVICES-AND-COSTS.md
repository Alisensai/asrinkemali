# ASRIN KEMALİ — MKA FORTRESS X V1.1
## Dış Sağlayıcı, Bulut ve Altyapı Maliyet/Gereksinim Analizi

**Proje:** Mustafa Kemal Atatürk Odaklı Bağımsız Tarih ve Kültür Platformu  
**Marka:** ASRIN KEMALİ | **Motto:** BİR ASRIN MİRASI, SONSUZLUĞUN HAFIZASI  
**Rol:** Ağ, Bulut ve Altyapı Güvenliği Mühendisi  
**Tarih:** 2026-10-24  

---

## 1. Dürüst Durum Tespiti (Mevcut Durum vs. Canlı İhtiyaç)

> [!IMPORTANT]
> **Aktiflik İlkesi:** Bugün itibarıyla repoda tanımlı olan WAF, rate limiting, Docker, Nginx ve FIM bileşenleri **doğrulanabilir altyapı kodları (IaC / Templates / Test Suites)** olarak geliştirilmiştir. Canlıda henüz herhangi bir ücretli bulut hesabı, aktif Cloudflare Enterprise lisansı veya harici SIEM aboneliği bulunmamaktadır. Hiçbir servis, gerçekte bağlı olmadığı halde "aktif" olarak gösterilmemiştir.

Aşağıdaki analiz, platformun halka açık canlı yayına geçişinde projenin bağımsızlık ilkelerini, veri egemenliğini ve bütçe verimliliğini koruyacak en uygun dış sağlayıcı alternatiflerini değerlendirir.

---

## 2. Kenar Savunması, WAF ve CDN Karşılaştırması

ASRIN KEMALİ'nin L3/L4/L7 DDoS saldırılarından korunması ve Türkiye genelinde düşük gecikmeyle (<30ms) sunulması için kenar ağı zorunludur.

| Sağlayıcı & Plan | Aylık Maliyet | WAF Özellikleri | DDoS & Hız Sınırlama | Karar ve Notlar |
|---|---|---|---|---|
| **Cloudflare Free** | \$0 | Temel DDoS, sınırlı kural | L3/L4 sınırsız; WAF kural sayısı 3 adet | Geliştirme ve test için yeterli; üretim WAF için yetersiz. |
| **Cloudflare Pro** *(Önerilen)* | **\$20 / ay** | Managed WAF (OWASP Core Ruleset), 20 özel kural | Gelişmiş DDoS, temel hız sınırlama, kayıpsız görsel optimizasyonu (Polish) | **En Fiyat/Performans Plan.** ASRIN KEMALİ'nin ilk 1 yıllık yayını için tam yeterli. |
| **Cloudflare Business** | \$200 / ay | 100 özel kural, özel SSL, bypass WAF | Gelişmiş L7 hız sınırlama, %100 Uptime SLA | Bütçe elverdiğinde veya yüksek trafikli millî günlerde (29 Ekim, 10 Kasım) geçilebilir. |
| **Cloudflare Enterprise** | Özel (\$2.000+/ay) | Özel kural motoru, 7/24 SOC | SLA garantili scrubbing merkezi | Bağımsız kültür platformu için gereksiz yüksek maliyet. |
| **AWS CloudFront + AWS WAF** | Metrik bazlı (~~\$50–\$150/ay)~~ | AWS Managed Rules (Kural başı \$1/ay + istek başı ücret) | AWS Shield Standard (Ücretsiz) / Shield Advanced (\$3.000/ay) | İstek ve trafik başına değişken fatura riski. Ani saldırıda bütçe aşımı riski vardır. |
| **Fastly** | Metrik bazlı (~~\$100+/ay)~~ | Next-Gen WAF (Signal Sciences) | Anycast CDN, VCL programlama | Kurumsal odaklı, küçük ve orta ölçekli bütçeler için karmaşık. |

**Tavsiye:** **Cloudflare Pro (\$20/ay)** planı, hem OWASP WAF motorunu hem de otomatik görsel optimizasyonunu sabit ve öngörülebilir bütçeyle sunması nedeniyle ASRIN KEMALİ için en rasyonel tercihtir.

---

## 3. Sunucu ve Barındırma (Compute / Hosting) Alternatifleri

ASRIN KEMALİ, App Router mimarili Next.js ve zengin arşiv JSON verilerinden oluşmaktadır.

| Barındırma Seçeneği | Donanım / Özellikler | Aylık Maliyet | Veri Egemenliği ve Bağımsızlık |
|---|---|---|---|
| **Hetzner Cloud (CPX31)** *(Önerilen)* | 4 vCPU AMD, 8 GB RAM, 160 GB NVMe, 20 TB Trafik | **~€13.50 / ay** (~\$15) | Almanya/Finlandiya lokasyon, GDPR uyumlu, bağımsız sunucu kontrolü. Sıfır vendor lock-in. |
| **Hetzner Dedicated (AX42)** *(Yüksek Trafik)* | AMD Ryzen 7 7700, 64 GB DDR5 ECC, 2x 1TB Gen4 NVMe | **~€46.00 / ay** (~\$50) | Tam fiziksel donanım ayrımı, 1 Gbit sınırsız trafik, en yüksek kurcalanma direnci. |
| **AWS (ECS Fargate + ALB)** | 2 vCPU, 4 GB RAM, Application Load Balancer | **~\$60 – \$80 / ay** | Yüksek erişilebilirlik ancak dış veri transferi (Egress bandwidth: \$0.09/GB) ek maliyet yaratır. |
| **Vercel Pro** | Sunucusuz (Serverless), 1 TB bant genişliği | **\$20 / kullanıcı / ay** | Dağıtım kolaylığı sağlar ancak sunucu düzeyinde kernel/sysctl ve egress firewall denetimine izin vermez. |

**Tavsiye:** **Hetzner Cloud (CPX31) veya AX42**, sabit ve düşük maliyetle yüksek işlem gücü sunar. Trafik için sürpriz fatura çıkarmaz. Projenin bağımsızlığını korur.

---

## 4. SIEM, İzleme ve Günlük Saklama

| Çözüm | Lisans & Çalıştırma | Aylık Maliyet | Özellikler |
|---|---|---|---|
| **Kendi Sunucunda Vector + Grafana Loki** *(Önerilen)* | Açık kaynak (Self-hosted) | **€0 yazılım** (Sunucu içinde çalışır) | Tam veri gizliliği, loglarda KVKK uyumlu IP hashleme, sıfır üçüncü taraf sızıntısı. |
| **Elastic Cloud (Elasticsearch Managed)** | SaaS abonelik | **~\$95 / ay** | Hazır SIEM panelleri, ancak küçük platform için yüksek maliyet. |
| **Datadog / New Relic** | SaaS ajan bazlı | **~\$150 – \$300 / ay** | Kullanım hacmine göre log faturalandırması hızla katlanır. |

**Tavsiye:** `vector-agent.toml` ile yapılandırılmış yerel **Vector + Loki / OpenSearch**, sıfır ek lisans maliyetiyle tam güvenlik ve gizlilik sağlar.

---

## 5. Değiştirilemez Yedek (WORM / Immutable Storage)

Tarihî kayıtların kötü niyetli silinme veya fidye yazılımlarına karşı korunması:

| Sağlayıcı | Model | Saklama Koşulu | Aylık Maliyet |
|---|---|---|---|
| **AWS S3 Object Lock** *(Önerilen)* | COMPLIANCE Mode | 365 gün kilit, Glacier Instant Retrieval | **~\$3 – \$7 / ay** (100 GB arşiv için) |
| **Cloudflare R2** | Object Storage | Egress ücretsiz, API çağrısı ücretsiz | **~\$2 – \$5 / ay** |
| **Wasabi Hot Cloud Storage** | S3 uyumlu WORM | Nesne kilitleme destekli, egress ücreti yok | **\$6.99 / ay** (minimum 1 TB taban) |

**Tavsiye:** Arşiv ve günlük kanıtları için **AWS S3 Object Lock (COMPLIANCE)**, kök hesap dahil yetkisiz silinmeye karşı yasal düzeyde garanti sunar.

---

## 6. Alan Adı, DNSSEC ve TLS

- **Alan Adı (Domain):** `asrinkemali.org` (Cloudflare Registrar maliyet fiyatına: **~\$9.77 / yıl**).
- **DNSSEC:** Cloudflare üzerinde **ücretsiz** (Tek tıkla etkinleştirilir).
- **TLS Sertifikası:** Let's Encrypt / Cloudflare Edge SSL (**ücretsiz**).

---

## 7. Üç Seviyeli Bütçe Modeli

| Kalem | Seviye 1: Düşük Bütçeli Başlangıç | Seviye 2: Önerilen Üretim (V1.1) | Seviye 3: Yüksek Dayanıklı Kurumsal |
|---|---|---|---|
| **Kenar / WAF / CDN** | Cloudflare Free (\$0) | Cloudflare Pro (\$20) | Cloudflare Business (\$200) |
| **Sunucu (Compute)** | Hetzner Cloud CPX21 (~€8) | Hetzner Cloud CPX31 (~€14) | Hetzner Dedicated AX42 (~€46) |
| **WORM Yedekleme** | AWS S3 Lock (~€3) | AWS S3 Lock (~€5) | Multi-Region S3 (~€15) |
| **SIEM & Loglama** | Yerel Vector/Loki (€0) | Yerel Vector/Loki (€0) | Elastic Cloud (~€95) |
| **Domain & DNSSEC** | ~€1 / ay | ~€1 / ay | ~€1 / ay |
| **TOPLAM TAHMİNİ AY:** | **~€12 / ay (~\$13)** | **~€40 / ay (~\$44)** | **~€357 / ay (~\$390)** |

> [!TIP]
> **Önerilen Yol Haritası (Seviye 2):**
> Aylık yaklaşık **€40 (\$44)** bütçe ile ASRIN KEMALİ platformu; OWASP WAF korumasına, sınırsız L3/L4 DDoS kalkanına, 4 vCPU / 8 GB RAM yüksek performanslı bağımsız sunucuya ve 365 gün değiştirilemez WORM yedek güvencesine sahip olur.
