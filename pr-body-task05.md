## Motivation & Amaç

Mustafa Kemal Atatürk odaklı bağımsız tarih ve kültür platformu **ASRIN KEMALİ (MKA)** için, devralınan görevlerden **Görev 05: OpenCode Kaynak Güvenilirliği, Provenans Denetimi, URL Tarihçesi, Haklar ve Arşiv Kalitesi Entegrasyonu** tamamlanmıştır.

Bu PR ile:
1. OpenCode PR #20 kapsamında geliştirilen bağımsız 	ools/archive-source-reliability/ denetim araç seti korunarak projeye entegre edilmiştir.
2. Web ve diğer backend sistemleri için tip güvenli, salt-okunur bir köprü adaptörü (web/lib/source-reliability/) oluşturulmuştur.
3. 168 arşiv kaydı için birincil/ikincil/referans sınıflandırması, tarih kesinliği ve görsel hakları denetimleri sağlanmıştır.
4. 13 erken dönem araştırma adayı status: unverified, ingest: false, humanApproved: false olarak kesinlikle korunmuştur.
5. Asıl arşiv katalog dosyalarında (data/archive/) sıfır mutasyon ilkesi hash karşılaştırmasıyla güvence altına alınmıştır.

---

## Değişen ve Eklenen Dosyalar

- 	ools/archive-source-reliability/ [YENİ / PR #20 ENTEGRASYONU]
- web/lib/source-reliability/types.ts [YENİ]
- web/lib/source-reliability/service.ts [YENİ]
- web/lib/source-reliability/index.ts [YENİ]
- web/tests/source-reliability-bridge.test.mjs [YENİ]
- docs/source-reliability/integration/ [YENİ DOKÜMANTASYON]

---

## Doğrulama ve Test Sonuçları

1. **Araç Birim Testleri (
pm --prefix tools/archive-source-reliability test)**:
   - **84 / 84 PASS** (sıfır hata)
2. **Web Köprü Testleri (
ode --test web/tests/source-reliability-bridge.test.mjs)**:
   - **5 / 5 PASS**
3. **Web Toplam Test Paketi (
pm test)**:
   - **81 / 81 PASS**
4. **Arşiv Doğrulaması (
ode scripts/archive/validate.mjs)**:
   - 168 kayıt, 151 yayımlanmış, 0 hata (başarılı).
5. **Katalog Bütünlüğü:**
   - data/archive/catalog/index.json SHA-256 hash değeri işlem öncesi ve sonrasında birebir aynıdır (mutasyonsuz).

---

## Güvenlik ve İnsan Onayı Beyanı

- Hiçbir sayfada sahte 'tarihçi onayladı' veya yetki damgası kullanılmamıştır.
- 13 erken dönem adayı arşiv kataloğuna sızdırılmamıştır (ingest: false).
- Platform bağımsız bir araştırma projesidir; resmî kamu kurumu değildir.
