import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAdminSession, canAccessSection } from "@/lib/admin-v08/auth";
import { findArchiveRecord, loadEditorialForm } from "@/lib/admin-v08/data";
import { getArchiveQualityFlags, safeHttpsUrl } from "@/lib/admin-v08/archive";
import styles from "@/app/yonetim/admin.module.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminArchiveDetail({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getCurrentAdminSession();
  if (!session || !canAccessSection(session, "archive")) return null;
  const { slug } = await params;
  const record = findArchiveRecord(slug);
  if (!record) notFound();
  const form = loadEditorialForm(record.id);
  const flags = getArchiveQualityFlags(record);
  const sourceUrl = safeHttpsUrl(record.source.url);
  return (
    <main>
      <header className={styles.pageHeader}><div><span className={styles.kicker}>ARŞİV KAYDI · SALT OKUNUR</span><h1>{record.title}</h1><p>{record.summary}</p></div></header>
      <p><Link className={styles.textLink} href="/yonetim/arsiv">← Arşiv envanterine dön</Link></p>
      <div className={styles.twoColumn}>
        <section className={styles.panel}><h2>Kayıt bilgileri</h2><dl>
          <dt>Kayıt kimliği</dt><dd>{record.id}</dd><dt>Tür</dt><dd>{record.type}</dd>
          <dt>Tarih</dt><dd>{record.date.display} · {record.date.precision} · {record.date.certainty}</dd>
          <dt>Teknik doğrulama durumu</dt><dd>{record.verification.status} (insan onayı değildir)</dd>
          <dt>Kategoriler</dt><dd>{record.categories.join(", ") || "Yok"}</dd>
          <dt>İlgili kişiler</dt><dd>{record.people.map((person) => person.name).join(", ") || "Yok"}</dd>
          <dt>İlgili yerler</dt><dd>{record.locations.map((location) => [location.name, location.city].filter(Boolean).join(", ")).join("; ") || "Yok"}</dd>
        </dl></section>
        <section className={styles.panel}><h2>Kaynak ve kullanım</h2><dl>
          <dt>Kurum</dt><dd>{record.source.institution}</dd>
          <dt>Kaynak</dt><dd>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{record.source.title}</a> : "Güvenli HTTPS kaynak bağlantısı yok"}</dd>
          <dt>Künye</dt><dd>{record.source.citation || "Belirtilmemiş"}</dd>
          <dt>Erişim tarihi</dt><dd>{record.source.accessedAt}</dd>
          <dt>Hak durumu</dt><dd>{record.rights.status}</dd>
          <dt>Lisans / şartlar</dt><dd>{record.rights.license || record.rights.note || "Belirtilmemiş"}</dd>
          <dt>Provenans</dt><dd>{record.provenance.map((item) => `${item.institution}${item.identifier ? ` · ${item.identifier}` : ""}`).join("; ") || "Belirtilmemiş"}</dd>
        </dl></section>
      </div>
      <section className={styles.panel}><h2>Kalite uyarıları</h2><ul className={styles.list}>
        <li><span>Kaynak metadata’sı</span><strong>{flags.missingSource ? "Eksik" : "Alanlar mevcut"}</strong></li>
        <li><span>Tarih kesinliği</span><strong>{flags.dateUncertain ? "Uzman kontrolü gerekli" : "Kesin olarak işaretli (otomatik)"}</strong></li>
        <li><span>Kullanım hakkı</span><strong>{flags.rightsUnclear ? "Belirsiz veya izin gerekli" : record.rights.status}</strong></li>
        <li><span>Görsel sınıflandırması</span><strong>{flags.aiRepresentative ? "AI temsili" : record.image?.kind ?? "Görsel yok"}</strong></li>
      </ul></section>
      <section className={styles.panel}><h2>İnsan inceleme kaydı</h2>{form ? <><p>Durum: <strong>{form.review_status}</strong> · Sonuç: <strong>{form.outcome}</strong></p><p>Bu dosya yalnızca inceleme formudur. Kimlik doğrulaması ve denetim kaydıyla desteklenmedikçe gerçek uzman onayı olarak kabul edilmez.</p><Link className={styles.textLink} href={`/yonetim/incelemeler/${encodeURIComponent(record.id)}`}>İnceleme formunu görüntüle →</Link></> : <p>Bu kayıt için form dosyası bulunamadı.</p>}</section>
      <p><Link className={styles.textLink} href={`/arsiv/${encodeURIComponent(record.slug)}`}>Kamuya açık arşiv sayfasını aç →</Link></p>
    </main>
  );
}
