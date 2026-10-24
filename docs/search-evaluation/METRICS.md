# MKA Arama Değerlendirme Metrikleri

## 1. Precision@K
İlk $K$ sonuçta dönen ilgili dokümanların oranını ifade eder:
$$\text{Precision@K} = \frac{|\text{Retrieved@K} \cap \text{Relevant}|}{K}$$
Tekrarlanan doküman ID'leri tek kabul edilir.

## 2. Recall@K
Külliyatta o sorgu için mevcut olan toplam ilgili dokümanların ilk $K$ sonuçta ne kadarının yakalandığını ölçer:
$$\text{Recall@K} = \frac{|\text{Retrieved@K} \cap \text{Relevant}|}{|\text{Relevant}|}$$

## 3. Mean Reciprocal Rank (MRR)
İlk ilgili dokümanın sırasının çarpmaya göre tersidir:
$$\text{RR} = \frac{1}{\text{rank}_{\text{first}}}$$
Sorgu kümesi üzerindeki ortalama MRR olarak raporlanır.

## 4. Graded nDCG@K
Farklı alaka düzeylerini (0: İlgisiz, 1: Dolaylı, 2: İlgili, 3: Doğrudan/Ana Konu) ağırlıklandırarak ölçer:
$$\text{DCG@K} = \sum_{i=1}^{K} \frac{2^{\text{grade}_i} - 1}{\log_2(i + 1)}$$
$$\text{nDCG@K} = \frac{\text{DCG@K}}{\text{IDCG@K}}$$
İdeal sıralama (IDCG), o sorgu için tanımlı qrels derecelerinin büyükten küçüğe dizilmesiyle hesaplanır.
