# 07 — Açık ve kapalı kapılar

Gerçek repo, 2026-10-24. Komut: `node tools/editorial-trust/cli.mjs gate-check --root .` → **çıkış 1**.

## İki katmanlı sonuç

| Katman | Durum |
|---|---|
| A. Mühendislik (şema, birim, güvenlik, CLI, typecheck, build) | 09-TEST-REPORT'taki gerçek koşulara bakın |
| B. İnsan editoryal yayın hazırlığı | **ENGELLİ**: 168/168 kayıt engelli, 2 global kritik bulgu |

`--technical-tests passed` verildiğinde bile B engelli kalır (F86/F96). Bu doğrudur.

## Kapı bazında

| Kapı | Açık mı? | Neden |
|---|---|---|
| `schema_valid` | 168/168 açık | Asgari yapısal şema geçti. Tarihi bilinmeyen tek draft kayıt şemaya uygundur; tarih kanıt kontrolünde `fail` olur. |
| `source_provenance_sufficient` | 168/168 açık | Kurum + https + katalog/provenance kimliği var. Bu doğruluk değil, **konum** bilgisidir. |
| `rights_status_acceptable` | 166/168 | 2 kayıtta `rights.status = unknown` (`rights_unclear`) |
| `current_revision_matched` | 168/168 | 0 stale form |
| `human_historian_review_verified` | **0/168** | Doğrulanmış uzman kararı yok |
| `human_editor_approval_verified` | **0/168** | Doğrulanmış editör kararı yok |
| `audit_integrity_verified` | **kapalı** | Editoryal audit deposu yok |
| `technical_tests_passed` | CI'dan verilir | Varsayılan `false` (bilinmiyor) |
| `release_ready` | **0/168** | Bayraklar bağımsızdır; teknik başarı bunu açamaz |

## Global kritik bulgular

1. `credential_provider_unavailable`: güvenilir kimlik sağlayıcısı ve editoryal politika yok.
2. `audit_chain_invalid`: doğrulanacak karar zinciri yok.

## Kural ağacı (örneklerle)

| Durum | Sonuç | Test |
|---|---|---|
| Aktör doğrulanmadı | Karar kaydı yazılamaz (`identity_unavailable` / `not_configured`) | B17, C41 |
| Uzman incelemesi eksik | Yayın kapısı kapalı (`missing_historian_review`, kritik) | D57 |
| Hak belirsiz | Otomatik görsel/metin yayını yok (`rights_unclear` / `permission_required`) | D51–D53 |
| Kayıt stale | Eski editör onayı kullanılamaz | D64 |
| Kanıt bağlantısı erişilemiyor | Manuel kontrol adayı (`needs_review`); otomatik tarihsel ret yok. Ağ isteği hiç yapılmaz. | D49 |
| Şema geçersiz | Yayın kapısı kapalı (`schema_invalid`, kritik) | D56 |
| İzinli onay kaydı yok | Yayın kapısı kapalı | D58 |

## Production'da kapalı kalan işlemler

- Uzman kararı yazma
- Editör kararı yazma
- Karar geri çekme
- Atama yazma
- Düzeltme önerisi uygulama
- Yayın geçişi (`approved` / `scheduled` / `published` mutasyonu, PR #29 adapter'ı da reddeder)
