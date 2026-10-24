# Kaynak Güvenilirliği Entegrasyonu — Baz Çizgisi Raporu

**Görev:** MKA-SOURCE-RELIABILITY-BRIDGE-05 (Görev 05)  
**Tarih:** 24 Ekim 2026  
**Kaynak Dal / SHA:** `feature/opencode-v07-source-reliability` (`890a24aa13471173eeb306c8b0d5efd104054a45`)  
**Taban Dal:** `feature/claude-v07-editorial-trust-gates` (`b567c49`, PR #39)  
**Yeni Özellik Dalı:** `feature/copilot-v07-source-reliability-integration`

## 1. Test Sonuçları
- **Modül Testleri (`tools/archive-source-reliability`):** 84 / 84 PASS (sıfır hata)
- **Web Entegrasyon Testleri (`web/tests/source-reliability-bridge.test.mjs`):** 5 / 5 PASS
- **Web Toplam Birim Testleri:** 81 / 81 PASS
- **Arşiv Katalog Doğrulaması (`node scripts/archive/validate.mjs`):** 168 kayıt, 151 yayımlanmış, 0 hata (başarılı)

## 2. Katalog Sağlık ve Dağılım Özeti
- **Toplam Arşiv Kaydı:** 168 (151 yayımlanmış, 16 incelenmiş, 1 taslak)
- **Birincil Kaynak:** 34
- **İkincil Kaynak:** 107
- **Referans Kaynak:** 27
- **Bilinmeyen Kaynak:** 0
- **Birincil Kaynak Payı:** %20.24
- **Doğrulanmamış Görsel Hakları:** 21 (yalnızca kaynak bağlantısı, doğrudan barındırma izni yok)
- **İnsan Uzman/Editör Onayı Bekleyen:** 151 (kapalı-başarısız koruma)

## 3. 13 Erken Dönem Adayı İnvaryantı
`tools/archive-source-reliability/data/early-period-candidates.json` altındaki 13 adayın tamamı:
- `status: "unverified"`
- `ingest: false`
- `humanApproved: false`
- `verificationRequired: true`
Olarak korunmuştur. Hiçbiri otomatik olarak kataloğa eklenmemiştir.
