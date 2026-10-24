# İzole entegrasyon provaları — gerçekten koşulanlar

**Koşullar:**
- Taban: V0.6 @ `10cdbfd`.
- Her prova işletim sistemi geçici dizininde, sahiplik işaretli, ayrık bir worktree'de çalıştı.
- **Hiçbir uzak dala push yapılmadı**; hiçbir dal değişmedi.
- Her provada ana deponun HEAD, durum ve ref parmak izi önce/sonra karşılaştırıldı (`mainRepoUnchanged`).

Kanıt dosyası: `reports/rehearsal-result.json`.

## Metin düzeyi (merge)

| Prova | Sonuç | Birleşik ağaç |
|---|---|---|
| V0.6 + #25 → #23 | `clean_merge_possible` | `ab93dbad20` |
| V0.6 + #23 → #25 | `clean_merge_possible` | **`ab93dbad20` (aynı)**: uygulama sırası sonucu değiştirmiyor |
| V0.6 + #23 → #27 | `clean_merge_possible` | `ef9c3932b9` |
| V0.6 + #25 → #28 | `clean_merge_possible` | `ae933e1c52` |
| #27 tek başına / #24 tek başına | **plan BLOCKED**: ön koşul #23 / #19 eksik | — |

## Semantik doğrulama (npm ci + gerçek e2e)

| Prova | Komutlar | Sonuç |
|---|---|---|
| V0.6 + **#26** | `npm ci` ✓ (95 sn), `e2e/admin-v08.spec.ts` **2/2 geçti** | `validated_in_rehearsal` |
| V0.6 + #25 + #28 + **#26** | `npm ci` ✓ (74 sn), `e2e/admin-v08.spec.ts` **2 başarısız** | **`test_failed`** |

**Sonuç: gerçek bir PR'lar arası semantik çakışma.**
- #26'nın kendi testi `/yonetim` için HTTP 200 ve "Yönetim paneli erişime kapalı" başlığını bekliyor.
- #28'in kapalı-başarısız proxy'si, kayıtlı kimlik sağlayıcı yokken `/yonetim` isteğini uygulamaya ulaşmadan **404** ile yanıtlıyor.
- İki PR da güvenli tarafta kalıyor (panel her durumda kapalı). Ancak birlikte entegre edildiklerinde #26'nın erişim reddi sayfası ve testleri çalışmıyor.
- Metin düzeyinde çakışma yok (`merge-tree` temiz). Bu durumu yalnız semantik kural ve prova yakalayabildi.

**Karar gerekiyor (Görev 14 + Claude Fortress):**
- **(a)** Proxy, `/yonetim` için kendi 404'ü yerine panelin kapalı-başarısız sayfasına izin verir; panel kayıtlı sağlayıcı yokken zaten oturum `null` döndürüyor.
- **(b)** Panel testleri 404 bekleyecek biçimde güncellenir.

Bu görevde iki PR'ın dosyalarına dokunulmadı.

## Geçersiz sayılan ilk denemeler (dürüstlük kaydı)

| Deneme | Neden geçersiz | Araçta yapılan düzeltme |
|---|---|---|
| #26 tek başına (ilk) | 49173 portunda **başka ajanın (Copilot) çalışan sunucusu** vardı; e2e hiç başlamadı. O sunucu kapatılmadı. | Ortam hatası artık `blocked`; prova e2e'si rastgele `ASRIN_E2E_PORT` kullanıyor |
| #25 + #28 + #26 (ilk) | Dev sunucusu `next/font` hatasıyla başlamadı; test sonucu değil. Dev sunucusu `web/next-env.d.ts` dosyasını yeniden ürettiği için temizlik (doğru biçimde) reddedildi. | Yalnız bilinen üretilen dosyalar temizlikten önce geri alınıyor. Kalan dizin aracın kendi temizliğiyle kaldırıldı. |
| İlk denemede `mainRepoUnchanged: false` | Prova sürerken **benim** aynı çalışma ağacına belge yazmamdan kaynaklandı | Tekrar koşular sessiz ağaçta yapıldı → `true` |

## Henüz koşulmayanlar (NOT_RUN)

- #19 ve #24 zincirinin V0.6'ya yeniden hedeflenmiş provası (Görev 07/08)
- Tam production build ve tüm e2e paketi ile birleşik prova (yalnız ilgili spec koşuldu)
- Firefox ve WebKit
