import Link from "next/link";
import type { ArchiveRecordType, VerificationStatus } from "../../../schemas/archive-record.types";
import { ROLE_SECTIONS, ROLE_LABELS, ADMIN_ROLES, ADMIN_SECTIONS, canAccessSection } from "@/lib/admin-v08/access-control";
import type { AdminSection } from "@/lib/admin-v08/access-control";
import { getCurrentAdminSession } from "@/lib/admin-v08/auth";
import { filterArchiveRecords, getArchiveQualityFlags, safeHttpsUrl, summarizeArchive, type ArchiveQuery } from "@/lib/admin-v08/archive";
import { buildAdminSystemSnapshot, buildScheduleDryRun, buildTodayAdminBrief, loadEditorialForms } from "@/lib/admin-v08/data";
import { getReviewFormState } from "@/lib/admin-v08/reviews";
import { ADMIN_SECURITY_FINDINGS } from "@/lib/admin-v08/security-findings";
import { getAllArchiveRecords } from "@/lib/archive";
import { getAllPublications } from "@/lib/publishing/repository";
import { ArchiveTable } from "./ArchiveTable";
import { MetricCard } from "./MetricCard";
import styles from "@/app/yonetim/admin.module.css";

type SearchParams = Record<string, string | string[] | undefined>;
type ModulePageProps = { section: AdminSection; searchParams?: Promise<SearchParams> };

const PAGE_INFO: Record<AdminSection, { title: string; description: string }> = {
  overview: { title: "Genel Bakış", description: "Güncel repository verilerinden hesaplanan kontrol paneli." },
  archive: { title: "Arşiv Yönetimi", description: "Mevcut arşiv kataloğunda salt okunur arama, filtreleme ve kalite uyarıları." },
  reviews: { title: "İnsan Uzmanı İncelemeleri", description: "İnceleme formlarını salt okunur inceleyin; form verisi tek başına kimliği doğrulanmış uzman kararı değildir." },
  publications: { title: "Yayın Yönetimi", description: "Codex yayın motorunun kayıtlarını ve güvenli durumlarını görüntüleyin." },
  articles: { title: "Makale Stüdyosu", description: "Yayın motorundaki makale taslakları ve durumları; kalıcı yazma adapterı kurulmamıştır." },
  calendar: { title: "Yayın Takvimi", description: "Mevcut zamanlama sözleşmesinden üretilen dry-run; gerçek yayın veya zamanlayıcı çalıştırılmaz." },
  today: { title: "Tarihte Bugün", description: "Yayın kapısından geçmiş gün-hassasiyetli kayıtlar arasından seçilen gerçek adaylar." },
  sources: { title: "Kaynak ve Telif Denetimi", description: "Kaynak ve hak alanlarının kayıt bazlı görünümü; dış bağlantı doğruluğu burada test edilmez." },
  users: { title: "Kullanıcılar ve Roller", description: "Merkezi RBAC yetki matrisi. Kimlik sağlayıcısı yokken kullanıcı yönetimi kapalıdır." },
  audit: { title: "Denetim Günlüğü", description: "Tipli olay sözleşmesi ve kalıcılık durumu. Bu ortamda audit olayları yazılmaz." },
  system: { title: "Sistem Sağlığı", description: "Gerçek katalog ölçümleri ve bağlı olmayan GitHub/CI sistemleri için açık bilinmiyor durumu." },
};

const TYPES: readonly ArchiveRecordType[] = ["photograph", "document", "speech", "event", "publication", "place"];
const STATUSES: readonly VerificationStatus[] = ["draft", "reviewed", "published"];

