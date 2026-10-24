# MKA Onaylı Tasarım Referans ve Token Eşleme Haritası (Reference Map)

Bu doküman, `design/ONAYLANAN-TASARIM.webp` (1536×1024) ana tasarım referansının piksel, renk, tipografi ve geometrik ritmini inceleyerek **MKA Tasarım Sistemi (v0.8)** token ve primitiflerine eşler.

---

## 1. Genel Bölge ve Kompozisyon Envanteri (1536×1024)

| Bölge No | Referans Bölgesi | Referans Konumu (X, Y, W, H) | CSS Seçicisi / Modülü | Atanan MKA Tokenı / Bileşeni | Kontrast & A11y Durumu | Sahip Prompt |
|:---|:---|:---|:---|:---|:---|:---|
| **R01** | Üst Bilgilendirme (Utility Bar) | Y: 0px, H: ~36px, W: 100% | `.utilityBar`, `UtilityBar.tsx` | `--mka-color-black`, `--mka-color-muted`, `--mka-text-xs` | 7.8:1 (Metin / Siyah), AA Geçer | Prompt 17 |
| **R02** | Masthead & MKA Arması | Y: 36px, H: ~140px, W: 100% | `.masthead`, `Masthead.tsx` | `--mka-color-red-masthead`, `--mka-color-gold-bright` | Arma: 140px/80px responsive | Prompt 17 |
| **R03** | Yatay Navigasyon Menüsü | Y: 176px, H: ~56px, W: 100% | `.navigation`, `Navigation.tsx` | `--mka-color-red-nav`, `--mka-border-gold`, `--mka-font-sans` | Focus ring: 2px solid gold-bright | Prompt 17 |
| **R04** | Birincil Atatürk Hero Alanı | Y: 232px, H: ~580px, W: 1366px | `.hero`, `Hero.tsx` | `--mka-color-red-deep`, `--mka-font-display`, `--mka-text-4xl` | AI Temsili uyarısı görünür | Prompt 17 |
| **R05** | Hızlı Erişim / Kaynak Kartları | Y: 820px, H: ~280px, W: 1366px | `.shortcutGrid`, `ShortcutGrid.tsx` | `--mka-surface-card`, `--mka-border-gold`, `Surface` | Kart hover yükselme ve glow | Prompt 18 |
| **R06** | Dijital Yayınlar Bölümü | Sayfa gövdesi | `.publications`, `Publications.tsx` | `--mka-color-night`, `Button`, `Badge` | Tipografik kitap ve makale künyesi | Prompt 27 |
| **R07** | Tarihte Bugün Bandı | Sayfa alt-orta bandı | `Chronology.tsx`, `HistoryToday.tsx` | `--mka-surface-elevated`, `--mka-color-gold`, `Badge` | Yalnızca takvim günü eşleşmesi | Prompt 27 |
| **R08** | Müze Plaketi ve Medyasız Künye | Arşiv & Koleksiyon detay | `MuseumPlaque.tsx` | `--mka-surface-plaque`, `--mka-border-gold`, `MuseumPlaque` | Sahte görsel yok, tipografik sunum | Prompt 16 / 18 |
| **R09** | Form ve Arama Kontrolleri | Arşiv ve arama diyalogu | `SearchDialog.tsx`, `FormField.tsx` | `--mka-surface-page`, `FormField`, `Input`, `Select` | 44px min-touch, label ilişkili | Prompt 16 / 18 |
| **R10** | Alt Bilgi (Site Footer) | Sayfa altı | `.site-footer`, `Footer.tsx` | `--mka-color-black`, `--mka-color-dim`, `TextLink` | Bağımsızlık ve AI disclaimeri | Prompt 17 |

---

## 2. Renk ve Kontrast Cetveli

