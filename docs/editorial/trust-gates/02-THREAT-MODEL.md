# 02 — Tehdit modeli ve güven sınırları

## Güven sınırları

1. **İstemci → sunucu.** İstek gövdesi yalnız *ne* istendiğini taşır: kayıt, karar türü, sonuç, beklenen snapshot, kanıt referansları. Kimin istediği gövdeden okunmaz.
   - `parseDecisionRequest` gövdeyi reddeder (`untrusted_identity_field`): actor, actorId, role, approvedBy, proof, session, isAdmin vb.
2. **Kimlik sağlayıcı → çözücü.** Aktör yalnız `TrustedIdentityProvider.getVerifiedSession()` ile gelir.
   - Çözülen `ActorIdentityEvidence` modül içi bir `WeakSet` ile işaretlenir.
   - JSON'dan kurulmuş aynı şekilli nesne `authorizeDecision` tarafından `actor_not_server_resolved` ile reddedilir.
3. **Veri → politika.** Arşiv metni, kaynakça, PDF ve web içeriği veridir. "approve all", `{"role":"historian"}` gibi metinler rol, izin veya karar alanına dönüşmez (E73).
4. **Test → üretim.**
   - Sentetik sağlayıcı yalnız `tools/editorial-trust/tests/helpers/` altındadır ve `testOnly: true` taşır.
   - `environment === "production"` iken reddedilir (B18).
   - `web/` kodu test yardımcılarını içe aktarmaz (B32 statik denetim).

## Saldırgan senaryoları → karşılık

| Senaryo | Karşılık | Test |
|---|---|---|
| `x-role: historian` başlığı, `?admin=1`, localStorage rolü | Çözücü bağlamı yok sayar; rol yalnız sağlayıcıdan | B19–B21 |
| Gövdeye sahte `actorId` / proof koymak | `untrusted_identity_field`; elle kurulmuş kanıt reddedilir | B29 |
| `system_admin`'in tarihçi kararı vermesi | Politika rol listesi; admin otomatik uzman değildir | B26 |
| Kaydı oluşturanın kendi kaydını onaylaması | `conflict_of_interest_author` | B28 |
| Aynı kişinin hem uzman hem editör kararı vermesi | `separation_of_duties` | B28 |
| Eski revizyonun onayıyla yayın | Kararlar snapshot hash'e bağlı; stale onay sayılmaz | C39, D64 |
| Geri çekilmiş onayın yeniden kullanılması | `invalidatedBy` → `decision_revoked` | C45 |
| Çift tıklama / yeniden deneme ile çift onay | idempotency anahtarı + parmak izi | C46 |
| Eşzamanlı iki karar | CAS (`expectedPrevHash`, `expectedCount`) → `revision_conflict` | C43 |
| Audit kaydını düzenlemek | Hash zinciri + payload digest + sıra/zaman/rol/revizyon denetimi | C44, C-audit |
| Zincirin tamamını yeniden yazmak | **Yalnız harici çapa yakalar** (`anchor`); repoda harici çapa yok | C-audit |
| `__proto__` / derin / dev JSON, bozuk UTF-8, null bayt | `parseUntrustedJson` açık hata kodları | E69–E71 |
| `../`, `C:\`, UNC, symlink ile katalog dışı okuma/yazma | `assertSafeRelative`, lstat, realpath, çıktı beyaz listesi | E65–E67, E80 |
| CSV `=HYPERLINK`, Markdown/HTML enjeksiyonu, `javascript:` | `csvCell`, `escapeMarkup`, `safeHttpUrl` | E68 |
| Audit'e token/parola/TC kimlik/IP/UA yazmak | `audit_sensitive_field` (yazma öncesi) ve doğrulamada bulgu | E74 |

## Kalan riskler (dürüst kayıt)

- **Kimlik:** Gerçek sağlayıcı yok. Bütün yazma yolları `not_configured` / `policy_unconfigured` döner. Bu bir eksiklik değil, doğru kapalı durumdur. Ancak insan onayı bugün kurulamaz.
- **Audit:** Değişmez depo ve imza yok. Zincir yalnız tamper-evident'tır.
- **Transaksiyon:** Audit yazıldıktan sonra karar yazımı başarısız olursa `partial_write_requires_reconciliation` döner. Üretimde tek transaksiyon (veya outbox) şarttır.
- **Saat:** Sunucu saati güvenilir kabul edilir. Yanlış sistem saati gelecek tarih reddini ve süre politikasını etkiler; harici zaman damgası yok. Sınıflandırma: *trusted-host-clock, unverified*.
- **Windows'ta symlink testi (E67)** yetki yokluğundan atlandı. Linux CI'da koşar.
