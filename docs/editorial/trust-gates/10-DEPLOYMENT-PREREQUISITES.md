# 10 — Gerçek insan onayı için ön koşullar

Bu listedeki her madde **insan kararıdır**. Bu görevde hiçbiri kullanıcı adına yapılmadı: hesap, kurum kimliği, yönetici şifresi veya rol oluşturulmadı.

| # | Gereksinim | Neden | Bugün |
|---|---|---|---|
| 1 | Kimlik sağlayıcı seçimi (OIDC/SAML, MFA zorunlu) | `TrustedIdentityProvider` gerçek uygulaması | Yok → `REGISTERED_IDENTITY_PROVIDER = null` |
| 2 | Aktör hesabı doğrulaması (kişi ↔ hesap) | Karar kimin adına? | Yok |
| 3 | Rol eşleme süreci (kim `historian`, kim `chief_editor`) | `EditorialPolicy.decisionRoles` | Yok → `ACTIVE_EDITORIAL_POLICY = null` |
| 4 | Tarih uzmanı ve editör atama politikası | `planAssignment` yalnız plan | Kurum ve kişi uydurulmadı |
| 5 | İnsanın kanıtı okuduğu iş akışı | `evidenceReferences` zorunlu, ama okuma kanıtı değil | UI yok (Görev 14) |
| 6 | Görev ayrılığı ve çıkar çatışması politikası | Kod destekler (yazar, çift rol) | Yazar kimlikleri kayıtlarda yok |
| 7 | Gizlilik ve veri minimizasyonu | Audit'te IP/UA saklanmıyor | Saklama gerekirse hukukî gerekçe gerekir |
| 8 | Audit saklama süresi, imza, değişmez depo, harici çapa | Zincirin tamamen yeniden yazılmasını yakalamak | Yok |
| 9 | Revizyona bağlı onay geçerlilik süresi | `approvalValidityMs` | Tanımsız (`null`); süre uydurulmadı |
| 10 | Görsel ve telif onayının hukukî sınırları | Hak kapısı otomatik izin vermez | `permission_required` / `unknown` kapalı |
| 11 | Admin paneline production erişim şartları | PR #26 + PR #28 proxy kararı | `/yonetim` kapalı. #26 × #28 semantik çakışması açık (Görev 01 bulgusu). |
| 12 | Kalıcı karar ve audit deposu (transaksiyonlu) | `partial_write` riskini kapatmak | Yok |

**Production'ı açmama kuralı:** 1, 3, 8 ve 12 birlikte sağlanmadan karar yazma yolu açılmaz. Bunlar sağlansa bile PR #12 `release-quality` kapısı, gerçek kararlar kaydedilene kadar kırmızı kalır.
