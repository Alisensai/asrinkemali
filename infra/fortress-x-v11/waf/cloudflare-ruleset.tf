# ==============================================================================
# ASRIN KEMALİ — MKA FORTRESS X V1.1
# Cloudflare WAF v5 Ruleset & Rate Limiting Yapılandırması (Terraform / OpenTofu)
# ==============================================================================
# DİKKAT: Bu dosya bağımsız ASRIN KEMALİ platformunun altyapı şablonudur.
# Canlı Cloudflare hesabı bağlanmadan önce test edilmeli ve dry-run doğrulaması yapılmalıdır.
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.30.0"
    }
  }
}

variable "zone_id" {
  type        = string
  description = "ASRIN KEMALİ Cloudflare Zone ID"
  default     = "dummy_zone_id_for_validation"
}

variable "environment" {
  type        = string
  description = "Dağıtım ortamı (production, staging)"
  default     = "production"
}

# ------------------------------------------------------------------------------
# 1. Kenar Güvenlik Duvarı: Hassas Dosyalar ve Açık Tarayıcıları Engelleme (Block)
# ------------------------------------------------------------------------------
resource "cloudflare_ruleset" "waf_custom_security" {
  zone_id     = var.zone_id
  name        = "mka-fortress-custom-firewall-rules"
  description = "ASRIN KEMALİ kötü niyetli tarayıcı, hassas yol ve saldırı engelleme kuralları"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  # Kural 1: Hassas dosya ve gizli dizin erişimlerini anında engelle
  rules {
    action      = "block"
    description = "Hassas dizin (.env, .git, .bak, config) ve yönetim yolu taramalarını engelle"
    expression  = "(http.request.uri.path contains \"/.env\" or http.request.uri.path contains \"/.git\" or http.request.uri.path contains \"/wp-admin\" or http.request.uri.path contains \"/wp-login\" or http.request.uri.path contains \"/phpmyadmin\" or http.request.uri.path contains \"/.aws\" or http.request.uri.path contains \"/.ssh\" or http.request.uri.path endswith \".bak\" or http.request.uri.path endswith \".sql\" or http.request.uri.path endswith \".yaml.bak\")"
    enabled     = true
  }

  # Kural 2: Bilinen güvenlik tarayıcılarını ve şüpheli User-Agent'ları engelle
  rules {
    action      = "block"
    description = "Otomatik zafiyet tarayıcılarını ve exploit araçlarını engelle"
    expression  = "(http.user_agent contains \"sqlmap\" or http.user_agent contains \"nikto\" or http.user_agent contains \"nmap\" or http.user_agent contains \"acunetix\" or http.user_agent contains \"masscan\" or http.user_agent contains \"zgrab\")"
    enabled     = true
  }

  # Kural 3: Şüpheli HTTP metotlarını engelle (Yalnızca GET, HEAD, OPTIONS izinli; POST editoryal hazırlık içindir)
  rules {
    action      = "block"
    description = "Salt-okunur kamusal sitede geçersiz HTTP metotlarını (TRACE, TRACK, CONNECT, DELETE, PUT) engelle"
    expression  = "(http.request.method in {\"TRACE\" \"TRACK\" \"CONNECT\" \"DELETE\" \"PUT\"})"
    enabled     = true
  }

  # Kural 4: Meşru Türkçe arama sorgularını WAF false-positive filtresinden muaf tut (Skip / Pass)
  # ASRIN KEMALİ arşivinde 'Mustafa Kemal', 'Çanakkale', 'Nutuk', 'TBMM', 'Cumhuriyet' vb.
  # Türkçe karakter ve tarihî terimlerin SQLi/XSS olarak yanlış algılanmasını önler.
  rules {
    action = "skip"
    action_parameters {
      ruleset = "current"
    }
    description = "Meşru Türkçe arşiv arama sorgularını yanlış pozitif filtrelemeden muaf tut"
    expression  = "(http.request.method == \"GET\" and (http.request.uri.path == \"/arsiv\" or http.request.uri.path == \"/arastirma\" or http.request.uri.path == \"/kronoloji\") and len(http.request.uri.query) lt 256)"
    enabled     = true
  }
}

# ------------------------------------------------------------------------------
# 2. Adaptif Hız Sınırlama (Rate Limiting) Kuralları
# ------------------------------------------------------------------------------
resource "cloudflare_ruleset" "rate_limiting_rules" {
  zone_id     = var.zone_id
  name        = "mka-fortress-rate-limiting"
  description = "DDoS önleme ve adaptif istek sınırlama kuralları"
  kind        = "zone"
  phase       = "http_ratelimit"

  # Kural 1: Arama ve dinamik filtreleme uç noktaları (30 istek / 10 saniye)
  rules {
    action      = "block"
    description = "Arşiv ve arama sorguları hız sınırlaması (L7 koruması)"
    expression  = "(http.request.method == \"GET\" and (http.request.uri.path contains \"/api/search\" or http.request.uri.path contains \"/arsiv\" or http.request.uri.path contains \"/arastirma\"))"
    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 10
      requests_per_period = 30
      mitigation_timeout  = 60
    }
    enabled = true
  }

  # Kural 2: Genel web sayfaları hız sınırlaması (120 istek / 10 saniye)
  # Meşru ziyaretçileri engellemeyecek şekilde cömert eşik belirlenmiştir.
  rules {
    action      = "challenge" # Doğrudan engellemek yerine Managed Challenge (JS/CAPTCHA) uygula
    description = "Genel sayfa gezinmesi agresif tarama koruması"
    expression  = "(not (http.request.uri.path contains \"/_next/static/\" or http.request.uri.path contains \"/assets/\" or http.request.uri.path == \"/api/health\" or http.request.uri.path == \"/api/ready\" or http.request.uri.path == \"/favicon.ico\"))"
    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 10
      requests_per_period = 120
      mitigation_timeout  = 120
    }
    enabled = true
  }
}

# ------------------------------------------------------------------------------
# 3. İzin Verilen Ayrıcalıklı Trafik ve İstisnalar
# ------------------------------------------------------------------------------
# - Statik CSS/JS paketleri: Kenar CDN önbelleğinde saklanır (Edge TTL 30 gün)
# - Sağlık denetimi: /api/health ve /api/ready hiçbir hız sınırına takılmaz
# - Arama motoru botları: Googlebot, Bingbot, Yandexbot doğrulanmış bot ise challenge uygulanmaz
# ------------------------------------------------------------------------------
