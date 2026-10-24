# SECURITY

## Bulunan ve düzeltilen açıklar (PR #19 kaynaklı)

| # | Bulgu | Etki | Düzeltme | Test |
|---|---|---|---|---|
| 1 | CLI `--out` yalnız katalog dizinlerini engelliyordu. `../../x`, `.git/hooks/pre-commit`, `web/app/page.tsx` gibi yollara yazılabiliyordu. | Repo dışına / kod dosyalarına yazım | İzin listesi + realpath + symlink reddi + atomik yazım (`safe-output.mjs`). İhlalde çıkış 3. | QA-091…098 |
| 2 | Koruma hatası tam yerel mutlak yolu yazdırıyordu | Bilgi sızıntısı | Mesaj yalnız korunan kök adını içeriyor | QA-097 |
| 3 | CSV dışa aktarma `=`, `+`, `-`, `@` ile başlayan hücreleri kaçışlamıyordu | Hesap tablosu formül enjeksiyonu | Hücre başına `'` | QA-024 |
| 4 | JSON içe aktarma `rights`, `urlStatus` ve `approvedBy`/`publicationApproval` alanlarını koruyordu | Güvenilmeyen hak/onay iddiası veride kalıyordu | `sanitizeImportedCandidate` | QA-021 |
| 5 | İçe aktarmada boyut, derinlik ve prototip anahtarı sınırı yoktu | Kaynak tüketimi, kirlenme riski | 10 MB, 16 düzey, `__proto__`/`constructor`/`prototype` reddi | QA-025/026 |
| 6 | CSV BOM'u ilk sütun adını bozuyordu (`﻿id`) | Geçerli dosya reddediliyordu | BOM temizliği | QA-023 |
| 7 | `localhost.` (sonda nokta), 224/4, 240/4, 255.255.255.255, `ff00::/8`, NAT64, `2001:db8::/32`, yön karakterleri kabul ediliyordu | SSRF yüzeyi | `url-security.mjs` | QA-079…086 |
| 8 | Sağlayıcı kaydı aynı kimliği sessizce eziyordu | Sessiz davranış değişikliği | Reddedilir; ağ sağlayıcısı kabul edilmez | QA-029/030 |
| 9 | Aday durum makinesi her geçişe izin veriyordu (`new → import_ready`) | İnceleme kapısının atlanması | Açık matris | QA-031…038 |

## Değişmeyen güvenlik sınırları

- Ağ: varsayılan olarak hiçbir komut fetch veya DNS sorgusu yapmaz (QA-087). Erişim denetimi yalnız enjekte edilen uygulamayla çalışır. Her yönlendirme yeniden yapısal ve DNS denetiminden geçer; en fazla 3 yönlendirme izlenir; kimlik bilgisi ve çerez gönderilmez.
- Web: `/arastirma-laboratuvari` production'da `MKA_RESEARCH_LAB=1` olsa bile 404 döner (QA-099/100; production sunucu smoke testi TEST-MATRIX'te). `NEXT_PUBLIC_*` bayrağı yok. Aday okuyucu `server-only`.
- Fortress (PR #28) bu tabanda yok; CSP ve proxy dosyalarına dokunulmadı.
- `release-quality.yml`, `security.yml` ve `nextjs.yml` değiştirilmedi.

## Çıkış kodları

| Kod | Anlam |
|---|---|
| 0 | Başarı |
| 1 | Doğrulama veya beklenen kapı (ör. rapor engeli, `validate --strict` bulgusu) |
| 2 | Kullanım hatası |
| 3 | Politika ihlali (izinsiz çıktı yolu) |

Yığın izi yalnız `MKA_DEBUG=1` ile gösterilir.

## Kalan riskler

- Windows'ta symlink testleri (QA-094) yetki yokluğundan atlandı; Linux CI'da koşar.
- `realpath` ile yazım arasında TOCTOU penceresi var. Geçici dosya `wx` bayrağıyla oluşturuluyor ve rename atomik; dizin değiştirme yarışı tamamen kapatılmış değil.
- Tek kovada çok aday birikirse dedupe karesel kalır (DEDUP-PROVENANCE).
