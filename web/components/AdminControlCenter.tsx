import Link from "next/link";
import type { ArchiveRecord } from "../../schemas/archive-record.types";
import { summarizeArchive } from "@/lib/admin-v08/archive";
import { buildScheduleDryRun, buildTodayAdminBrief, loadEditorialForms } from "@/lib/admin-v08/data";
import { getAllPublications } from "@/lib/publishing/repository";
import { ADMIN_SECTIONS, canAccessSection, type AdminSession } from "@/lib/admin-v08/access-control";
import { MetricCard } from "@/components/admin-v08/MetricCard";
import styles from "@/app/yonetim/admin.module.css";

const MODULES = [
  { section: "archive", href: "/yonetim/arsiv", title: "Arşiv yönetimi", description: "Gerçek katalogda salt okunur arama, filtreleme ve metadata kalite görünümü." },
  { section: "reviews", href: "/yonetim/incelemeler", title: "İnsan incelemeleri", description: "PR #15 formlarının durumu; form beyanları kimlik doğrulanmış onay sayılmaz." },
  { section: "publications", href: "/yonetim/yayinlar", title: "Yayınlar", description: "Mevcut yayın motorunun kayıtları ve durumları; bu ekrandan yayın yapılmaz." },
  { section: "articles", href: "/yonetim/makaleler", title: "Makale stüdyosu", description: "Yayın motoru sözleşmesinin salt okunur makale görünümü." },
  { section: "calendar", href: "/yonetim/takvim", title: "Yayın takvimi", description: "Mevcut yayın sözleşmesiyle yalnız dry-run zamanlama planı." },
  { section: "today", href: "/yonetim/tarihte-bugun", title: "Tarihte Bugün", description: "Codex seçim motorunun katalogdan ürettiği kaynaklı adaylar." },
  { section: "sources", href: "/yonetim/kaynaklar", title: "Kaynak ve telif", description: "Kurum, kaynak bağlantısı ve kullanım hakkı metadata özeti." },
  { section: "users", href: "/yonetim/kullanicilar", title: "Kullanıcılar ve roller", description: "Merkezi rol matrisi; kimlik sağlayıcı olmadan kullanıcı yönetimi kapalı." },
  { section: "audit", href: "/yonetim/denetim", title: "Denetim günlüğü", description: "Olay sözleşmesi hazır; kalıcı repository olmadığı için gerçek günlük yok." },
  { section: "system", href: "/yonetim/sistem", title: "Sistem sağlığı", description: "Bilinen yerel veriler ve yapılandırılmamış entegrasyonları ayrı gösterir." },
] as const;

export function AdminControlCenter({ session, records }: { session: AdminSession; records: readonly ArchiveRecord[] }) {
  const archive = summarizeArchive(records);
  const forms = loadEditorialForms();
  const publications = getAllPublications();
  const schedule = buildScheduleDryRun();
  const today = buildTodayAdminBrief();
  const availableModules = MODULES.filter((module) =>
    ADMIN_SECTIONS.includes(module.section) && canAccessSection(session, module.section),
  );

  return (
    <main>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.kicker}>GENEL BAKIŞ</span>
          <h1>Kontrol Merkezi</h1>
          <p>Operasyonel göstergeler doğrudan katalog, editörlük formları ve mevcut yayın motorundan hesaplanır. Teknik durumlar insan onayı olarak yorumlanmaz.</p>
        </div>
      </header>
      <section className={styles.metricGrid} aria-label="Arşiv ve yayın ölçümleri">
        <MetricCard label="Toplam arşiv kaydı" value={archive.total} detail="İki arşiv dizininden okundu" />
        <MetricCard label="İnsan incelemesi doğrulanmamış" value={archive.humanReviewUnverified} detail="Katalog durumundan uzman onayı çıkarılmaz" />
        <MetricCard label="Kaynağı eksik" value={archive.missingSource} detail="Kurum, başlık veya bağlantı eksik" />
        <MetricCard label="Hak durumu belirsiz" value={archive.rightsUnclear} detail="Bilinmeyen veya izin gerektiren" />
        <MetricCard label="Editörlük formu" value={forms.available ? forms.forms.length : "—"} detail={forms.available ? "Dosyalar salt okunur yüklendi" : "Form dizini bulunamadı"} />
        <MetricCard label="Yayın kaydı" value={publications.length} detail="Yayın motoru repository adapter’ı" />
        <MetricCard label="Zamanlama dry-run" value={schedule.ready.length} detail="Yayımlama işlemi yapılmadı" />
        <MetricCard label="Bugünün aday olayı" value={today.candidates.length} detail="Kaynaklı, gün hassasiyetli kayıtlar" />
      </section>
      <div className={styles.notice} role="note">
        <strong>Güvenlik ve onay sınırı</strong>
        <p>Kimlik sağlayıcısı ve kalıcı yetki/audit altyapısı depoda yok. Admin rotaları erişime kapalıdır. Yayın motoru ve mevcut formlar salt okunur tüketilir; burada onay, düzenleme, zamanlama veya yayın oluşturulmaz.</p>
      </div>
      <section className={styles.moduleGrid} aria-label="Yönetim modülleri">
        {availableModules.map((module) => (
          <article className={styles.moduleCard} key={module.section}>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
            <Link href={module.href}>Modülü görüntüle →</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
