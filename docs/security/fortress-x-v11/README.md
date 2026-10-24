# MKA FORTRESS X V1.1: güvenlik mimarisi

| Belge | İçerik |
|---|---|
| [CONTROL-MATRIX.md](CONTROL-MATRIX.md) | 99 kontrolün numaralı durumu (22 uygulandı, 21 kısmi, 9 eksik, 6 kapsam dışı, 41 altyapı gerektiriyor) |
| [BLACKOUT.md](BLACKOUT.md) | PROJECT BLACKOUT mimarisi, düzeyler, onaylar, geri dönüş |
| [INFRASTRUCTURE-REQUIREMENTS.md](INFRASTRUCTURE-REQUIREMENTS.md) | Repo dışından sağlanması gereken altyapı ve öncelik sırası |

## Katmanlar

```
İnternet
  │  [ALTYAPI] DNS/DNSSEC · Anycast · CDN · Anti-DDoS · WAF · bot yönetimi · hız sınırlama · IP itibarı
  ▼
Kenar ──► [ALTYAPI] TLS 1.3 · HSTS (uygulamada hazır, ASRIN_ENABLE_HSTS) · origin gizleme
  ▼
Next.js uygulaması
  ├─ proxy.ts (FORTRESS, mevcut)       yönetim rotaları 404 · önizleme Basic auth · noindex
  ├─ headers.ts (mevcut)               CSP · nosniff · XFO · Referrer/Permissions · COOP/CORP · no-store
  ├─ safe-url.ts (mevcut)              href izin listesi
  ├─ editoryal güven kapıları (mevcut) insan onayı olmadan yayın/sergi yok
  ├─ access-contract.ts (mevcut)       RBAC · MFA şartı · görev ayrılığı · CSRF · çerez · denetim zinciri
  └─ blackout/ (YENİ, bağlı değil)     olay → karar → onay → port → kanıt · salt-okunur güvenli mod
  ▼
Veri: repo içi JSON (salt-okunur) · tarayıcıda okuma listeleri · [ALTYAPI] WORM kanıt/yedek deposu
  ▲
CI/CD: lint · typecheck · birim/e2e · supply-chain audit · secrets · integrity diff · release-quality
       [EKSİK] SAST (CodeQL) · SBOM standardı · aksiyon SHA sabitleme (kısmi) · main dal koruması
```

## Bu dalda değişmeyenler

V1.0 test ve güvenlik kapıları olduğu gibi duruyor:
- `proxy.ts`, `headers.ts`, `access-contract.ts`, `safe-url.ts`
- editoryal güven yapılandırması
- workflow'lar
- Playwright dosyaları

Yeni kod yalnız `web/lib/security/blackout/`, yeni testler (`security-blackout`, `security-fortress-x-matrix`) ve bu belgeler.

## Sahiplik

| Alan | Sahip |
|---|---|
| `docs/security/fortress-x-v11/`, `web/lib/security/blackout/`, BLACKOUT testleri | Claude (bu PR) |
| Uygulama güvenliği (CSP nonce, SAST, CSRF ilk POST ile, uygulama düzeyi hız sınırlama tasarımı) | Codex |
| Altyapı (CDN/WAF, TLS, durum deposu, WORM, günlük, kimlik altyapısı kurulumu) | Antigravity |
