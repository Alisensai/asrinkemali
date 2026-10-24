# Editoryal güven raporu

- Üretim: 2026-10-24T01:25:19.080Z
- Dal / commit: `feature/claude-v07-editorial-trust-gates` / `92ec92589f0ea17883af4808dd77f53435065a76`
- Katalog özeti: `03e645645425298bff97137e6449a9d80b6f7951408b81ffe2513a0688d7884e`
- Kısmi veri: hayır

## Ayrık sonuç

| Katman | Sonuç |
|---|---|
| A. Mühendislik (teknik testler) | bu raporda doğrulanmadı |
| B. İnsan editoryal yayın hazırlığı | **ENGELLİ** (168 kayıt engelli, 2 global kritik bulgu) |

## Sayımlar

| Ölçüm | Değer |
|---|---|
| Katalog kaydı | 168 |
| Form dosyası | 168 |
| Kayıtla eşleşen form | 168 |
| Eksik form | 0 |
| Kaydı olmayan (yetim) form | 0 |
| Yinelenen kayıt kimliği | 0 |
| Aynı kayda ikinci form | 0 |
| Geçersiz form | 0 |
| Okunamayan dosya | 0 |
| Pending form | 168 |
| Stale form | 0 |
| Doğrulanmamış inceleme iddiası | 0 |
| Kimliği doğrulanmış gerçek uzman incelemesi | 0 |
| Doğrulanmış gerçek editör kararı | 0 |
| Teknik `published` etiketi | 151 |
| Hak engelli kayıt | 2 |
| Eksik kaynak konumu | 0 |
| Yayına hazır kayıt | 0 |
| Makale kaydı | 0 |

## Bulgu kodları

| Kod | Adet |
|---|---|
| `audit_chain_invalid` | 1 |
| `credential_provider_unavailable` | 1 |
| `missing_editor_approval` | 168 |
| `missing_historian_review` | 168 |
| `release_blocked_by_policy` | 151 |
| `rights_unclear` | 2 |

_Bulgular kayıt başına ve kod başına bir kez sayılır. Global bulgular (kimlik, audit, yinelenen, yetim, okunamayan) ayrı listelenir._

## Global bulgular

- **credential_provider_unavailable** (critical): Güvenilir kimlik sağlayıcısı veya editoryal politika yapılandırılmamış. → Güvenilir kimlik sağlayıcısı ve rol eşlemesi yapılandırılmalı (10-DEPLOYMENT-PREREQUISITES).
- **audit_chain_invalid** (critical): Güvenilir editoryal audit deposu yok; doğrulanacak karar zinciri bulunmuyor. → Audit zinciri onarılamaz; olay kaynağı incelenmeli, yeni kararlar yeniden alınmalı.
