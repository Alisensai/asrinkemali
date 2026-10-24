# Güvenlik kontrol listesi ve sınırlar

| Kontrol | Bu PR'daki sonuç | Kalan gereksinim |
|---|---|---|
| Kimlik sağlayıcısı olmayan admin rota | 404 + `noindex` | Gerçek IdP ile production E2E ayrı sprint |
| `x-admin-role`, Basic auth, query, localStorage | Yetki kaynağı değil; production E2E'de 404 | PR #28 proxy ile birlikte tekrar koşulmalı |
| Provider exception / bozuk principal | Oturum çözümü `null` ile kapanır | Gerçek sağlayıcı testleri |
| Fortress role crosswalk | Permission kesişimi; çoklu rol reddi | #28 provider/register yok; adapter bağlanmadı |
| MFA / self approval | Saf action policy testi var | Gerçek MFA assertion ve resource author verisi yok |
| Uzman + editör görev ayrılığı | Farklı trusted grant + güncel record SHA zorunlu sözleşme | İnsan audit olayı ve durable DB yok |
| Form hash'i | Tam arşiv JSON kanonik SHA-256 ile doğrulanıyor | Approval şeması ve transaction henüz yok |
| Staging input | İzinli alanlar, bounded JSON, traversal/prototype key reddi | Durable CAS repository yok; default `not_configured` |
| Audit redaction | Nested secret/PII alanları maskeleniyor | PII sınıflandırması/retention politikası kurum kararı |
| Audit chain | Duplicate ID ve hash/link bozulması saptanır | Hash-chain imza/harici append-only storage sağlamaz |
| Kaynak URL'si | HTTPS dışı link gösterilmez; ham medya URL'si risk olarak işaretlenir | Landing page/provenans kararını insan vermeli |
| Release gate | Bekleyen/eskimiş/beyan edilmiş formlar bloklanır | Hiçbir gate devre dışı bırakılmadı |
| PR #28 CSP / preview / health | Bu feature dalında bulunmuyor | #28 ile entegrasyon sonrası test; güvenlik kodu sahipliği Claude'da |

## Tehdit sınırı

`FortressSessionProvider` bir sözleşmedir, kimlik doğrulayıcı değildir. `resolveAdminPermissionGrant` yalnızca kendisine verilen provider'ın `verifySession()` sonucunu güvenli kabul eder; uygulamada provider kaydı yoktur. Bir testte oluşturulan grant üretim aktörü değildir. Admin rotaları ve sayfaları provider yokken hiç read model çağırmadan `notFound()` üretir.

Audit chain SHA-256 ile bütünlük kontrolüdür; anahtar veya imza olmadığı için yazarı doğrulamaz, kalıcı depolamanın değiştirilemez olduğunu ispatlamaz.
