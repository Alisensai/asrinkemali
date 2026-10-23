import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAdminSession, canAccessSection } from "@/lib/admin-v08/auth";
import { loadEditorialForm } from "@/lib/admin-v08/data";
import { getAllArchiveRecords } from "@/lib/archive";
import { safeHttpsUrl } from "@/lib/admin-v08/archive";
import { getReviewFormState } from "@/lib/admin-v08/reviews";
import styles from "@/app/yonetim/admin.module.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ReviewDetail({ params }: { params: Promise<{ recordId: string }> }) {
  const session = await getCurrentAdminSession();
  if (!session || !canAccessSection(session, "reviews")) return null;
  const { recordId } = await params;
  const form = loadEditorialForm(recordId);
  if (!form) notFound();
  const record = getAllArchiveRecords().find((item) => item.id === form.record_id);
  const state = getReviewFormState(form, record);
  const sourceUrl = safeHttpsUrl(form.record_snapshot.source_url);
  return (
    <main>
      <header className={styles.pageHeader}><div><span className={styles.kicker}>TARİH UZMANI İNCELEMESİ</span><h1>{form.record_snapshot.title}</h1><p>Form durumu: {state.replaceAll("_", " ")}</p></div></header>
      <p><Link className={styles.textLink} href="/yonetim/incelemeler">← İnceleme kuyruğuna dön</Link></p>
      <div className={styles.notice}><strong>Salt okunur · karar oluşturulamaz</strong><p>Bu çalışma alanında kimlik sağlayıcısı ve kalıcı audit deposu yoktur. Formdaki kişi adı/rolü kimlik kanıtı değildir; formu düzenleme veya onaylama yapılmaz.</p></div>
      <div className={styles.twoColumn}>
        <section className={styles.panel}><h2>Kayıt snapshot’ı</h2><dl>
          <dt>Kayıt kimliği</dt><dd>{form.record_id}</dd><dt>Snapshot SHA-256</dt><dd><code>{form.record_snapshot_sha256}</code></dd>
          <dt>Başlık</dt><dd>{form.record_snapshot.title}</dd><dt>Tür</dt><dd>{form.record_snapshot.type}</dd>
          <dt>Tarih</dt><dd>{form.record_snapshot.date.start ?? "Bilinmiyor"} · {form.record_snapshot.date.precision ?? "hassasiyet belirtilmemiş"}</dd>
          <dt>Kaynak kurumu</dt><dd>{form.record_snapshot.source_institution}</dd>
          <dt>Kaynak bağlantısı</dt><dd>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{sourceUrl}</a> : "Güvenli HTTPS kaynak bağlantısı yok"}</dd>
          <dt>Künye</dt><dd>{form.record_snapshot.citation || "Belirtilmemiş"}</dd>
          <dt>Hak durumu</dt><dd>{form.record_snapshot.rights_status}</dd>
        </dl></section>
        <section className={styles.panel}><h2>İnceleme alanları</h2><dl>
          <dt>Durum</dt><dd>{form.review_status}</dd><dt>İnceleyen</dt><dd>{form.reviewer?.name ?? "Atanmamış"} ({form.reviewer?.role ?? "—"})</dd>
          <dt>İnceleme tarihi</dt><dd>{form.review_date ?? "Bekliyor"}</dd><dt>Sonuç</dt><dd>{form.outcome}</dd>
          <dt>İnsan editör yayım onayı</dt><dd>{form.publicationApproval ? "Formda beyan var; doğrulanmış değil" : "Yok"}</dd>
        </dl></section>
      </div>
      {record ? <p><Link className={styles.textLink} href={`/yonetim/arsiv/${encodeURIComponent(record.slug)}`}>Güncel arşiv kaydını aç →</Link></p> : <p className={styles.warningText}>Formun işaret ettiği arşiv kaydı bulunamadı.</p>}
    </main>
  );
}
