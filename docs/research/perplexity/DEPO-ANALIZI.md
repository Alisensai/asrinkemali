# Depo Analizi — MKA Evidence Engine V0.7 Öncesi

**Dal:** `feature/perplexity-v07-evidence-engine` (temel: `feature/opencode-v06-archive-expansion`, SHA `334a8d8`)
**Analiz tarihi:** 2026-10-23

## Genel Yapı

- Kök dizin: statik tanıtım sitesi (`index.html`, `app.js`, `styles.css`) + Next.js 16 web uygulaması (`web/`).
- `schemas/archive-record.types.ts`: arşiv kayıt sözleşmesi **v1.1.0**. Alanlar: `id`, `slug`, `title`, `type` (photograph/document/speech/event/publication/place), `date`, `people`, `locations`, `categories`, `summary`, `description`, `source` (kurum, URL, künye, arşiv kimliği, erişim tarihi), `provenance`, `rights`, `image`, `holding`, `verification` (`published`/`reviewed`/`draft`), `tags`, `relatedIds`.
- `content/archive/records/`: 18 klasik eski kayıt (AYK/ATAM/İBB/MK/TBMM kaynağı).
- `data/archive/catalog/`: 150 OpenCode dönem kaydı (AAM, ATAM, İBB, MK, TBMM, küçük kurumlar).
- **Toplam: 168 kayıt.** (151 published, 16 reviewed, 1 draft.)
- `scripts/archive/lib/`: OpenCode'un doğrulama çekirdeği (`load.mjs`, `validate.mjs`, `search.mjs`, `security.mjs`, `json-schema.mjs`). Bu modül Evidence Engine tarafından **yeniden kullanılır**; yeniden yazılmaz.
- `web/lib/archive.ts`: yayın kapılı arşiv okuyucusu; yalnız `published` kayıtları listeler.
- `docs/archive/README.md` ve `KAYNAK-ENVANTERI.md`: arşiv kuralları ve 35.852 künyelik kaynak envanteri.

## Açık PR'lar

| PR | Başlık | Durum | Temel dal |
|---|---|---|---|
| #14 | OpenCode: 150 Yeni Arşiv Kaydı (v0.6) | Açık | integration/asrinkemali-v05-release-candidate |
| #15 | Copilot: Kalite ve Editörlük Araçları | Açık | feature/copilot-v06-quality |
| #17 | Claude: Atatürk Yaşam Deneyimi | Açık | integration/asrinkemali-v05-release-candidate |

PR #14 notunda *"Arşivde 1881-1918 arası kaynak kaydı yok"* tespiti yer alıyor — bu eksiklik Evidence Engine'in ana gerekçesidir.

## Arşiv Boşluğu (özet)

168 kayıt arasında **1881–1918 dönemine düşen kayıt-yıl sayısı: 4 (%2,4)**. Boş aralıklar: 1881–1882, 1884–1907, 1909–1911, 1913–1917. Yalnızca 1883, 1908, 1912 ve 1918 yıllarına kayıt değiyor. Ayrıntı: `BOSLUK-RAPORU-2026-10-23.md`.

## Evidence Engine'in Konumu

- `tools/historical-research/`: bağımsız araştırma/keşif yazılımı (ESM, Node ≥ 20, bağımlılıksız).
- `data/research/candidates/`: aday havuzu (YAYINLANMAMIŞ; insan onayı bekler).
- `web/app/arastirma-laboratuvari/`: dev-özel panel (bayrak: `MKA_RESEARCH_LAB=1`).
- Diğer ajanların dosyaları (ana sayfa, yayın motoru, global CSS, arşiv sayfası) **değiştirilmedi**.

## Uyulması gereken kurallar (AGENTS.md'den)

- `main` dalına doğrudan işlem yok; her çalışma kendi dalında.
- `data/archive/catalog/` ve `content/archive/records/` değişiklikleri doğrudan yapılmaz; derinlemesine inceleme etiketli yeni dosyalarla çalışılır.
- Benzerlik > %80 olan site çiftleri bağımsız kanıt sayılmaz.
- AI değerlendirmesi tamamlanmamış kayıt `published` yapılamaz.
