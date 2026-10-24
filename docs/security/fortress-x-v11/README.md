# MKA FORTRESS X V1.1: güvenlik mimarisi

| Belge | İçerik |
|---|---|
| [SOURCE-CONTROL-LIST.md](SOURCE-CONTROL-LIST.md) | Kullanıcının özgün kontrol listesi (99 madde; "Firewall" numarasız başlık) |
| [CONTROL-MATRIX.md](CONTROL-MATRIX.md) | Özgün 99 maddenin ASRIN KEMALİ durumu (5 uygulandı, 25 kısmi, 13 eksik, 10 kapsam dışı, 46 altyapı gerektiriyor) + ayrı ek öneriler (E1–E13) |
| [BLACKOUT.md](BLACKOUT.md) | PROJECT BLACKOUT mimarisi, düzeyler, onaylar, geri dönüş |
| [INFRASTRUCTURE-REQUIREMENTS.md](INFRASTRUCTURE-REQUIREMENTS.md) | Repo dışından sağlanması gereken altyapı ve öncelik sırası |
| [BLACKOUT-INTEGRATION-CONTRACT.md](BLACKOUT-INTEGRATION-CONTRACT.md) | Antigravity (edge/altyapı) için BLACKOUT sözleşmesi ve PR #73 değişiklik önerileri |
| [PORTS.md](PORTS.md) | Port sözleşmeleri, gereken harici hizmetler, güvenli bağlantı, bugünkü durum |
| [PR72-CSP-REVIEW.md](PR72-CSP-REVIEW.md) | Codex PR #72 CSP düzeltmesinin incelemesi; production `report-only` riski |

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
  └─ blackout/ (proxy'de, depo yok→NORMAL) rota politikası · olay → karar → onay → CAS durum → kanıt
  ▼
Veri: repo içi JSON (salt-okunur) · tarayıcıda okuma listeleri · [ALTYAPI] WORM kanıt/yedek deposu
  ▲
CI/CD: lint · typecheck · birim/e2e · supply-chain audit · secrets · integrity diff · release-quality
       [EKSİK] SAST (CodeQL) · SBOM standardı · aksiyon SHA sabitleme (kısmi) · main dal koruması
```

## Bu dalda değişmeyenler

V1.0 test ve güvenlik kapıları olduğu gibi duruyor:
- `headers.ts` (PR #72 CSP düzeltmesi dahil), `access-contract.ts`, `safe-url.ts`
- editoryal güven yapılandırması ve 302 insan onayı bulgusu
- workflow'lar
- Playwright dosyaları

Tek dar kapsamlı uygulama değişikliği `proxy.ts` (Görev 09): FORTRESS kararından **sonra** BLACKOUT geçişi eklendi. FORTRESS önceliği korunuyor; BLACKOUT yalnız ek kısıt uygulayabilir. Kayıtlı durum deposu yokken davranış değişmez.

Diğer yeni kod `web/lib/security/blackout/` altında. Yeni testler: `security-blackout`, `security-blackout-integration`, `security-fortress-x-matrix`.

## Sahiplik

| Alan | Sahip |
|---|---|
| `docs/security/fortress-x-v11/`, `web/lib/security/blackout/`, BLACKOUT testleri | Claude (bu PR) |
| Uygulama güvenliği (CSP nonce, SAST, CSRF ilk POST ile, uygulama düzeyi hız sınırlama tasarımı) | Codex |
| Altyapı (CDN/WAF, TLS, durum deposu, WORM, günlük, kimlik altyapısı kurulumu) | Antigravity |
