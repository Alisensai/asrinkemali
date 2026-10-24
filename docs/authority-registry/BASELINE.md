# MKA Authority Registry — Baseline Raporu

**Tarih:** 24 Ekim 2026  
**Kaynak Dal:** `feature/copilot-v07-source-reliability-integration` (PR #58)  
**Hedef Dal:** `feature/copilot-v07-authority-registry-integration`

## 1. Arşiv Kaynak İstatistikleri
- Toplam İncelenen Arşiv Kayıt Dosyası: 168
  - `data/archive/catalog/*.json`: 150 kayıt
  - `content/archive/records/*.json`: 18 kayıt
- Arşiv Kaydı Doğrulama Hataları: 0

## 2. Çıkarılan Varlık ve Gözlem İstatistikleri
- Toplam Otorite Varlığı: 370
  - Şahıslar (Persons): 94
  - Mekânlar (Places): 35
  - Kurumlar (Institutions): 5
  - Tarihî Olaylar (Events): 69
  - Kaynak Eserler (Source Works): 167
- Toplam Gözlem (Observations): 957
- Toplam Kayıt Referansı (Record References): 789
- İlişki Grafı Düğüm / Kenar Sayısı: 538 düğüm / 789 kenar

## 3. Güvenlik ve Bütünlük İspatı
- Simüle Edilen Geçiş (Dry-Run Migration):
  - İncelenen kayıt sayısı: 168
  - Eşleştirilen şahıs sayısı: 217
  - Eşleştirilen mekân sayısı: 167
  - Eşleştirilen kurum sayısı: 168
  - Diske yazma girişimi: 0 (Sıfır — Tamamen salt okunur)
- İnsan Onay Durumu: 370 varlığın tamamı `humanApproval: null` ve `status: "provisional"` olarak korunmuştur.
