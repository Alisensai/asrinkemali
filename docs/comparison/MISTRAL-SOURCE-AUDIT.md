# MISTRAL BELGE KARŞILAŞTIRMA TESLİMİ DENETİM RAPORU (TASK 23)

**Tarih:** 24 Ekim 2026  
**Denetleyen Ajan:** ANTIGRAVITY  
**İncelenen Kaynak:** `mistralal.txt` (SHA256: `ae33531c0cc35e15c2eb5168370b60f90e042f672de0918000455cd5acbfce4a`, 9.833 B)  
**Çalışma Dalı:** `feature/antigravity-v08-source-document-comparison`  
**Taban Ref:** `feature/antigravity-v08-atlas-2-integration` (commit `fe3284b`, PR #44)  

---

## 1. KAYNAK METİN VE GİT DOĞRULAMASI

Kullanıcı tarafından sunulan `mistralal.txt` dosyasında şu iddialar yer almaktadır:
- Commit SHA: `1640fea`
- Dal: `feature/mistral-v07-document-comparison`
- Dosya sayısı: 26 yeni dosya, 5.005+ satır ekleme
- Testler: 15+ birim test senaryosu, 25+ E2E test senaryosu

### Fiilî Git Durumu Tespiti:
- `git show 1640fea` komutu çalıştırılmış ve `fatal: ambiguous argument '1640fea': unknown revision` hatası alınmıştır. Repo geçmişinde böyle bir commit bulunmamaktadır.
- `git branch -a` çıktısında `feature/mistral-v07-document-comparison` veya uzaktaki eşdeğeri mevcut değildir.
- İlgili dosya ve bileşenler repoda bulunmamaktadır; teslim metni bir kod paketi değil, yalnızca taslak rapordur.

**Sonuç:** Mistral teslimi doğrudan birleştirilemez; çalışan gerçek Next.js 16/React 19 bileşenleri, modelleri ve testleri V0.6 sözleşmelerine göre sıfırdan geliştirilmelidir.

---

## 2. ŞEMA VE VERİ MODELİ FARKLILIKLARI (SCHEMA DELTA)

Mistral raporundaki model ile projenin anayasası olan `schemas/archive-record.types.ts` ve `web/lib/archive.ts` arasında köklü uyumsuzluklar tespit edilmiştir:

| Mistral Raporu İddiası | Gerçek V0.6 Şeması | Durum ve Karar |
| :--- | :--- | :--- |
| `demoRecords` (10 adet sabit mock kayıt) | `getPublishedArchiveRecords()` (151 yayımlanmış gerçek kayıt) | **REDDEDİLDİ.** Canlı katalog tüketilecek. |
| `DocumentType`: manuscript, telegram, diary, legal_document... | `ArchiveRecordType`: `photograph`, `document`, `speech`, `event`, `publication`, `place` | **REDDEDİLDİ.** Yalnızca geçerli 6 tip desteklenecektir. |
| `VerificationStatus`: verified, pending_review, disputed... | `ArchiveRecordVerification.status`: `draft`, `reviewed`, `published` | **REDDEDİLDİ.** Şema dışı doğrulama etiketleri yasaktır. |
| `UsageRights`: public_domain, creative_commons_by... | `ArchiveRecordRights.status`: `official_link_only`, `fair_use_educational`, `cc_by_nc_nd_4`, `public_domain_historical`, `rights_holder_permission`, `unknown` | **UYUŞTURULDU.** Gerçek hak alanları okunacaktır. |
| `sensitivityLevel: 'public'` | Şemada böyle bir alan yoktur | **REDDEDİLDİ.** Uydurma alan eklenmeyecektir. |
| `physicalStatus: 'missing'` | Şemada böyle bir alan yoktur | **REDDEDİLDİ.** Uydurma alan eklenmeyecektir. |
| `SourceType`: archive, library, museum... | `source.institution` ve `source.title` serbest metin alanlarıdır | **UYUŞTURULDU.** Doğrudan kurum metni okunacaktır. |

---

## 3. TARİHSEL VE ETİK GÜVENLİK SINIRLARI

1. **Önem ve Güvenilirlik Sıralaması Yoktur:**
   - İki belge karşılaştırılırken "Hangisi daha güvenilirdir?" veya "A belgesi B belgesini doğrular" gibi sübjektif tarihî yargılar üretilmez.
   - Yalnızca nesnel alanlar (tarih, tür, kurum, künye, haklar, ortak kişiler, ortak mekânlar) yan yana sergilenir.
2. **Yayın Güvenliği Kapısı (Visibility Gate):**
   - Karşılaştırmaya yalnızca `status === 'published'` olan kayıtlar dahil edilebilir.
   - `published` statüsü teknik katalog durumudur; hiçbir zaman "insan tarihçi uzman onayladı" şeklinde sunulmaz.
3. **URL Parametreleri ve Güvenlik:**
   - URL `/karsilastir?a=<slug>&b=<slug>` şeklinde yalnız güvenli slug'ları kabul eder.
   - Aynı kaydın iki panelde seçilmesi engellenir (`a !== b`).
   - Geçersiz slug durumunda açık ve güvenli boş durum/uyarı gösterilir.
4. **Bağlantı ve Medya Güvenliği:**
   - Orijinal kaynak linkleri `target="_blank" rel="noopener noreferrer external"` ile doğrudan resmi kuruma yönlendirir.
   - İzin verilmeyen dış belgelerin (PDF vb.) kopyalanması veya gömülmesi engellenir.

---

## 4. GÖRSEL VE ERİŞİLEBİLİRLİK MİMARİSİ

1. **CSS Modules & Tasarım Tokenları:**
   - Mistral'in global Tailwind konfigürasyonu yerine MKA Tasarım Sistemi CSS tokenları (`--gold`, `--black`, `--red-masthead`, `--cream`) ve izole `comparison.module.css` kullanılır.
2. **Responsive Tasarım:**
   - Masaüstünde (>= 1024px) yan yana iki sütunlu karşılaştırma.
   - Mobil ve tablette (<= 780px) katmanlı / sekmeli erişilebilir düzen.
   - 320px–1536px arası tüm boyutlarda sıfır yatay taşma (`scrollWidth <= innerWidth + 1`).
3. **Erişilebilirlik:**
   - Klavye Tab/Shift+Tab dolaşımı.
   - Belge seçim modalı için `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Esc ile kapanma ve odak iadesi.
   - Dokunmatik butonlar minimum 44×44px.