function first(params: SearchParams, name: string): string {
  const value = params[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function positiveInteger(value: string, fallback: number, max = 9999) {
  if (!/^\d+$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 && number <= max ? number : fallback;
}

function parseArchiveQuery(params: SearchParams): ArchiveQuery {
  const type = first(params, "type");
  const status = first(params, "status");
  const yearFrom = Number(first(params, "from"));
  const yearTo = Number(first(params, "to"));
  return {
    q: first(params, "q").slice(0, 120),
    institution: first(params, "institution").slice(0, 120),
    type: TYPES.includes(type as ArchiveRecordType) ? type as ArchiveRecordType : "",
    status: STATUSES.includes(status as VerificationStatus) ? status as VerificationStatus : "",
    rightsRisk: first(params, "rights") === "unclear",
    yearFrom: Number.isInteger(yearFrom) && yearFrom >= 1800 && yearFrom <= 2100 ? yearFrom : undefined,
    yearTo: Number.isInteger(yearTo) && yearTo >= 1800 && yearTo <= 2100 ? yearTo : undefined,
    page: positiveInteger(first(params, "page"), 1, 1000000),
  };
}

function PageHeader({ section }: { section: AdminSection }) {
  const info = PAGE_INFO[section];
  return (
    <header className={styles.pageHeader}>
      <div><span className={styles.kicker}><Link href="/yonetim">YÖNETİM</Link> / MKA CONTROL CENTER</span><h1>{info.title}</h1><p>{info.description}</p></div>
    </header>
  );
}

function ArchivePage({ query }: { query: ArchiveQuery }) {
  const allRecords = getAllArchiveRecords();
  const report = summarizeArchive(allRecords);
  const result = filterArchiveRecords(allRecords, query);
  const institutions = [...new Set(allRecords.map((item) => item.source.institution).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({
    q: query.q,
    institution: query.institution,
    type: query.type,
    status: query.status,
    rights: query.rightsRisk ? "unclear" : "",
    from: query.yearFrom ? String(query.yearFrom) : "",
    to: query.yearTo ? String(query.yearTo) : "",
  })) if (value) params.set(key, value);

  return (
    <>
      <section className={styles.metricGrid}>
        <MetricCard label="Toplam kayıt" value={report.total} detail="Katalog dosyalarından dinamik" />
        <MetricCard label="Kaynak alanı eksik" value={report.missingSource} detail="Kurum, başlık veya URL" />
        <MetricCard label="Telif belirsiz" value={report.rightsUnclear} detail="Bilinmeyen / izin gerekli" />
        <MetricCard label="İnsan incelemesi doğrulanmamış" value={report.humanReviewUnverified} detail="Teknik durum insan onayı değildir" />
      </section>
      <form method="get" action="/yonetim/arsiv" className={styles.filterForm} aria-label="Arşiv filtreleri">
        <label>Başlık veya özet<input name="q" maxLength={120} defaultValue={query.q} /></label>
        <label>Kaynak kurumu<select name="institution" defaultValue={query.institution}><option value="">Tüm kurumlar</option>{institutions.map((institution) => <option key={institution} value={institution}>{institution}</option>)}</select></label>
        <label>Kayıt türü<select name="type" defaultValue={query.type}><option value="">Tümü</option>{TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label>Teknik durum<select name="status" defaultValue={query.status}><option value="">Tümü</option>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        <label>Başlangıç yılı<input type="number" name="from" min="1800" max="2100" defaultValue={query.yearFrom} /></label>
        <label>Bitiş yılı<input type="number" name="to" min="1800" max="2100" defaultValue={query.yearTo} /></label>
        <label>Hak durumu<select name="rights" defaultValue={query.rightsRisk ? "unclear" : ""}><option value="">Tümü</option><option value="unclear">Belirsiz veya izin gerekli</option></select></label>
        <button className={styles.button} type="submit">Filtrele</button>
      </form>
      <p className={styles.muted} aria-live="polite">{result.total} kayıt eşleşti · sayfa {result.page}/{result.pageCount}</p>
      <ArchiveTable records={result.items} />
      <nav className={styles.pagination} aria-label="Arşiv sayfaları">
        {result.page > 1 ? <Link href={`/yonetim/arsiv?${new URLSearchParams([...params, ["page", String(result.page - 1)]]).toString()}`}>← Önceki</Link> : <span />}
        <span>Sayfa {result.page} / {result.pageCount}</span>
        {result.page < result.pageCount ? <Link href={`/yonetim/arsiv?${new URLSearchParams([...params, ["page", String(result.page + 1)]]).toString()}`}>Sonraki →</Link> : <span />}
      </nav>
      <section className={styles.twoColumn}>
        <div className={styles.panel}><h2>Kayıt türü dağılımı</h2><ul className={styles.list}>{Object.entries(report.byType).map(([type, count]) => <li key={type}><span>{type}</span><strong>{count}</strong></li>)}</ul></div>
        <div className={styles.panel}><h2>Kaynak kurumu dağılımı</h2><ul className={styles.list}>{report.byInstitution.slice(0, 10).map(([institution, count]) => <li key={institution}><span>{institution}</span><strong>{count}</strong></li>)}</ul></div>
      </section>
      <div className={styles.notice}><strong>Salt okunur katalog</strong><p>Kayıt düzenleme, staging kaydı ve import işlemi etkin değil. Bu ekran katalog dosyalarını değiştirmez.</p></div>
    </>
  );
}

function ReviewQueue() {
  const { available, forms } = loadEditorialForms();
  const records = getAllArchiveRecords();
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const counts = { pending: 0, submitted_claim_unverified: 0, stale: 0, invalid: 0 };
  const rows = forms.map((form) => {
    const state = getReviewFormState(form, recordsById.get(form.record_id));
    counts[state] += 1;
    return { form, state };
  });
  const priorityOrder = { stale: 0, invalid: 1, pending: 2, submitted_claim_unverified: 3 };
  rows.sort((a, b) => priorityOrder[a.state] - priorityOrder[b.state] || a.form.record_snapshot.title.localeCompare(b.form.record_snapshot.title, "tr"));

  if (!available) return <div className={styles.emptyState}><h2>İnceleme form dizini bulunamadı</h2><p>İş akışı verisi olmadan inceleme durumu gösterilemiyor.</p></div>;
  if (!rows.length) return <div className={styles.emptyState}><h2>İnceleme formu yok</h2><p>Bu ortamda form bulunmuyor.</p></div>;
  return (
    <>
      <div className={styles.metricGrid}>
        <MetricCard label="Bekliyor" value={counts.pending} detail="Uzman değerlendirmesi bekliyor" />
        <MetricCard label="Beyan edilmiş" value={counts.submitted_claim_unverified} detail="Kimlik/audit ile doğrulanmadı" />
        <MetricCard label="Bayat" value={counts.stale} detail="Katalog snapshot'ı değişmiş" />
        <MetricCard label="Geçersiz" value={counts.invalid} detail="Form veya kayıt eşleşmesi sorunlu" />
      </div>
      <div className={styles.notice}><strong>Onay güvenliği</strong><p>Dosyadaki uzman adı veya submitted durumu doğrulanmış insan kimliği değildir. Bu panel form düzenlemez, karar vermez ve PR #12 yayın kapısını değiştirmez.</p></div>
      <div className={styles.tableWrap}><table className={styles.dataTable}>
        <caption className={styles.srOnly}>Tarih uzmanı inceleme kuyruğu</caption>
        <thead><tr><th scope="col">Kayıt</th><th scope="col">Kaynak kurumu</th><th scope="col">Tarih</th><th scope="col">Form durumu</th><th scope="col">İşlem</th></tr></thead>
        <tbody>{rows.map(({ form, state }) => <tr key={form.record_id}>
          <td>{form.record_snapshot.title}<small>{form.record_id}</small></td>
          <td>{form.record_snapshot.source_institution || "Eksik"}</td>
          <td>{form.record_snapshot.date?.start ?? "Belirtilmemiş"}<small>{form.record_snapshot.date?.certainty ?? "Kesinlik yok"}</small></td>
          <td><span className={styles.status}>{state.replaceAll("_", " ")}</span></td>
          <td><Link className={styles.tableLink} href={`/yonetim/incelemeler/${encodeURIComponent(form.record_id)}`}>Ayrıntı</Link></td>
        </tr>)}</tbody>
      </table></div>
    </>
  );
}

function PublicationList({ articleOnly }: { articleOnly: boolean }) {
  const publications = getAllPublications();
  const shown = articleOnly ? publications.filter((record) => record.kind !== "biography") : publications;
  if (!shown.length) return <div className={styles.emptyState}><h2>Yayın kaydı bulunamadı</h2><p>Yayın repository’sinde bu görünüm için kayıt yok. Buradan kalıcı taslak oluşturma etkin değildir; yayın motoru verileri değiştirilmedi.</p></div>;
  return <div className={styles.tableWrap}><table className={styles.dataTable}>
    <caption className={styles.srOnly}>Yayın motoru kayıtları</caption>
    <thead><tr><th scope="col">Başlık</th><th scope="col">Tür / kategori</th><th scope="col">Yazar</th><th scope="col">Durum</th><th scope="col">Kaynakça</th><th scope="col">İlişkili arşiv</th></tr></thead>
    <tbody>{shown.map((record) => <tr key={record.id}><td>{record.title}<small>{record.slug}</small></td><td>{record.kind}<small>{record.category}</small></td><td>{record.authors.join(", ")}</td><td><span className={styles.status}>{record.status}</span></td><td>{record.bibliography.length}</td><td>{record.relatedArchiveIds.length}</td></tr>)}</tbody>
  </table></div>;
}

function CalendarDryRun() {
  const plan = buildScheduleDryRun();
  return (
    <>
      <div className={styles.notice}><strong>Dry-run · yayın yapılmaz</strong><p>Plan, mevcut scheduler ve repository içindeki ledger girdisini kullanır; hiçbir kayda yazılmaz ve gerçek zamanlayıcı çalışmaz.</p></div>
      <section className={styles.twoColumn}>
        <div className={styles.panel}><h2>Planlanmaya hazır ({plan.ready.length})</h2>{plan.ready.length ? <ul className={styles.list}>{plan.ready.map((item) => <li key={item.idempotencyKey}><span>{item.slug}<small>{item.scheduledAt}</small></span><strong>Dry-run</strong></li>)}</ul> : <p>Şu anda uygun planlanmış yayın yok.</p>}</div>
        <div className={styles.panel}><h2>Atlanan ({plan.skipped.length})</h2>{plan.skipped.length ? <ul className={styles.list}>{plan.skipped.map((item, index) => <li key={`${item.publicationId}-${index}`}><span>{item.publicationId}<small>{item.reason}</small></span></li>)}</ul> : <p>Atlanan kayıt yok.</p>}</div>
      </section>
    </>
  );
}

function TodayCandidates() {
  const brief = buildTodayAdminBrief();
  if (!brief.candidates.length) return <div className={styles.emptyState}><h2>Bugün için kaynaklı aday yok</h2><p>{brief.message} Yeni tarihî olay üretilmedi.</p></div>;
  return <ul className={styles.list}>{brief.candidates.map((item) => {
    const sourceUrl = safeHttpsUrl(item.sourceUrl);
    return <li key={item.archiveId}><span><strong>{item.title}</strong><small>{item.date} · {item.sourceInstitution}</small><small>{item.summary}</small></span>{sourceUrl ? <a className={styles.textLink} href={sourceUrl} target="_blank" rel="noopener noreferrer">Kaynağı aç</a> : <span className={styles.warningText}>Güvenli kaynak bağlantısı yok</span>}</li>;
  })}</ul>;
}

function SourcesOverview() {
  const records = getAllArchiveRecords();
  const report = summarizeArchive(records);
  const sorted = [...records].sort((a, b) => {
    const riskA = getArchiveQualityFlags(a);
    const riskB = getArchiveQualityFlags(b);
    return Number(riskB.missingSource || riskB.rightsUnclear || riskB.sourceIsMediaFile) -
      Number(riskA.missingSource || riskA.rightsUnclear || riskA.sourceIsMediaFile);
  });
  return (
    <>
      <div className={styles.metricGrid}>
        <MetricCard label="Eksik kaynak alanı" value={report.missingSource} detail="Kurum, kaynak adı veya URL" />
        <MetricCard label="Hak durumu belirsiz" value={report.rightsUnclear} detail="Otomatik değerlendirme; hukuk görüşü değildir" />
        <MetricCard label="Tarihi belirsiz" value={report.dateUncertain} detail="Yaklaşık veya bilinmeyen tarih" />
        <MetricCard label="Ham medya kaynak URL'si" value={report.sourceIsMediaFile} detail="Landing page ve kullanım bağlamı insan kontrolü bekliyor" />
        <MetricCard label="Katalog kaydı" value={report.total} detail="Tüm arşiv türleri" />
      </div>
      <div className={styles.tableWrap}><table className={styles.dataTable}>
        <caption className={styles.srOnly}>Arşiv kaynak ve telif metadata raporu</caption>
        <thead><tr><th scope="col">Kayıt</th><th scope="col">Kurum ve kaynak</th><th scope="col">Künye</th><th scope="col">Hak durumu</th><th scope="col">Uyarılar</th></tr></thead>
        <tbody>{sorted.map((record) => {
          const flags = getArchiveQualityFlags(record);
          const sourceUrl = safeHttpsUrl(record.source.url);
          const institutionUrl = safeHttpsUrl(record.source.institutionUrl);
          return <tr key={record.id}><td><Link className={styles.tableLink} href={`/yonetim/arsiv/${encodeURIComponent(record.slug)}`}>{record.title}</Link></td><td>{record.source.institution}<small>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{record.source.title || sourceUrl}</a> : "Güvenli HTTPS bağlantısı yok"}{institutionUrl ? <a href={institutionUrl} target="_blank" rel="noopener noreferrer">Kurum sayfası</a> : null}</small></td><td>{record.source.citation || "Künye belirtilmemiş"}</td><td><span className={styles.status}>{record.rights.status}</span></td><td>{[flags.missingSource && "Kaynak alanı", flags.rightsUnclear && "Hak belirsiz", flags.aiRepresentative && "AI temsili", flags.sourceIsMediaFile && "Ham medya dosyası; landing page insan kontrolü gerekli"].filter(Boolean).join(" · ") || "—"}</td></tr>;
        })}</tbody>
      </table></div>
      <section className={styles.panel}>
        <h2>Güvenlik ve kaynak inceleme bulguları</h2>
        <ul className={styles.list}>{ADMIN_SECURITY_FINDINGS.map((finding) => (
          <li key={finding.id}>
            <span><strong>{finding.id} · {finding.severity}</strong><small>{finding.risk}</small><small>Kanıt: {finding.evidence}</small><small>Sorumlu: {finding.owner}</small><small>Öneri: {finding.proposedFix}</small></span>
            <strong>{finding.humanDecisionNeeded ? "İnsan kararı gerekli" : "Teknik"}</strong>
          </li>
        ))}</ul>
      </section>
    </>
  );
}

function UsersAndRoles() {
  return (
    <>
      <div className={styles.notice}><strong>Gerçek kullanıcı yönetimi kapalı</strong><p>Kimlik sağlayıcısı yok. Kullanıcı ekleme, davet, parola sıfırlama ve rol değiştirme endpoint’i bulunmaz. Aşağıdaki matris merkezi RBAC sözleşmesinden üretilmiştir.</p></div>
      <div className={styles.tableWrap}><table className={styles.dataTable}>
        <caption className={styles.srOnly}>Rol ve modül erişim matrisi</caption>
        <thead><tr><th scope="col">Rol</th>{ADMIN_SECTIONS.map((section) => <th scope="col" key={section}>{section}</th>)}</tr></thead>
        <tbody>{ADMIN_ROLES.map((role) => <tr key={role}><th scope="row">{ROLE_LABELS[role]}</th>{ADMIN_SECTIONS.map((section) => <td key={section}>{ROLE_SECTIONS[role].includes(section) ? "Erişim" : "—"}</td>)}</tr>)}</tbody>
      </table></div>
    </>
  );
}

async function ModuleContents({ section, params }: { section: AdminSection; params: SearchParams }) {
  switch (section) {
    case "archive":
      return <ArchivePage query={parseArchiveQuery(params)} />;
    case "reviews":
      return <ReviewQueue />;
    case "publications":
      return <PublicationList articleOnly={false} />;
    case "articles":
      return <PublicationList articleOnly />;
    case "calendar":
      return <CalendarDryRun />;
    case "today":
      return <TodayCandidates />;
    case "sources":
      return <SourcesOverview />;
    case "users":
      return <UsersAndRoles />;
    case "audit":
      return <div className={styles.emptyState}><h2>Kalıcı denetim günlüğü yapılandırılmamış</h2><p>Tipli olay sözleşmesi mevcut olsa da audit repository’si bulunmuyor. Bu nedenle geçmiş olaylar gösterilmez ve kullanıcı işlemleri başlatılmaz.</p></div>;
    case "system": {
      const snapshot = buildAdminSystemSnapshot();
      const readiness = snapshot.readiness;
      return <>
        <div className={styles.notice} role="status">
          <strong>Yayın kalite kapısı: {readiness.releaseGate.status === "blocked" ? "İNSAN İNCELEMESİ BEKLİYOR" : "İNSAN TEYİDİ GEREKLİ"}</strong>
          <p>Bu teknik görünüm, yayın uygunluğu veya tarihî doğruluk beyanı değildir. Kayıt onayları, doğrulanmış insan aktörleriyle ve güncel içerik SHA-256 özetiyle ayrıca incelenmelidir.</p>
        </div>
        <section className={styles.metricGrid} aria-label="Sistem doğrulanmış verileri">
          <MetricCard label="Katalog durumu" value={readiness.archive.status} detail={`${readiness.archive.count} kayıt; son içerik güncellemesi ${snapshot.latestRecordUpdate ?? "belirtilmemiş"}`} />
          <MetricCard label="İnceleme formları" value={readiness.editorial.status} detail={`${readiness.editorial.count} form; ${snapshot.reviewCounts.pending} bekliyor, ${snapshot.reviewCounts.stale} eski, ${snapshot.reviewCounts.invalid} geçersiz`} />
          <MetricCard label="Yayın kayıtları" value={snapshot.publicationCount} detail="Repository verisinden salt okunur" />
          <MetricCard label="Zamanlayıcı" value="dry-run" detail={`${snapshot.schedule.ready} aday, ${snapshot.schedule.skipped} atlanan; yürütme kapalı`} />
          <MetricCard label="Kimlik sağlayıcısı" value={readiness.identity} detail="Yönetim erişimi kapalı" />
          <MetricCard label="Kalıcı DB / audit" value={`${readiness.database} / ${readiness.audit}`} detail="Yazma ve karar kaydı yapılandırılmadı" />
          <MetricCard label="CI bağlantısı" value={readiness.ci} detail="Token veya adapter yok; son senkron zamanı yok" />
          <MetricCard label="Release hazır" value="hayır" detail={`Açık incelemeler: ${readiness.releaseGate.pending + readiness.releaseGate.stale + readiness.releaseGate.invalid + readiness.releaseGate.unverifiedSubmissions}`} />
        </section>
        <div className={styles.twoColumn}>
          <div className={styles.panel}><h2>Üretim sınırı</h2><p>Bu snapshot yerel katalog ve formlardan hesaplanır. Kimlik sağlayıcısı, kalıcı repository, audit ledger ve CI adapterı bağlı değildir; bunlar başarılı veya sağlıklı olarak varsayılmaz.</p><time dateTime={readiness.capturedAt}>Ölçüm zamanı: {readiness.capturedAt}</time></div>
          <div className={styles.panel}><h2>İnsan onayı ayrı kapıdır</h2><p>Uzman incelemesi ile editör yayın onayı farklı aktörler gerektirir. İçerik özeti değişirse önceki karar geçersizdir. Eksik onay yayın kapısını kapalı tutar.</p></div>
        </div>
      </>;
    }
    default:
      return <div className={styles.emptyState}><h2>Bu modül salt okunur kapsamda değil</h2><p>İstenen alan mevcut yönetim sözleşmesinde bulunmuyor.</p></div>;
  }
}

export async function AdminModulePage({ section, searchParams }: ModulePageProps) {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!canAccessSection(session, section)) return <div className={styles.emptyState} role="alert"><h2>Erişim reddedildi</h2><p>Bu rol için modül yetkisi yok.</p></div>;
  const params = searchParams ? await searchParams : {};
  return (
    <main>
      <PageHeader section={section} />
      <ModuleContents section={section} params={params} />
    </main>
  );
}
