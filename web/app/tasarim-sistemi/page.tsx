import type { Metadata } from "next";
import {
  Button,
  TextLink,
  Badge,
  StatusNote,
  MuseumPlaque,
  Surface,
  Divider,
  FormField,
  Input,
  Select,
  Breadcrumb,
  EmptyState,
} from "@/components/design-system";
import styles from "./catalog.module.css";

export const metadata: Metadata = {
  title: "Tasarım Sistemi Kataloğu ve Test Armatürü",
  description: "MKA v0.8 erişilebilir tasarım sistemi bileşen kataloğu ve görsel regresyon armatürü.",
  robots: { index: false, follow: false },
};

export default function DesignSystemCatalogPage() {
  return (
    <main className={styles.catalogPage}>
      <div className="container">
        <Breadcrumb
          items={[
            { label: "Ana Sayfa", href: "/" },
            { label: "Geliştirici", href: "#" },
            { label: "Tasarım Sistemi Kataloğu" },
          ]}
        />

        <header className={styles.catalogHeader}>
          <div className="eyebrow">MKA V0.8 TASARIM SİSTEMİ</div>
          <h1 className={styles.catalogTitle}>Bileşen Sözlüğü ve Token Kataloğu</h1>
          <p className={styles.catalogLead}>
            <code>design/ONAYLANAN-TASARIM.webp</code> referansına dayalı erişilebilir, WCAG 2.2 AA uyumlu,
            3 katmanlı CSS token mimarisi ve UI primitifleri.
          </p>
        </header>

        <Divider ornamental />

        {/* 1. BUTTONS */}
        <section className={styles.section} aria-labelledby="sec-buttons">
          <h2 id="sec-buttons" className={styles.sectionTitle}>1. Butonlar ve Eylemler (Button)</h2>
          <div className={styles.demoRow}>
            <Button variant="primary" size="md">Birincil Bordo Buton</Button>
            <Button variant="secondary" size="md">İkincil Altın Kontur</Button>
            <Button variant="outline" size="md">Koyu Çerçeveli</Button>
            <Button variant="ghost" size="md">Hayalet Buton</Button>
            <Button variant="primary" size="md" disabled>Devre Dışı</Button>
            <Button variant="secondary" size="md" isLoading>Yükleniyor</Button>
          </div>
          <div className={styles.demoRow} style={{ marginTop: "12px" }}>
            <Button variant="primary" size="sm">Küçük (36px)</Button>
            <Button variant="primary" size="md">Normal (44px)</Button>
            <Button variant="primary" size="lg">Büyük (52px)</Button>
          </div>
        </section>

        <Divider />

        {/* 2. TEXT LINKS */}
        <section className={styles.section} aria-labelledby="sec-links">
          <h2 id="sec-links" className={styles.sectionTitle}>2. Metin Bağlantıları (TextLink)</h2>
          <div className={styles.demoRow}>
            <TextLink href="/arsiv">İç Arşiv Bağlantısı</TextLink>
            <TextLink href="https://www.tbmm.gov.tr" showExternalIcon>Dış Kurumsal Kaynak</TextLink>
            <TextLink href="/kronoloji" quiet>Sessiz Bağlantı</TextLink>
            <TextLink href="javascript:alert(1)">Engellenen JS Bağlantısı</TextLink>
          </div>
        </section>

        <Divider />

        {/* 3. BADGES */}
        <section className={styles.section} aria-labelledby="sec-badges">
          <h2 id="sec-badges" className={styles.sectionTitle}>3. Durum ve Tür Rozetleri (Badge)</h2>
          <div className={styles.demoRow}>
            <Badge variant="published">Kaynak Denetimli · Uzman Onayı Bekliyor</Badge>
            <Badge variant="reviewed">Teknik İnceleme Yapıldı</Badge>
            <Badge variant="unverified">Doğrulanmamış Bildirim</Badge>
            <Badge variant="ai">Temsili Canlandırma (AI)</Badge>
            <Badge variant="type">Belge</Badge>
            <Badge variant="neutral">Kategori: Askerî</Badge>
          </div>
        </section>

        <Divider />

        {/* 4. STATUS NOTES */}
        <section className={styles.section} aria-labelledby="sec-status-notes">
          <h2 id="sec-status-notes" className={styles.sectionTitle}>4. Editoryal Durum Notları (StatusNote)</h2>
          <StatusNote
            variant="info"
            title="Katalog Bilgilendirmesi"
          >
            Arşiv kayıtlarımız kurumsal kütüphane ve resmî envanter kaynaklarına dayanır.
          </StatusNote>

          <StatusNote
            variant="warning"
            title="Hak ve Provenans Uyarısı"
          >
            Telif hakları kısıtlı olan materyaller yalnızca kaynak kurum bağlantısıyla sunulur, yerel dosya barındırılmaz.
          </StatusNote>

          <StatusNote
            variant="ai"
            title="Görsel Temsil Bildirimi"
          >
            Bu alandaki kompozisyon yapay zekâ destekli tarihî canlandırma olup arşiv belgesi niteliği taşımaz.
          </StatusNote>
        </section>

        <Divider />

        {/* 5. MUSEUM PLAQUE */}
        <section className={styles.section} aria-labelledby="sec-plaque">
          <h2 id="sec-plaque" className={styles.sectionTitle}>5. Müze Plaketi (MuseumPlaque)</h2>
          <p className={styles.catalogLead}>
            Medyası olmayan veya uzaktan bağlantılı kayıtlar için sahte görsel üretmeyen tipografik sunum:
          </p>
          <div style={{ maxWidth: "700px" }}>
            <MuseumPlaque
              id="DOC-1919-05-19"
              title="Samsun&apos;a Çıkış ve Heyet-i Temsiliye İlk Genelgesi"
              category="Tarihî Belge"
              institution="Türkiye Büyük Millet Meclisi Arşivi"
              date="19 Mayıs 1919"
              rights="Kamu Malı (Public Domain)"
              sourceUrl="https://www.tbmm.gov.tr"
            />
          </div>
        </section>

        <Divider />

        {/* 6. SURFACES & ELEVATION */}
        <section className={styles.section} aria-labelledby="sec-surface">
          <h2 id="sec-surface" className={styles.sectionTitle}>6. Yüzeyler ve Katmanlar (Surface)</h2>
          <div className={styles.grid2}>
            <Surface elevation={1} className={styles.demoSurface}>
              <h3>Yüzey Seviye 1 (Elevated)</h3>
              <p>Hafif yükseltilmiş arka plan panelleri için kullanılır.</p>
            </Surface>
            <Surface elevation={2} goldBorder withGlow className={styles.demoSurface}>
              <h3>Yüzey Seviye 2 (Card + Glow)</h3>
              <p>Etkileşimli içerik ve koleksiyon kartları için kullanılır.</p>
            </Surface>
          </div>
        </section>

        <Divider />

        {/* 7. FORM FIELDS */}
        <section className={styles.section} aria-labelledby="sec-forms">
          <h2 id="sec-forms" className={styles.sectionTitle}>7. Form Kontrolleri (FormField, Input, Select)</h2>
          <div style={{ maxWidth: "500px" }}>
            <FormField id="search-query" label="Katalog Arama Terimi" required helpText="En az 3 karakter giriniz.">
              <Input type="text" placeholder="Örn: Sivas Kongresi" />
            </FormField>

            <FormField id="record-category" label="Arşiv Kategorisi">
              <Select defaultValue="">
                <option value="">Tüm Kategoriler</option>
                <option value="diplomasi">Diplomasi</option>
                <option value="askeri">Askerî Tarih</option>
                <option value="kultur">Kültür ve Sanat</option>
              </Select>
            </FormField>

            <FormField id="invalid-field" label="Geçersiz Alan Örneği" errorText="Bu alan zorunludur ve boş bırakılamaz.">
              <Input type="text" hasError defaultValue="" />
            </FormField>
          </div>
        </section>

        <Divider />

        {/* 8. EMPTY STATE */}
        <section className={styles.section} aria-labelledby="sec-empty">
          <h2 id="sec-empty" className={styles.sectionTitle}>8. Boş Durum (EmptyState)</h2>
          <EmptyState
            icon="document"
            title="Eşleşen Arşiv Kaydı Bulunamadı"
            description="Arama kriterlerinize uygun doğrulanmış kamu kaydı bulunmuyor. Lütfen tarih veya kategori filtrelerini genişletin."
            actionLabel="Filtreleri Sıfırla"
            actionHref="/arsiv"
          />
        </section>
      </div>
    </main>
  );
}
