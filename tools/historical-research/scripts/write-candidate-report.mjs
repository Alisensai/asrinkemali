/** KAYNAK-ADAYLARI-RAPORU.md üretici. */
import fs from "node:fs/promises";
import path from "node:path";

const pool = JSON.parse(await fs.readFile("data/research/candidates/pool.json", "utf8")).candidates;

const rows = pool.map((c) => {
  const period = c.periodStart !== null ? `${c.periodStart}–${c.periodEnd ?? ""}` : (c.eventYear ?? "—");
  const flags = [
    c.verification.citationComplete ? "künye ✓" : "künye ✗",
    c.verification.rightsKnown ? "hak ✓" : "hak ✗",
    c.verification.humanReviewed ? "insan ✓" : "insan ✗",
  ].join(" · ");
  const authors = c.authors.length ? c.authors.map((a) => a.name).join(", ") : "yazar belirtilmemiş";
  return `| ${c.id} | ${c.title} | ${authors} | ${c.publishedAt ?? "tarih belirtilmemiş"} | ${c.institution} | ${period} | ${c.state} | ${flags} |`;
});

const report = `# Kaynak Adayları Araştırma Raporu (1881–1918)

**Ajan:** Perplexity — MKA Evidence Engine V0.7
**Tarih:** 2026-10-23
**Hedef dönem:** 1881–1918 (Atatürk'ün çocukluğu, öğrenimi, askerî görevleri ve savaş dönemleri)

## Yöntem

- Öncelikli kurumlar: Atatürk Ansiklopedisi (Atatürk Araştırma Merkezi), ATAM, Devlet Arşivleri Başkanlığı, Millî Kütüphane.
- Her aday 23.10.2026 tarihinde **tek tek okunarak** doğrulandı; başlık, yazar ve yayın tarihi sayfadaki künyeden alındı.
- Hiçbir başlık, URL, künye veya tarih uydurulmadı. Yazarı/tarihi sayfada belirtilmeyen kaynaklar "yazar belirtilmemiş" olarak künye-eksik durumunda bırakıldı.
- Mevcut arşivle (168 kayıt) URL ve kurum arşiv kimliği üzerinden çakışma denetimi yapıldı; çakışan 5 keşif (Manastır Askerî İdadisi, Selanik Askerî Rüştiyesi, Harp Okulu maddesi, Atatürk'ün Selanik'teki Evi, Cumhuriyet'in İlanı) havuza **alınmadı**.
- HTTP erişilebilirliği kaydedildi; ancak erişilebilirlik tarihî doğruluk kanıtı olarak kabul edilmedi.

## Doğrulama Sonuçları

- **Toplam aday:** ${pool.length}
- **Künye tam (yazar + tarih):** ${pool.filter((c) => c.verification.citationComplete).length} aday → durum: insan incelemesi bekliyor
- **Künye eksik (yazar veya yayın tarihi belirtilmemiş):** ${pool.filter((c) => !c.verification.citationComplete).length} aday → durum: bilgi yetersiz
- **Kurum dağılımı:** Atatürk Ansiklopedisi ${pool.filter((c) => c.institution.includes("Atatürk Ansiklopedisi")).length}, ATAM ${pool.filter((c) => c.institution === "Atatürk Araştırma Merkezi (ATAM)").length}, Devlet Arşivleri ${pool.filter((c) => c.institution.includes("Devlet Arşivleri")).length}, Millî Kütüphane ${pool.filter((c) => c.institution.includes("Millî")).length}
- **Kaynak niteliği:** ${pool.filter((c) => c.sourceNature === "primary").length} birincil (Devlet Arşivleri belge derlemesi), ${pool.filter((c) => c.sourceNature === "secondary").length} ikincil
- **Telif/kullanım:** Tümü "yalnızca kurumsal bağlantı" (official_link_only) olarak işaretlendi; hiçbir dosya/PDF/kitap metni indirilip depoya alınmadı. Yeniden kullanım lisansları doğrulanmadığı için adaylar yalnızca künye + bağlantı olarak sunulur.

## Havuz Adayları (kaynak dosya: data/research/candidates/pool.json)

| Kimlik | Başlık | Yazar | Yayın | Kurum | Dönem | Durum | Doğrulama |
|---|---|---|---|---|---|---|---|
${rows.join("\n")}

## İnsan Onayı Bekleyenler (öncelik sırası önerisi)

1. **Öğrenim hattı:** Şemsi Efendi Mektebi (243), Eğitim Kurumları maddesi (875) — 1887–1905 dönemini kapatır.
2. **Aile:** Ali Rıza Efendi (179), Zübeyde Hanım (83), Makbule Atadan (237) — 1841–1956 aralığında dönem kişilerini kurar.
3. **Savaş hattı:** Trablusgarp (407), Balkan (685), Sofya Ataşemiliterliği (388), Birinci Dünya Savaşı'nda Mustafa Kemal (4078), Çanakkale (4084), Sina-Filistin (291), Hicaz (1025) — 1911–1919 dönemini kapatır.
4. **Kişiler:** Enver Paşa (666), Kâzım Karabekir (552), Ali Fuat Cebesoy (171), Fahrettin Altay (444) ve ötekiler.
5. **Birincil belge:** Devlet Arşivleri "Belgelerle Mustafa Kemal Atatürk" PDF'i — künye eksikliği giderilmeli (yayıncı/yıl sayfada belirtilmemiş).
6. **ATAM kitapları:** Kurmay Yüzbaşı Mustafa Kemal (2008), 16ncı Kolordu (2025) — künyeleri tam.

## Sınırlar ve Sonraki Adımlar

- İBB Atatürk Kitaplığı ve TBMM kaynaklarından erken dönem adayı bu turda eklenmedi (mevcut arşivde zaten 18 İBB kaydı var; yeni dijital koleksiyon URL'leri doğrulanamadı).
- Kemalettin Sami Paşa ve Liman von Sanders maddeleri AYK'nın "bilgi" URL formatında olduğundan kurum arşiv kimliği taşıyamadı.
- Eksik künyeli ${pool.filter((c) => !c.verification.citationComplete).length} aday için kurum sayfalarından künye tamamlama araştırması yapılmalı.
- Telif doğrulaması (lisans sayfaları) her aday için insan incelemesinde ayrıca yapılmalı.
`;

await fs.mkdir(path.dirname("docs/research/perplexity/KAYNAK-ADAYLARI-RAPORU.md"), { recursive: true });
await fs.writeFile("docs/research/perplexity/KAYNAK-ADAYLARI-RAPORU.md", report, "utf8");
console.log("rapor yazıldı; aday sayısı:", pool.length);