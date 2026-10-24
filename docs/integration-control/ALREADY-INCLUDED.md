# V0.6'ya zaten alınmış PR'lar (içerilme denetimi)

- **Hedef:** `origin/integration/asrinkemali-v06-release-candidate` @ `10cdbfd70e0d2c7d12ed1e71907273d9a1f92b7e`
- **Yöntem:**
  1. `git merge-base --is-ancestor <PR başı> <hedef>`
  2. Ata değilse, ortak atadan sonraki birleştirme dışı commit'lerin `git patch-id --stable` kümeleri karşılaştırılır.
- **Kaynak:** 2026-10-24 canlı anlık görüntü (`cli.mjs inventory`).

| Sınıf | PR'lar | Anlam ve öneri |
|---|---|---|
| `ancestor_included` | #1, #4, #5, #6, #7, #8, #9, #10, **#11, #12, #13, #14, #15, #16, #17, #18, #21**, #22 | PR başı V0.6 geçmişinde birebir var. GitHub'da açık görünse de kodu V0.6'da. **İkinci kez birleştirilmemeli veya cherry-pick yapılmamalı**; kapatma/arşivleme kararı kullanıcıya ait. |
| `content_equivalent_likely` | #3 | 1/1 commit'in patch-id'si V0.6'da, farklı SHA ile. patch-id eşitliği tam semantik içerilmeyi kanıtlamaz; elle teyit önerilir. |
| `not_included` | #2, #19, #20, #23, #24, #25, #26, #27, #28 | V0.6'da yok. Bağımsız işler veya V0.6 üstüne dizilmiş zincirler. |
| `partially_included` | — | Yok |
| `unknown` | — | Yok: tüm 28 PR'ın baş commit'i yerelde çözüldü |

**PR #22 açıklamasındaki iddia doğrulandı:** #11, #12, #13, #14, #15, #16, #17, #18 ve #21 V0.6 geçmişinde ata olarak bulunuyor. #22'nin kendisi hedefin başıdır.

**Dikkat:** #2 (Antigravity ilk görsel sadakat, `main` tabanlı) hiçbir entegrasyon dalına alınmamış (0/1 patch-id). Bu, bilinçli bir terk olabilir; kullanıcı kararı gerekiyor.
