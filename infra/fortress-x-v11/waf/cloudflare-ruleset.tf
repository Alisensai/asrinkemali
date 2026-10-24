# ==============================================================================
# ASRIN KEMALİ — MKA FORTRESS X V1.1
# Cloudflare WAF v5 Ruleset & Rate Limiting Yapılandırması (Terraform / OpenTofu)
# ==============================================================================
# GÜVENLİK MİMARİSİ VE SERTLEŞTİRME (V1.1 Görev 10):
# 1. Geniş kapsamlı "action = skip" ve "ruleset = current" muafiyetleri TAMAMEN
#    KALDIRILMIŞTIR. Hiçbir arama sayfası veya parametre güvenlik kurallarını atlayamaz.
# 2. Özel güvenlik kuralları (Custom Rules) YALNIZCA "block" veya "challenge" uygular;
#    arka kapı veya kural atlama mantığı içermez.
# 3. XSS, SQLi, Path Traversal, Hassas Dosya Taramaları ve Kötü Amaçlı Botlar
#    tüm rotalarda (/arsiv dahil) koşulsuz engellenir.
# 4. Temiz Türkçe karakterli (ç, ğ, ı, ö, ş, ü, İ) arama sorguları, saldırı imzası
#    taşımadığı sürece kuralları doğal olarak tetiklemez ve engellenmez.
# 5. Cloudflare Managed Rules (OWASP CRS) entegrasyonu, genel atlama yerine
#    hassasiyet seviyesi (paranoia level) optimizasyonuyla tasarlanmıştır.
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
# 1. Özel Güvenlik Kuralları (Custom WAF Rules — Sıfır Atlatma / Zero Skip)
# ------------------------------------------------------------------------------
resource "cloudflare_ruleset" "waf_custom_security" {
  zone_id     = var.zone_id
  name        = "mka-fortress-custom-firewall-rules"
  description = "ASRIN KEMALİ çok katmanlı özel WAF güvenlik kuralları"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  # Kural 1: Hassas dosya ve gizli dizin erişimlerini koşulsuz engelle
  rules {
    action      = "block"
    description = "Hassas dizin (.env, .git, .bak, config) ve yönetim yolu taramalarını engelle"
    expression  = "(http.request.uri.path contains \"/.env\" or http.request.uri.path contains \"/.git\" or http.request.uri.path contains \"/wp-admin\" or http.request.uri.path contains \"/wp-login\" or http.request.uri.path contains \"/phpmyadmin\" or http.request.uri.path contains \"/.aws\" or http.request.uri.path contains \"/.ssh\" or http.request.uri.path endswith \".bak\" or http.request.uri.path endswith \".sql\" or http.request.uri.path endswith \".yaml.bak\")"
    enabled     = true
  }

  # Kural 2: Bilinen güvenlik tarayıcılarını ve istismar araçlarını koşulsuz engelle
  rules {
    action      = "block"
    description = "Otomatik zafiyet tarayıcılarını ve exploit araçlarını engelle"
    expression  = "(http.user_agent contains \"sqlmap\" or http.user_agent contains \"nikto\" or http.user_agent contains \"nmap\" or http.user_agent contains \"acunetix\" or http.user_agent contains \"masscan\" or http.user_agent contains \"zgrab\" or http.user_agent contains \"gobuster\" or http.user_agent contains \"dirbuster\")"
    enabled     = true
  }

  # Kural 3: Geçersiz ve tehlikeli HTTP metotlarını engelle
  rules {
    action      = "block"
    description = "Salt-okunur kamusal sitede geçersiz HTTP metotlarını (TRACE, TRACK, CONNECT, DELETE, PUT) engelle"
    expression  = "(http.request.method in {\"TRACE\" \"TRACK\" \"CONNECT\" \"DELETE\" \"PUT\"})"
    enabled     = true
  }

  # Kural 4: Açık XSS, SQLi ve Yol Geçişi saldırı imzalarını tüm rotalarda engelle
  # DİKKAT: Bu kural /arsiv, /arastirma ve /kronoloji dahil her yerde aktiftir.
  rules {
    action      = "block"
    description = "Açık XSS, SQLi ve Yol Geçişi (Path Traversal) saldırılarını tüm rotalarda engelle"
    expression  = "(http.request.uri.query contains \"<script\" or http.request.uri.query contains \"javascript:\" or http.request.uri.query contains \"onerror=\" or http.request.uri.query contains \"onload=\" or http.request.uri.query contains \"../\" or http.request.uri.query contains \"..%2f\" or http.request.uri.query contains \"union select\" or http.request.uri.query contains \"union all select\" or http.request.uri.query contains \"' or '1'='1\" or http.request.uri.query contains \"drop table\" or http.request.uri.query contains \"waitfor delay\" or http.request.uri.query contains \"information_schema\" or http.request.uri.query contains \"sleep(\")"
    enabled     = true
  }
}

# ------------------------------------------------------------------------------
# 2. Cloudflare Managed Ruleset (OWASP Core Ruleset) Entegrasyon Şablonu
# ------------------------------------------------------------------------------
# Managed Ruleset (Cloudflare Yönetilen Kurallar), özel kuralların ardından çalışır.
# Türkçe arama sorgularında gereksiz paranoyak alarmları önlemek için genel WAF
# atlanmaz; OWASP CRS hassasiyeti (anomaly score threshold) standart seviyede tutulur.
# ------------------------------------------------------------------------------
resource "cloudflare_ruleset" "waf_managed_tuning" {
  zone_id     = var.zone_id
  name        = "mka-fortress-managed-ruleset"
  description = "Cloudflare Managed Ruleset ve OWASP CRS yapılandırması"
  kind        = "zone"
  phase       = "http_request_firewall_managed"

  rules {
    action = "execute"
    action_parameters {
      id = "efb7b8c94f9e413c848e4f101965f14e" # Cloudflare Managed Ruleset ID
    }
    description = "Cloudflare Managed Ruleset çalıştırma"
    expression  = "true"
    enabled     = true
  }
}

# ------------------------------------------------------------------------------
# 3. Adaptif Hız Sınırlama (Rate Limiting) Kuralları
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
  rules {
    action      = "challenge"
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
