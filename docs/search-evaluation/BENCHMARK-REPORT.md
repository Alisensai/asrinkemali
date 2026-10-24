# MKA Arama Kalitesi — Baseline Benchmark Raporu

**Tarih:** 24 Ekim 2026  
**Değerlendirilen Korpus:** 168 arşiv kaydı (150 katalog + 18 legacy)  
**Sıralayıcı:** `LocalLexicalRanker` (Güvenli Türkçe Sözlüksel Sıralayıcı)

## 1. Özet Sonuçlar
| Metrik | Değer | Açıklama |
|---|---|---|
| **Toplam Sorgu** | 12 | 10 gerçek tarihî + 2 negatif test sorgusu |
| **Yargılanan Sorgu** | 10 | İlgili qrel tanımlı sorgular |
| **Negatif Sorgu Doğruluğu** | %100 | Külliyat dışı sorgularda sıfır sonuç |
| **MRR** | 0.8700 | İlk ilgili doküman ortalama 1.15 sırada |
| **Precision@1** | 0.8000 | Sorguların %80'inde ilk sonuç doğrudan ilgili |
| **Precision@3** | 0.3000 | İlk 3 sonuçta ortalama 0.9 ilgili doküman |
| **Precision@5** | 0.2000 | İlk 5 sonuçta ortalama 1.0 ilgili doküman |
| **nDCG@3** | 0.7613 | Graded kazanç ve logaritmik ceza |
| **nDCG@5** | 0.7850 | K=5 için graded alaka doğruluğu |
| **Recall@3** | 0.7500 | İlk 3 sırada ilgililerin %75'i yakalanıyor |
| **Recall@5** | 0.8000 | İlk 5 sırada ilgililerin %80'i yakalanıyor |

## 2. Negatif Testler ve Güvenlik
- **ReDoS:** `.*+?^${}()|[]\\` içeren kötü niyetli sorgular < 1ms sürede işlenmiş ve sıfır regex hatası üretmiştir.
- **CSV Formül Enjeksiyonu:** Formül başlatıcıları (`=`, `+`, `-`, `@`) otomatik filtrelenmiş ve güvenle kaçışlanmıştır.