| Token Adı | Hex / RGBA Değeri | Referanstaki Görsel Rolü | Arka Plan Zemin | Ölçülen Kontrast | WCAG 2.2 Uyumu |
|:---|:---|:---|:---|:---|:---|
| `--mka-color-black` | `#080606` | En derin zemin, utility bar ve footer | - | - | - |
| `--mka-color-night` | `#100a0b` | Genel sayfa arka planı | - | - | - |
| `--mka-color-red-masthead` | `#36090c` | Bordo masthead alanı | `#080606` | - | - |
| `--mka-color-red-nav` | `#280608` | Ana menü barı zemini | - | - | - |
| `--mka-color-red-card` | `#6e1116` | Birincil kartlar ve buton zemini | `#100a0b` | - | - |
| `--mka-color-white` | `#ffffff` | Başlıklar ve birincil metin | `#100a0b` / `#36090c` | > 14:1 | AAA Geçer |
| `--mka-color-sand` | `#e1d3c5` | İkincil gövde metni | `#100a0b` | 10.8:1 | AAA Geçer |
| `--mka-color-muted` | `#bdaaa0` | Yardımcı künye ve tarih metinleri | `#100a0b` | 7.1:1 | AA Geçer |
| `--mka-color-gold` | `#d1a36d` | Altın bordürler, dekoratif hatlar | `#100a0b` / `#36090c` | 6.8:1 | AA (Grafik/Gövde) |
| `--mka-color-gold-bright` | `#e7bf8c` | Odak halkası (focus ring), aktif menü | `#280608` / `#100a0b` | 9.4:1 | AAA (Büyük/Gövde) |

---

## 3. Tipografi Skalası

| Token | Font Ailesi | Boyut (CSS) | Satır Yüksekliği | Referans Kullanım Yeri |
|:---|:---|:---|:---|:---|
| `--mka-text-4xl` | Cinzel / Display | `clamp(2.25rem, 3vw + 1rem, 3.25rem)` | 1.15 | Hero Ana Atatürk Başlığı |
| `--mka-text-3xl` | Cinzel / Display | `clamp(1.75rem, 2vw + 1rem, 2.25rem)` | 1.2 | Masthead "ASRIN KEMALİ" Logosu |
| `--mka-text-2xl` | Playfair Display / Title | `1.5rem` (24px) | 1.35 | Bölüm Başlıkları (ARŞİVİ KEŞFEDİN vb.) |
| `--mka-text-xl` | Playfair Display / Title | `1.25rem` (20px) | 1.35 | Kart Başlıkları ve Plaket İsimleri |
| `--mka-text-base` | Cormorant Garamond / Body | `1rem` (16px) | 1.5 | Gövde Metinleri, Anlatı Paragrafları |
| `--mka-text-sm` | Montserrat / Sans | `0.8125rem` (13px) | 1.4 | Navigasyon Menüsü, Butonlar |
| `--mka-text-xs` | Montserrat / Sans | `0.75rem` (12px) | 1.2 | Rozetler (Badge), Utility Bar, Künyeler |

---

## 4. Spacing ve Ritim Skalası (4/8 Tabanlı)

- `--mka-space-1`: `4px` — Mikro aralıklar, ikon-metin mesafesi
- `--mka-space-2`: `8px` — Rozet içi dikey boşluk, buton içi ikon mesafesi
- `--mka-space-3`: `12px` — Küçük kart içi padding, breadcrumb boşlukları
- `--mka-space-4`: `16px` — Standart form elemanı boşluğu, grid aralığı (mobil)
- `--mka-space-5`: `20px` — Normal kart padding
- `--mka-space-6`: `24px` — Bölüm alt başlık aralığı, grid gap (tablet)
- `--mka-space-8`: `32px` — Büyük kart padding, ana bölüm aralıkları
- `--mka-space-10`: `40px` — Hero ve masthead dikey nefes alma alanı
- `--mka-space-12`: `48px` — Masaüstü bölüm dikey padding
- `--mka-space-16`: `64px` — Büyük masaüstü boşlukları

---

## 5. Doğruluk ve Editoryal İlke Sözleşmesi
1. **İnsan Onayı Ayrımı:** Teknik `published` statüsü, insan uzmanı / editoryal onay anlamına gelmez. Rozet ve plaketler editoryal onay uydurmayacak; "Kaynak denetimli · uzman onayı bekliyor" dürüstlüğünü koruyacaktır.
2. **AI Temsil Şeffaflığı:** Yapay zekâ ile üretilmiş canlandırmalar için görsel disclaimeri (`Temsili canlandırma`) daima görünür kalacaktır.
3. **Medyasız Kayıtlar:** Görseli bulunmayan veya uzaktan bağlantılı kayıtlar için `MuseumPlaque` tipografik künyesi kullanılır; sahte arşiv görseli üretilmez.
