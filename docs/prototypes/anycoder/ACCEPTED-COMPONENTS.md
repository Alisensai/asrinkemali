# GÖREV 25 — KABUL EDİLEN BİLEŞENLER VE DEVİR BİLDİRİMİ (HANDOFF)

**Ajan:** ANTIGRAVITY  
**Tarih:** 24 Ekim 2026  
**Hedef Devir:** Prompt 26 (MKA-ANTIGRAVITY-26 — MKA Immersive Museum Hardening)  

---

## 1. KABUL VE AKTARIM DURUMU

1. **AnyCoder Kaynak Kodu:**
   - Durum: **`SOURCE_MISSING`**
   - Sonuç: Hiçbir doğrulanmamış üçüncü taraf kaynak kodu projeye aktarılmamıştır.
   - Projenin `main` veya mevcut sergi mimarisine (`web/app/sergiler`, `web/lib/exhibitions`) dokunulmamış; gereksiz dosya kopyalanmamıştır.

2. **Deneysel Denetim Arayüzü:**
   - Konum: `web/components/exhibitions/experiment/`
   - Amaç: AnyCoder denetim bulgularını ve PR #27 yetenek matrisini izole bir alanda sergileyen, sıfır taşmalı ve tam erişilebilir deneysel inceleme bileşeni.

---

## 2. PROMPT 26 İÇİN SERGİ MOTORU DEVİR NOTLARI

Aşağıdaki kritik bulgular Prompt 26 yürütücüsüne devredilmiştir:

1. **Staging Yayına Sızma Riski (`web/lib/exhibitions/repository.ts`):**
   - PR #27'de `getAllExhibitions` ve `getExhibitionBySlug` fonksiyonları üretim ortamında yayınlanmamış staging sergilerini döndürebilmektedir. Bu kapı Prompt 26'da sertleştirilmelidir (`workflow.ts` kontrolü ile).
2. **Yanıltıcı İnceleme Rozetleri (`web/components/exhibitions/SourceInspector.tsx`):**
   - Kaynak çekmecesinde yer alan "BİRİNCİL TARİHÎ KAYNAK" ve "DOĞRULANMIŞ KAYNAK" etiketleri, gerçekte bağımsız insan tarihçi onayı bulunmadığı için kullanıcıyı yanıltmaktadır. Bu etiketler Prompt 26'da "Katalog Kaydı" veya "Arşiv Kaynağı" şeklinde revize edilmelidir.
3. **Sıfır Yatay Taşma:**
   - Tüm yeni sergi görünümleri 320px–1536px arasında sıfır yatay taşma güvencesini korumalıdır.
