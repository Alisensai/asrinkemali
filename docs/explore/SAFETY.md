# MKA Keşfet Güvenlik ve Yayın Doğruluk Politikası (Görev 29)

**PROJE:** Mustafa Kemal Atatürk odaklı bağımsız tarih ve kültür platformu  
**MODÜL:** Keşif & Açıklanabilir Öneriler  
**TARİH:** 24 Ekim 2026

---

## 1. MKA Veri Doğruluk Anayasası ve Yayın Kapısı

1. **Bağımsız Platform Sınırı**:
   Asrın Kemali bağımsız bir tarih ve kültür platformudur; resmî kamu kurumu, devlet dairesi veya enstitü hüviyeti taşımaz.
2. **Sıfır Sahte Onay İlkesi**:
   `verification.status = "published"` bir teknik katalog statüsüdür. Arayüzde hiçbir kart veya öneri üzerinde "onaylı tarihçi", "akademik kurul onaylı" veya benzeri sahte onay rozetleri kullanılamaz. Kullanıcıya daima `reviewLabel("published")` karşılığı olan **"Kaynak denetimli · uzman onayı bekliyor"** ibaresi sunulur.
3. **Taslak ve Araştırma Verisi İzolasyonu**:
   `getPublishedArchiveRecords()` filtresi gereği, `status = "draft"` veya `status = "reviewed"` olan hiçbir kayıt `/kesfet` arama sonuçlarına, tematik kümelere veya öneri havuzuna sızamaz.
4. **Alıntı ve Tarihsel İlişki Güvencesi**:
   Hiçbir yapay zekâ modeli veya algoritma uydurma alıntı, sahte belge veya hayalî tarihsel ilişki üretemez. Tüm öneri gerekçeleri doğrudan arşiv kaydındaki somut alanlardan (kurum, kişi, yer, kategori, dönem, relatedIds) türetilir.

---

## 2. Web Güvenliği ve Savunmalar

1. **XSS Önleme**:
   - `dangerouslySetInnerHTML` kullanımı sıfırdır.
   - Arama terimleri (`q`), etiketler ve kategori isimleri React JSX kaçış kurallarıyla güvenle render edilir.
   - Kötü niyetli `<script>`, `<img>` veya javascript URI girdileri arama filtresinde düz metin olarak katlanır (`foldTurkish`) ve DOM'a kod olarak enjekte edilemez.
2. **Path Traversal ve Slug Güvenliği**:
   - URL parametresi `kayit` katı regex denetiminden geçirilir: `^[a-z0-9-]{1,120}$`.
   - `../`, `/`, `\` gibi dizin geçişi denemeleri doğrudan reddedilerek `undefined` yapılır.
3. **Haricî Bağlantı Güvenliği**:
   - Kurumsal kaynak bağlantıları (`record.source.url`) kullanıcıya sunulurken daima `rel="noopener noreferrer" target="_blank"` öznitelikleriyle güvenli yeni sekmede açılır.
4. **Fail-Closed Qwen LLM Servisi**:
   - Canlı ortamda Qwen servisi bulunmadığı için `isAvailable()` metodu `false` döner ve sistem deterministik baz servise güvenle delege eder. Sahte API mock yanıtları yerine gerçek arşiv kayıtları kullanılır.
