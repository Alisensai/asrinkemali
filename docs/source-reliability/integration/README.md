# Kaynak Güvenilirliği ve Kalite Köprüsü (Görev 05)

## Mimari Genel Bakış
Bu modül, OpenCode tarafından PR #20 kapsamında geliştirilen 	ools/archive-source-reliability/ aracını koruyarak, platformun diğer sistemlerine (yayın, araştırma, yönetim ve vitrin) salt-okunur ve güvenli bir köprü (web/lib/source-reliability/) sağlar.

## Sağlanan Fonksiyonlar
1. getCatalogSourceHealth(): Katalog kaynak sağlığı, birincil/ikincil oranları ve yayın riskleri.
2. getSourceFindingsForRecord(recordId): Belirli bir kayıt için bibliyografik eksiklikler ve bulgular.
3. getEarlyPeriodCoverage(): 1881-1918 dönemi evre analizi ve araştırma açıkları.
4. get13EarlyPeriodCandidates(): Henüz doğrulanmamış 13 erken dönem adayı (asla otomatik içeri alınmaz).
5. getHumanReviewWorklist(): İnsan uzman ve editör onayı bekleyen kritik kontrol listeleri.
