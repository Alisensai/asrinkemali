// Sürüm kapısı sınıflandırması: teknik, editoryal (insan onayı), dış kaynak, güvenlik, hak/telif, dağıtım.
// Tek bir PASS bayrağına indirgenmez. RELEASE_READY bu araç tarafından yalnız tüm koşullar sağlanırsa verilir.

export const GATE_CLASSES = ["TECHNICAL_READY_FOR_REVIEW", "EDITORIAL_BLOCKED", "SECURITY_BLOCKED", "INTEGRATION_BLOCKED", "EXTERNAL_VERIFICATION_PENDING", "READY_FOR_PROTECTED_REHEARSAL", "RELEASE_READY", "UNKNOWN"];
const EDITORIAL_CODES = new Set(["unauthorized-published-record", "published-without-human-review", "human-expert-review-required"]);
const LEGAL_CODES = /HAK|RIGHTS|LICENSE|TELIF|copyright/i;
const EXTERNAL_CODES = /LINK|URL|SOURCE_UNREACHABLE|external/i;

/** quality_runner.py çıktısından (release-quality.json) gerçek sayılar okunur; hiçbir sayı sabit değildir. */
export function classifyReleaseReport(report) {
  if (!report || !Array.isArray(report.checks)) return { gate: "UNKNOWN", reason: "Rapor yok veya biçimi tanınmadı." };
  const technical = report.checks.map((check) => ({ name: check.name, status: check.exit_code === 0 ? "pass" : check.exit_code === null || check.exit_code === undefined ? "not_run" : "fail", passed: check.tests_passed ?? 0, failed: check.tests_failed ?? 0 }));
  const findings = report.findings ?? [];
  const editorial = findings.filter((finding) => EDITORIAL_CODES.has(finding.code));
  const count = (code) => findings.filter((finding) => finding.code === code).length;
  const records = (code) => [...new Set(findings.filter((finding) => finding.code === code).map((finding) => finding.path || finding.record_id || finding.target).filter(Boolean))];
  const legal = findings.filter((finding) => LEGAL_CODES.test(finding.code));
  const external = findings.filter((finding) => EXTERNAL_CODES.test(finding.code) && !EDITORIAL_CODES.has(finding.code));
  const security = (report.security_findings ?? []).filter((finding) => ["critical", "high", "error"].includes(finding.severity));
  const technicalFailed = technical.filter((check) => check.status === "fail").length;
  const technicalNotRun = technical.filter((check) => check.status === "not_run").length;
  const gates = [];
  if (technicalFailed === 0 && technicalNotRun === 0) gates.push("TECHNICAL_READY_FOR_REVIEW");
  if (editorial.length) gates.push("EDITORIAL_BLOCKED");
  if (security.length) gates.push("SECURITY_BLOCKED");
  if (external.length) gates.push("EXTERNAL_VERIFICATION_PENDING");
  // Bu araç RELEASE_READY'yi yalnız tüm kapılar temizken ve rapor açıkça hazır diyorsa verir; dağıtım yetkisi yine insan kararıdır.
  if (!editorial.length && !security.length && technicalFailed === 0 && technicalNotRun === 0 && report.release_ready === true) gates.push("RELEASE_READY");
  return {
    gates: gates.length ? gates : ["UNKNOWN"],
    technical: { checks: technical, failed: technicalFailed, notRun: technicalNotRun, testsPassed: technical.reduce((sum, check) => sum + check.passed, 0), testsFailed: technical.reduce((sum, check) => sum + check.failed, 0) },
    editorial: { criticalFindings: editorial.filter((finding) => finding.severity === "critical").length, missingHumanExpertReview: count("published-without-human-review"), missingEditorPublicationApproval: count("unauthorized-published-record"), expertReviewItems: count("human-expert-review-required"), sampleRecords: { missingExpert: records("published-without-human-review").slice(0, 5), missingEditor: records("unauthorized-published-record").slice(0, 5) } },
    legal: { findings: legal.length, codes: [...new Set(legal.map((finding) => finding.code))].sort() },
    external: { findings: external.length, codes: [...new Set(external.map((finding) => finding.code))].sort(), note: "HTTP 200 içerik doğruluğu veya lisans kanıtı değildir; 400/403/429/5xx yeniden denetim gerektirir." },
    security: { blocking: security.length },
    deployment: { authorized: false, note: "CI başarısı dağıtım yetkisi değildir; dağıtım açık kullanıcı onayı gerektirir." },
  };
}

/** İş akışı adına göre CI tür ayrımı: teknik (Next.js/temel/güvenlik) ile karma (release-quality = teknik + editoryal). */
export function ciMatrix(checks) {
  const kind = (name) => /release-quality/i.test(name) ? "mixed_technical_and_editorial" : /fortress|security/i.test(name) ? "security" : "technical";
  return Object.entries(checks ?? {}).map(([name, state]) => ({ name, state, kind: kind(name) })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Link durum kodu yorumu: hiçbir kod tarihî doğruluk kanıtı değildir. */
export function interpretLinkStatus(status) {
  if (status >= 200 && status < 300) return { verdict: "reachable_not_proof", recheck: false };
  if ([400, 403, 429].includes(status) || status >= 500) return { verdict: "recheck_required", recheck: true };
  if (status === 404 || status === 410) return { verdict: "likely_broken_verify_with_institution", recheck: true };
  if (status >= 300 && status < 400) return { verdict: "redirect_verify_target", recheck: true };
  return { verdict: "unknown", recheck: true };
}
