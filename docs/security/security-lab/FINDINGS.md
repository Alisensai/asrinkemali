# RED TEAM LAB bulguları

## RT-F-001 — Production CSP modlarının fail-closed uygulanması

- **Risk:** HIGH
- **Etkilenen alan:** `web/lib/security/headers.ts`
- **Davranış:** Bu laboratuvar dalının tabanı, CSP `report-only` kullanımını zorunlu CSP'nin yerine geçirmeye açıktı.
- **Beklenen:** Production'da her modda zorunlu `Content-Security-Policy` bulunmalı; report-only yalnız ek gözlem başlığı olmalı.
- **Durum:** Bu bulgu PR #72'deki ayrı uygulama güvenliği çalışmasında düzeltilmiştir; RED TEAM LAB bu davranışı RT-025 ile üretimde kontrol eder.

## N/A alanları

- Durum değiştiren API, dosya yükleme, gerçek oturum sağlayıcısı, gerçek SQL katmanı, SSRF URL fetcher ve dağıtık rate limit bu entegrasyon dalında yoktur.
- BLACKOUT kodu Claude'un ayrı dalındadır. Gerçek müdahale, ağ kesintisi veya production lockdown denenmez.
