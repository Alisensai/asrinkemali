# MKA Tasarım Sistemi — Bileşen ve Token API Dokümantasyonu (v0.8)

Bu rehber, **ASRIN KEMALİ** platformu genelinde kullanılan tasarım sistemi tokenlarını ve React arayüz primitiflerini belgeler.

---

## 1. CSS Token Mimarisi

Tokenlar `web/styles/mka-tokens.css` içinde tanımlanmıştır ve `web/app/globals.css` üzerinden tüm uygulamaya aktarılır.

### İçe Aktarma
```css
/* İlgili bileşen CSS Modülünde token kullanımı */
.myCard {
  background-color: var(--mka-surface-card);
  border: 1px solid var(--mka-border-gold);
  padding: var(--mka-space-5);
  border-radius: var(--mka-radius-md);
  box-shadow: var(--mka-shadow-md);
}
```

---

## 2. Bileşen Primitifleri (`web/components/design-system/`)

Tüm bileşenler SSR-uyumludur, App Router (RSC) sınırlarında güvenle çalışır ve harici ağır CSS-in-JS veya kütüphane bağımlılığı içermez.

### 2.1. Button (`Button.tsx`)
Erişilebilir buton veya bağlantı eylemi.

```tsx
import { Button } from "@/components/design-system";

// Standart birincil buton
<Button variant="primary" size="md" onClick={handleClick}>
  Koleksiyonu İncele
</Button>

// Next.js Link olarak davranan altın konturlu buton
<Button variant="secondary" size="md" href="/arsiv">
  Arşive Git
</Button>

// Yüklenme durumu
<Button variant="primary" size="md" isLoading>
  İşleniyor
</Button>
```

| Prop | Tip | Varsayılan | Açıklama |
|:---|:---|:---|:---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'outline'` | `'primary'` | Butonun görsel stili |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Boyut (min 44px mobil touch) |
| `fullWidth` | `boolean` | `false` | Genişliği %100 yapar |
| `isLoading` | `boolean` | `false` | Dönen animasyon ve `aria-busy` ekler |
| `disabled` | `boolean` | `false` | Butonu devre dışı bırakır |
| `href` | `string` | `undefined` | Varsa `<Link>` veya `<a>` render eder |
| `external` | `boolean` | `false` | Dış bağlantı için `target="_blank"` açar |

---

### 2.2. TextLink (`TextLink.tsx`)
Güvenli iç veya dış metin bağlantısı. `javascript:` veya zararlı URL şemalarını engeller.

```tsx
import { TextLink } from "@/components/design-system";

// İç bağlantı (Next.js Link)
<TextLink href="/kronoloji">Yaşam Çizelgesi</TextLink>

// Dış kurumsal kaynak (otomatik rel="noopener noreferrer" ve dış ikon)
<TextLink href="https://www.tbmm.gov.tr" showExternalIcon>
  TBMM Arşiv Kaynağı
</TextLink>
```

---

### 2.3. Badge (`Badge.tsx`)
Dürüst editoryal ve teknik durum rozetleri.

```tsx
import { Badge, getArchivalVerificationBadge } from "@/components/design-system";

// Otomatik dürüst durum etiketi
const badgeInfo = getArchivalVerificationBadge(record.verification.status);
<Badge variant={badgeInfo.variant}>{badgeInfo.text}</Badge>

// Temsili yapay zekâ görseli etiketi
<Badge variant="ai">Temsili Canlandırma (AI)</Badge>
```

| Varyant | Görsel Renk | Editoryal Anlamı |
|:---|:---|:---|
| `published` | Altın açık zemin, altın çerçeve | Kaynak denetimli · uzman onayı bekliyor |
| `reviewed` | Mavi zemin, mavi çerçeve | Teknik ön inceleme yapıldı |
| `unverified` | Sarı/kehribar zemin | Doğrulanmamış bildirim / taslak |
| `ai` | Bordo zemin, kesikli altın çerçeve | Yapay zekâ temsili canlandırma |
| `type` | Koyu bordo zemin | Kayıt türü (belge, fotoğraf vb.) |

---

### 2.4. MuseumPlaque (`MuseumPlaque.tsx`)
Yerel görseli olmayan veya uzaktan bağlantılı kayıtlar için tipografik künye plaketi.

```tsx
import { MuseumPlaque } from "@/components/design-system";

<MuseumPlaque
  id="DOC-1919-05-19"
  title="Samsun Genelgesi"
  category="Tarihî Belge"
  institution="TBMM Arşivi"
  date="19 Mayıs 1919"
  rights="Kamu Malı"
  sourceUrl="https://www.tbmm.gov.tr"
/>
```

---

### 2.5. StatusNote (`StatusNote.tsx`)
Editoryal disclaimers, arşiv uyarıları ve şeffaflık açıklamaları.

```tsx
import { StatusNote } from "@/components/design-system";

<StatusNote variant="ai" title="Temsili Görsel Uyarısı">
  Bu görsel Atatürk&apos;ün tarihî fotoğrafı olmayıp, arşiv kayıtları ışığında yapay zekâ ile üretilmiş temsili bir canlandırmadır.
</StatusNote>
```

---

### 2.6. FormField, Input & Select (`FormField.tsx`)
Tam erişilebilir form alanları; etiket, yardım metni ve hata mesajlarını ekran okuyuculara otomatik bağlar (`aria-describedby`, `aria-invalid`).

```tsx
import { FormField, Input, Select } from "@/components/design-system";

<FormField
  id="archive-query"
  label="Belge Adı veya Yıl"
  required
  helpText="Aramak istediğiniz terimi yazınız."
  errorText={hasError ? "Arama terimi geçersiz." : undefined}
>
  <Input placeholder="Örn: 1923 Cumhuriyet" hasError={hasError} />
</FormField>
```

---

### 2.7. Breadcrumb (`Breadcrumb.tsx`)
Gezinme ekmek kırıntısı; aktif sayfayı `aria-current="page"` ile bildirir.

```tsx
import { Breadcrumb } from "@/components/design-system";

<Breadcrumb
  items={[
    { label: "Ana Sayfa", href: "/" },
    { label: "Dijital Arşiv", href: "/arsiv" },
    { label: "Belge Detayı" },
  ]}
/>
```

---

### 2.8. EmptyState (`EmptyState.tsx`)
Kayıt bulunamadığında kurgusal içerik üretmeyen, dürüst ve eyleme yönlendiren boş durum bileşeni.

```tsx
import { EmptyState } from "@/components/design-system";

<EmptyState
  title="Eşleşen Kayıt Bulunamadı"
  description="Filtre kriterlerinize uygun yayımlanabilir kamu kaydı bulunmuyor."
  actionLabel="Filtreleri Temizle"
  actionHref="/arsiv"
/>
```
