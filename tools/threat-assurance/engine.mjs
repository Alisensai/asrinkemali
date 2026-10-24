import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";

export const CONTROL_STATES = new Set([
  "ACTIVE",
  "PARTIAL",
  "TEMPLATE",
  "MISSING",
  "NOT_APPLICABLE",
  "NOT_VERIFIED",
]);
export const ASVS_STATUSES = new Set(["PASS", "PARTIAL", "FAIL", "NOT_APPLICABLE", "NOT_VERIFIED"]);
export const ARCHITECTURE_STATES = new Set(["ACTIVE", "PARTIAL", "TEMPLATE", "MISSING", "NOT_VERIFIED"]);

const MITRE_CATALOG = new Map([
  ["T1190", "Exploit Public-Facing Application"],
  ["T1195", "Supply Chain Compromise"],
  ["T1565", "Data Manipulation"],
  ["T1498", "Network Denial of Service"],
  ["T1078", "Valid Accounts"],
]);
const ASVS_IDS = new Set([
  "v5.0.0-2.2.1",
  "v5.0.0-2.4.1",
  "v5.0.0-3.3.1",
  "v5.0.0-3.3.2",
  "v5.0.0-3.3.3",
  "v5.0.0-3.3.4",
  "v5.0.0-3.4.1",
  "v5.0.0-3.4.3",
  "v5.0.0-3.4.4",
  "v5.0.0-3.4.7",
  "v5.0.0-3.5.1",
  "v5.0.0-5.2.2",
  "v5.0.0-6.1.1",
  "v5.0.0-8.3.1",
]);
const TOP10 = new Map([
  ["A01:2025", "Broken Access Control"],
  ["A02:2025", "Security Misconfiguration"],
  ["A03:2025", "Software Supply Chain Failures"],
  ["A04:2025", "Cryptographic Failures"],
  ["A05:2025", "Injection"],
  ["A06:2025", "Insecure Design"],
  ["A07:2025", "Authentication Failures"],
  ["A08:2025", "Software or Data Integrity Failures"],
  ["A09:2025", "Security Logging and Alerting Failures"],
  ["A10:2025", "Mishandling of Exceptional Conditions"],
]);
const IMPACT_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const LIKELIHOOD_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3 };
const STRIDE_CATEGORIES = new Set([
  "Spoofing",
  "Tampering",
  "Repudiation",
  "Information Disclosure",
  "Denial of Service",
  "Elevation of Privilege",
]);
const REQUIRED_STRIDE_FIELDS = [
  "asset",
  "entryPoint",
  "trustBoundary",
  "threatBehavior",
  "currentControl",
  "missingControl",
  "impact",
  "likelihood",
  "risk",
  "verification",
  "owner",
];

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function resolveEvidencePath(root, filePath) {
  const target = resolve(root, ...filePath.split(/[\\/]+/));
  const rel = relative(resolve(root), target);
  if (rel === ".." || rel.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(rel)) return null;
  return target;
}

function expectedRisk(impact, likelihood) {
  if (likelihood === "NOT_ESTIMATED") return "UNASSESSED";
  const impactRank = IMPACT_RANK[impact];
  const likelihoodRank = LIKELIHOOD_RANK[likelihood];
  if (!impactRank || !likelihoodRank) return null;
  if (impactRank === 4) return likelihoodRank === 3 ? "CRITICAL" : "HIGH";
  if (impactRank === 3) return likelihoodRank === 1 ? "MODERATE" : "HIGH";
  if (impactRank === 2) return likelihoodRank === 1 ? "LOW" : "MODERATE";
  return "LOW";
}

export function deriveRisk(impact, likelihood) {
  return expectedRisk(impact, likelihood);
}

export function validateAssessment(assessment, { repoRoot = process.cwd() } = {}) {
  const issues = [];
  const add = (message) => issues.push(message);
  if (!isRecord(assessment)) return ["Assessment must be a JSON object."];
  if (assessment.schemaVersion !== "1.0.0") add("schemaVersion must be 1.0.0.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(assessment.asOf ?? "")) add("asOf must be an ISO calendar date.");
  if (!isRecord(assessment.basis) || !nonEmpty(assessment.basis.branch) || !/^[0-9a-f]{40}$/.test(assessment.basis.commit ?? "")) {
    add("basis must identify a branch and a full 40-character commit.");
  }
  if (!isRecord(assessment.controlSource) || !/^https:\/\/github\.com\/Alisensai\/asrinkemali\/pull\/71$/.test(assessment.controlSource.url ?? "")) {
    add("controlSource must identify the read-only PR #71 source list.");
  }

  const evidenceById = new Map();
  if (!Array.isArray(assessment.evidence)) {
    add("evidence must be an array.");
  } else {
    for (const [index, evidence] of assessment.evidence.entries()) {
      if (!isRecord(evidence) || !nonEmpty(evidence.id)) {
        add(`evidence[${index}] must have an id.`);
        continue;
      }
      if (evidenceById.has(evidence.id)) add(`Duplicate evidence id: ${evidence.id}.`);
      evidenceById.set(evidence.id, evidence);
      if (evidence.kind === "file") {
        if (!nonEmpty(evidence.path)) {
          add(`Evidence ${evidence.id} is missing its file path.`);
        } else {
          const target = resolveEvidencePath(repoRoot, evidence.path);
          if (!target) add(`Evidence ${evidence.id} escapes the repository root.`);
          else if (!existsSync(target)) add(`Evidence ${evidence.id} references missing file: ${evidence.path}.`);
        }
        if (evidence.state !== "INTEGRATED") add(`File evidence ${evidence.id} must be marked INTEGRATED.`);
      } else if (evidence.kind === "pull_request") {
        if (!Number.isInteger(evidence.number) || !/^https:\/\/github\.com\/Alisensai\/asrinkemali\/pull\/\d+$/.test(evidence.url ?? "")) {
          add(`Pull request evidence ${evidence.id} must have a repository PR number and URL.`);
        }
        if (evidence.state === "OPEN" && evidence.evidenceState !== "PR_ONLY") {
          add(`Open pull request evidence ${evidence.id} must be PR_ONLY.`);
        }
        if (evidence.state === "MERGED" && evidence.evidenceState !== "INTEGRATED") {
          add(`Merged pull request evidence ${evidence.id} must be INTEGRATED.`);
        }
        if (!["OPEN", "MERGED", "CLOSED"].includes(evidence.state)) add(`Pull request evidence ${evidence.id} has an unknown state.`);
      } else if (evidence.kind === "observation") {
        if (evidence.state !== "NOT_VERIFIED" || !nonEmpty(evidence.url) || !nonEmpty(evidence.note)) {
          add(`Observation ${evidence.id} must be explicitly NOT_VERIFIED and explain its limit.`);
        }
      } else {
        add(`Evidence ${evidence.id} has an unsupported kind.`);
      }
      if (!nonEmpty(evidence.note)) add(`Evidence ${evidence.id} needs a limitation-aware note.`);
    }
  }

  const checkEvidenceIds = (owner, ids) => {
    if (!Array.isArray(ids)) {
      add(`${owner} evidenceIds must be an array.`);
      return [];
    }
    for (const id of ids) if (!evidenceById.has(id)) add(`${owner} references unknown evidence id ${id}.`);
    return ids.map((id) => evidenceById.get(id)).filter(Boolean);
  };

  if (!Array.isArray(assessment.controls)) {
    add("controls must be an array.");
  } else {
    if (assessment.controls.length !== 99) add(`Expected exactly 99 controls; found ${assessment.controls.length}.`);
    const canonicalControls = assessment.controls.map((control) => `${control?.id}\t${control?.name}`).join("\n");
    const sourceHash = createHash("sha256").update(canonicalControls, "utf8").digest("hex");
    if (sourceHash !== assessment.controlSource?.sha256) add("Control names/order do not match the recorded PR #71 source-list SHA-256.");
    const seen = new Set();
    for (const [index, control] of assessment.controls.entries()) {
      const owner = `control[${index}]`;
      if (!isRecord(control)) {
        add(`${owner} must be an object.`);
        continue;
      }
      if (control.id !== index + 1) add(`${owner} must be numbered ${index + 1} in source order.`);
      if (seen.has(control.id)) add(`Duplicate control id ${control.id}.`);
      seen.add(control.id);
      if (!nonEmpty(control.name) || !nonEmpty(control.currentControl) || !nonEmpty(control.gap) || !nonEmpty(control.remediation)) {
        add(`${owner} needs a name, currentControl, gap, and remediation.`);
      }
      if (!CONTROL_STATES.has(control.state)) add(`${owner} has unsupported state ${control.state}.`);
      if (!["CURRENT", "FUTURE", "NOT_APPLICABLE"].includes(control.applicability)) add(`${owner} has unsupported applicability.`);
      if (control.state === "NOT_APPLICABLE" && control.applicability === "CURRENT") add(`${owner} is contradictory: current applicability cannot be NOT_APPLICABLE.`);
      if (control.applicability === "NOT_APPLICABLE" && control.state !== "NOT_APPLICABLE") add(`${owner} is contradictory: non-applicable control must be NOT_APPLICABLE.`);
      const refs = checkEvidenceIds(owner, control.evidenceIds);
      if (control.state === "ACTIVE") {
        if (!refs.some((item) => item.kind === "file" && item.state === "INTEGRATED")) add(`${owner} ACTIVE requires integrated file evidence.`);
        if (refs.some((item) => item.evidenceState === "PR_ONLY")) add(`${owner} cannot be ACTIVE based on PR-only evidence.`);
      }
      if (control.state === "TEMPLATE" && !refs.some((item) => item.evidenceState === "PR_ONLY")) {
        add(`${owner} TEMPLATE requires explicit PR-only evidence.`);
      }
    }
  }

  if (!Array.isArray(assessment.stride)) {
    add("stride must be an array.");
  } else {
    for (const [index, threat] of assessment.stride.entries()) {
      const owner = `stride[${index}]`;
      if (!isRecord(threat) || !STRIDE_CATEGORIES.has(threat.category)) {
        add(`${owner} has an invalid STRIDE category.`);
        continue;
      }
      for (const field of REQUIRED_STRIDE_FIELDS) if (!nonEmpty(threat[field])) add(`${owner} is missing ${field}.`);
      checkEvidenceIds(owner, threat.evidenceIds);
    }
  }

  if (!Array.isArray(assessment.mitre)) {
    add("mitre must be an array.");
  } else {
    for (const [index, technique] of assessment.mitre.entries()) {
      const owner = `mitre[${index}]`;
      const catalogName = MITRE_CATALOG.get(technique?.id);
      if (!catalogName) add(`${owner} uses an unverified MITRE ATT&CK v20.0 ID ${technique?.id}.`);
      else if (technique.name !== catalogName) add(`${owner} name does not match the MITRE catalog for ${technique.id}.`);
      if (!["CURRENT_RELEVANT", "FUTURE_ONLY"].includes(technique?.applicability)) add(`${owner} has invalid applicability.`);
      if (!CONTROL_STATES.has(technique?.controlState)) add(`${owner} has invalid controlState.`);
      if (!/^https:\/\/attack\.mitre\.org\/techniques\/T\d{4}\/?$/.test(technique?.url ?? "")) add(`${owner} has invalid official technique URL.`);
      if (!nonEmpty(technique?.gaps) || !nonEmpty(technique?.remediation)) add(`${owner} needs a gap and remediation.`);
      checkEvidenceIds(owner, technique?.evidenceIds);
    }
  }

  if (!Array.isArray(assessment.asvs)) {
    add("asvs must be an array.");
  } else {
    for (const [index, requirement] of assessment.asvs.entries()) {
      const owner = `asvs[${index}]`;
      if (!isRecord(requirement) || !ASVS_IDS.has(requirement.id)) add(`${owner} uses an unverified ASVS v5.0.0 requirement id.`);
      if (!ASVS_STATUSES.has(requirement?.status)) add(`${owner} has an invalid ASVS status.`);
      if (!["APPLICABLE", "NOT_APPLICABLE"].includes(requirement?.applicability)) add(`${owner} has invalid applicability.`);
      if (requirement?.status === "NOT_APPLICABLE" && requirement.applicability !== "NOT_APPLICABLE") add(`${owner} has contradictory NOT_APPLICABLE status.`);
      if (requirement?.applicability === "NOT_APPLICABLE" && requirement.status !== "NOT_APPLICABLE") add(`${owner} has contradictory applicability/status.`);
      const refs = checkEvidenceIds(owner, requirement?.evidenceIds);
      if (requirement?.status === "PASS") {
        if (refs.length === 0 || refs.some((item) => item.kind !== "file" || item.verification !== "test" || item.state !== "INTEGRATED")) {
          add(`${owner} PASS requires integrated deterministic test evidence; code assertions or PRs alone are insufficient.`);
        }
        if (requirement.gap !== "None identified") add(`${owner} PASS cannot retain an unresolved gap.`);
      }
      if (!nonEmpty(requirement?.topic) || !nonEmpty(requirement?.gap) || !nonEmpty(requirement?.remediation)) {
        add(`${owner} needs a topic, gap, and remediation.`);
      }
    }
  }

  if (!Array.isArray(assessment.owaspTop10)) {
    add("owaspTop10 must be an array.");
  } else {
    for (const [index, item] of assessment.owaspTop10.entries()) {
      const owner = `owaspTop10[${index}]`;
      if (TOP10.get(item?.id) !== item?.name) add(`${owner} is not an official OWASP Top 10:2025 category.`);
      if (!ASVS_STATUSES.has(item?.status)) add(`${owner} has an invalid status.`);
      if (!nonEmpty(item?.note)) add(`${owner} needs an evidence-limited mapping note.`);
      checkEvidenceIds(owner, item?.evidenceIds);
    }
    if (assessment.owaspTop10.length !== TOP10.size) add("OWASP Top 10:2025 mapping must contain each category exactly once.");
  }

  if (!Array.isArray(assessment.architecture)) {
    add("architecture must be an array.");
  } else {
    for (const [index, layer] of assessment.architecture.entries()) {
      const owner = `architecture[${index}]`;
      if (!isRecord(layer) || !nonEmpty(layer.layer) || !nonEmpty(layer.note)) add(`${owner} needs a layer and note.`);
      if (!ARCHITECTURE_STATES.has(layer?.state)) add(`${owner} has an invalid architecture state.`);
      const refs = checkEvidenceIds(owner, layer?.evidenceIds);
      if (layer?.state === "ACTIVE" && (!refs.some((item) => item.kind === "file") || refs.some((item) => item.evidenceState === "PR_ONLY"))) {
        add(`${owner} ACTIVE cannot rely on PR-only or non-file evidence.`);
      }
      if (layer?.state === "TEMPLATE" && !refs.some((item) => item.evidenceState === "PR_ONLY")) {
        add(`${owner} TEMPLATE requires PR-only evidence.`);
      }
    }
  }

  if (!Array.isArray(assessment.risks)) {
    add("risks must be an array.");
  } else {
    const riskIds = new Set();
    for (const [index, risk] of assessment.risks.entries()) {
      const owner = `risks[${index}]`;
      if (!isRecord(risk) || !nonEmpty(risk.id) || !nonEmpty(risk.title)) {
        add(`${owner} needs an id and title.`);
        continue;
      }
      if (riskIds.has(risk.id)) add(`Duplicate risk id ${risk.id}.`);
      riskIds.add(risk.id);
      if (!["TECHNICAL", "OPERATIONAL", "EDITORIAL"].includes(risk.classification)) add(`${owner} has invalid classification.`);
      if (!nonEmpty(risk.riskRationale) || !nonEmpty(risk.mitigation)) add(`${owner} needs risk rationale and mitigation.`);
      checkEvidenceIds(owner, risk.evidenceIds);
      if (risk.classification === "EDITORIAL") {
        if (risk.risk !== "RELEASE_BLOCKER") add(`${owner} editorial gate must remain distinct as RELEASE_BLOCKER.`);
      } else {
        const expected = expectedRisk(risk.impact, risk.likelihood);
        if (!expected || risk.risk !== expected) add(`${owner} risk rating contradicts its impact/likelihood rationale.`);
      }
    }
    for (const [index, threat] of (assessment.stride ?? []).entries()) {
      if (threat?.riskId && !riskIds.has(threat.riskId)) add(`stride[${index}] references unknown risk ${threat.riskId}.`);
    }
  }

  const controlIds = new Set((assessment.controls ?? []).map((item) => item?.id));
  if (controlIds.size !== 99 || !controlIds.has(99)) add("The 99-control source list must be complete through control 99.");
  return issues;
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildReport(assessment) {
  assessment = structuredClone(assessment);
  return {
    schemaVersion: assessment.schemaVersion,
    assessmentDate: assessment.asOf,
    repository: assessment.repository,
    basis: assessment.basis,
    controlSource: assessment.controlSource,
    scope: {
      activeApplication: "Entegre Next.js uygulaması ve depodaki mevcut kontroller.",
      excluded: ["Üretim dağıtımını doğrulama", "Aktif tarama veya saldırı simülasyonu", "Birleştirilmemiş PR'ları etkin kontrol sayma"],
      certification: "Uygunluk sertifikası veya eksiksiz ASVS uyumu iddiası yoktur.",
    },
    standards: assessment.standards,
    summary: {
      controlCount: assessment.controls.length,
      controlStates: countBy(assessment.controls, "state"),
      asvsStatuses: countBy(assessment.asvs, "status"),
      architectureStates: countBy(assessment.architecture, "state"),
      riskClassifications: countBy(assessment.risks, "classification"),
      productionVerified: false,
      editorialBlockersAreVulnerabilities: false,
    },
    evidence: assessment.evidence,
    controls: assessment.controls,
    stride: assessment.stride,
    mitre: assessment.mitre,
    asvs: assessment.asvs,
    owaspTop10: assessment.owaspTop10,
    architecture: assessment.architecture,
    risks: assessment.risks,
    limitations: [
      "Üretim dağıtımı veya canlı müdahale davranışı bağımsız doğrulanmadı; boş deployment sorgusu dağıtım olmadığı anlamına gelmez.",
      "GitHub dal koruması API'si 404 döndürdü; durum NOT_VERIFIED olarak bırakıldı, koruma yok denmedi.",
      "PR #71, #73 ve #74 açık; bunların uygulama/yapılandırma kanıtları PR_ONLY durumundadır ve etkin/üretim kontrolü sayılamaz.",
      "PR #72 birleştirildi ve CSP değişikliği entegre kaynakta bulunuyor; dağıtılmış yanıt gözlemlenmedi.",
      "PR #71'de bildirilen 302 insan incelemesi bulgusu editoryal yayın kapısıdır; güvenlik açığı sayısı değildir.",
      "Bu, sınırlı kanıt değerlendirmesidir; tam sızma testi, eksiksiz kod denetimi, ASVS doğrulaması veya sertifikasyon değildir.",
    ],
  };
}

export function validateReportShape(report, schema) {
  const issues = [];
  if (!isRecord(report) || !isRecord(schema) || schema.type !== "object" || !Array.isArray(schema.required)) {
    return ["Report JSON Schema is malformed."];
  }
  for (const key of schema.required) if (!(key in report)) issues.push(`Report is missing required property ${key}.`);
  if (report.schemaVersion !== schema.properties?.schemaVersion?.const) issues.push("Report schemaVersion does not match the schema.");
  for (const [key, minItems] of [["controls", 99], ["stride", 1], ["mitre", 1], ["asvs", 1], ["owaspTop10", 10], ["architecture", 1], ["risks", 1]]) {
    if (!Array.isArray(report[key]) || report[key].length < minItems) issues.push(`Report ${key} must contain at least ${minItems} item(s).`);
  }
  if (report.controls?.length !== 99) issues.push("Report controls must contain exactly 99 items.");
  if (report.owaspTop10?.length !== 10) issues.push("Report OWASP Top 10 mapping must contain exactly 10 items.");
  for (const [index, control] of (report.controls ?? []).entries()) {
    if (!isRecord(control) || control.id !== index + 1 || !nonEmpty(control.name)) issues.push(`Report control ${index + 1} has invalid identity/order.`);
    if (!CONTROL_STATES.has(control?.state)) issues.push(`Report control ${index + 1} has an invalid state.`);
    if (!Array.isArray(control?.evidenceIds)) issues.push(`Report control ${index + 1} evidenceIds must be an array.`);
  }
  for (const [index, requirement] of (report.asvs ?? []).entries()) {
    if (!ASVS_STATUSES.has(requirement?.status)) issues.push(`Report ASVS item ${index + 1} has an invalid status.`);
    if (!ASVS_IDS.has(requirement?.id)) issues.push(`Report ASVS item ${index + 1} has an invalid requirement id.`);
  }
  for (const [index, layer] of (report.architecture ?? []).entries()) {
    if (!ARCHITECTURE_STATES.has(layer?.state)) issues.push(`Report architecture layer ${index + 1} has an invalid state.`);
  }
  if (report.summary?.controlCount !== 99) issues.push("Report summary must count exactly 99 controls.");
  return issues;
}

function tableRow(values) {
  return `| ${values.map((value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ")).join(" | ")} |`;
}

export function renderMarkdown(report) {
  const evidence = new Map(report.evidence.map((item) => [item.id, item]));
  const pullRequests = [...new Map(report.evidence
    .filter((item) => item.kind === "pull_request")
    .map((item) => [item.number, item])).values()]
    .sort((left, right) => left.number - right.number);
  const controlCounts = Object.entries(report.summary.controlStates)
    .map(([state, count]) => `${state}: ${count}`)
    .join(" · ");
  const lines = [
    "# Tehdit istihbaratı ve güvenlik güvencesi",
    "",
    `- **Tarih:** ${report.assessmentDate}`,
    `- **Depo / taban:** \`${report.repository}\` · \`${report.basis.branch}\` @ \`${report.basis.commit}\``,
    "- **Kapsam:** Entegre uygulama kodu ve doğrulanabilir depo/GitHub kanıtı; üretim ortamı doğrulanmadı.",
    "- **Uygunluk:** Bu rapor ASVS doğrulaması veya sertifikasyon iddiası değildir.",
    "",
    "## Özet",
    "",
    `99 kontrol: ${controlCounts}.`,
    "",
    `ASVS durumları: ${Object.entries(report.summary.asvsStatuses).map(([state, count]) => `${state}: ${count}`).join(" · ")}.`,
    "",
    "ATT&CK, ASVS ve OWASP Top 10 eşlemeleri yalnız ilgili saldırı yüzeylerine uygulanır; katalog eşlemesi saldırı bulgusu veya uygunluk sertifikası değildir.",
    "",
    "## Mimari durum",
    "",
    "| Katman | Durum | Kanıt yorumu |",
    "|---|---|---|",
    ...report.architecture.map((item) => tableRow([item.layer, item.state, item.note])),
    "",
    "## STRIDE",
    "",
  ];

  const strideNames = {
    Spoofing: "Spoofing (Kimliğe bürünme)",
    Tampering: "Tampering (Veri değişikliği)",
    Repudiation: "Repudiation (İnkâr edilebilirlik)",
    "Information Disclosure": "Information Disclosure (Bilgi ifşası)",
    "Denial of Service": "Denial of Service (Hizmet engelleme)",
    "Elevation of Privilege": "Elevation of Privilege (Yetki yükseltme)",
  };
  for (const threat of report.stride) {
    lines.push(
      `### ${strideNames[threat.category] ?? threat.category}`,
      "",
      `- **Varlık:** ${threat.asset}`,
      `- **Giriş noktası:** ${threat.entryPoint}`,
      `- **Güven sınırı:** ${threat.trustBoundary}`,
      `- **Tehdit davranışı:** ${threat.threatBehavior}`,
      `- **Mevcut kontrol:** ${threat.currentControl}`,
      `- **Eksik kontrol:** ${threat.missingControl}`,
      `- **Etki / olasılık / risk:** ${threat.impact} / ${threat.likelihood} / ${threat.risk} (risk kaydı: ${threat.riskId})`,
      `- **Doğrulama:** ${threat.verification}`,
      `- **Sorumlu:** ${threat.owner}`,
      "",
    );
  }

  lines.push(
    "## MITRE ATT&CK v20.0",
    "",
    `Resmî sürüm kaynağı: ${report.standards.mitreAttack.url}. Eşleme teknikleri uygulama kapsamına göre seçilmiştir; katalog kaydı tek başına saldırı bulgusu değildir.`,
    "",
    "| Teknik | Uygulanabilirlik | Kontrol durumu | Kanıt | Boşluk | Düzeltme |",
    "|---|---|---|---|---|---|",
    ...report.mitre.map((item) => tableRow([
      `[${item.id} ${item.name}](${item.url})`,
      item.applicability,
      item.controlState,
      item.evidenceIds.join(", "),
      item.gaps,
      item.remediation,
    ])),
    "",
    "## OWASP ASVS 5.0.0",
    "",
    `Resmî sürüm kaynağı: ${report.standards.owaspAsvs.releaseUrl}. Her durum yalnız listelenen kanıt kapsamıyla sınırlıdır; sertifikasyon iddiası yoktur.`,
    "",
    "| Gereksinim | Konu | Durum | Kanıt | Boşluk | Düzeltme |",
    "|---|---|---|---|---|---|",
    ...report.asvs.map((item) => tableRow([
      `[${item.id}](${report.standards.owaspAsvs.releaseUrl})`,
      item.topic,
      item.status,
      item.evidenceIds.join(", "),
      item.gap,
      item.remediation,
    ])),
    "",
    "## OWASP Top 10:2025",
    "",
    `Resmî kaynak: ${report.standards.owaspTop10.url}.`,
    "",
    "| Kategori | Durum | Kanıtla sınırlı değerlendirme |",
    "|---|---|---|",
    ...report.owaspTop10.map((item) => tableRow([`${item.id} ${item.name}`, item.status, item.note])),
    "",
    "## Bağımsız 99 kontrol eşlemesi",
    "",
    `Kaynak adları ve sırası [PR #71 özgün listesi](${report.controlSource.url}) ile doğrulanır (SHA-256: \`${report.controlSource.sha256}\`); aşağıdaki durum/kanıt değerlendirmesi bağımsızdır. \`ACTIVE\`, entegre kaynak kodunda gözlenen kontrolü ifade eder; üretimde etkin olduğu anlamına gelmez.`,
    "",
    "| # | Kontrol | Durum | Uygulanabilirlik | Mevcut kanıt | Boşluk | Sonraki adım |",
    "|---:|---|---|---|---|---|---|",
    ...report.controls.map((item) => tableRow([
      item.id,
      item.name,
      item.state,
      item.applicability,
      item.evidenceIds.map((id) => evidence.get(id)?.path ?? evidence.get(id)?.url ?? id).join(", ") || "Doğrulanmış kanıt yok",
      item.gap,
      item.remediation,
    ])),
    "",
    "## Riskler",
    "",
    "Teknik, operasyonel ve editoryal riskler ayrı başlıklarda tutulur. Teknik/operasyonel risk derecesi nitel etki-olasılık matrisiyle belirlenir; `UNASSESSED` olasılığın kanıtla tahmin edilemediğini gösterir.",
    "",
  );
  for (const [classification, heading] of [
    ["TECHNICAL", "Teknik riskler"],
    ["OPERATIONAL", "Operasyonel riskler"],
    ["EDITORIAL", "Editoryal yayın kapısı (güvenlik açığı değildir)"],
  ]) {
    const risks = report.risks.filter((risk) => risk.classification === classification);
    if (risks.length === 0) continue;
    lines.push(
      `### ${heading}`,
      "",
      "| Risk | Etki | Olasılık | Derece | Gerekçe | Azaltım |",
      "|---|---|---|---|---|---|",
      ...risks.map((risk) => tableRow([
        risk.title,
        risk.impact,
        risk.likelihood,
        risk.risk,
        risk.riskRationale,
        risk.mitigation,
      ])),
      "",
    );
  }

  lines.push(
    "## GitHub PR ve CI durumu",
    "",
    "| PR | Durum | Gözlem |",
    "|---|---|---|",
    ...pullRequests.map((pr) => {
      const notes = report.evidence.filter((item) => item.kind === "pull_request" && item.number === pr.number).map((item) => item.note);
      return tableRow([`[#${pr.number}](${pr.url})`, pr.state, [...new Set(notes)].join(" ")]);
    }),
    "",
    "## Kanıt sınırlamaları",
    "",
    ...report.limitations.map((item) => `- ${item}`),
    "",
    "### Kanıt envanteri",
    "",
    "| Kimlik | Tür/durum | Kaynak | Not |",
    "|---|---|---|---|",
    ...report.evidence.map((item) => tableRow([
      item.id,
      item.kind === "pull_request" ? `${item.state} / ${item.evidenceState}` : item.state,
      item.path ?? item.url ?? item.id,
      item.note,
    ])),
    "",
  );
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

export function renderArchitecture(report) {
  const state = new Map(report.architecture.map((item) => [item.layer, item.state]));
  return [
    "# Mevcut ve hedef güvenlik mimarisi",
    "",
    `Değerlendirme tarihi: ${report.assessmentDate}. ` +
      "`ACTIVE` entegre kod kanıtıdır, üretim doğrulaması değildir. `TEMPLATE` açık PR kanıtı, `MISSING` mevcut olmayan katman, `NOT_VERIFIED` doğrulanamayan altyapı demektir.",
    "",
    "```mermaid",
    "flowchart TB",
    `  visitor["Ziyaretçi / tarayıcı<br/>${state.get("Visitor")}"] --> app["Next.js App Router<br/>${state.get("Application")}"]`,
    `  edge["CDN / WAF<br/>${state.get("CDN/WAF")}"] -. "PR #73 şablon; dağıtım doğrulanmadı" .-> app`,
    `  infra["Altyapı<br/>${state.get("Infrastructure")}"] -. "PR #73 şablonlar" .-> app`,
    `  app --> data["Depo JSON / dosya tabanlı veri<br/>${state.get("Data integrity")}"]`,
    `  identity["IdP / oturum<br/>${state.get("Identity")}"] -. "kayıtlı sağlayıcı yok" .-> app`,
    `  app --> logs["Günlükleme / izleme<br/>${state.get("Monitoring")}"]`,
    `  blackout["PROJECT BLACKOUT<br/>${state.get("BLACKOUT")}"] -. "PR #71, entegre değil" .-> app`,
    `  backup["Yedek / kurtarma<br/>${state.get("Backup/recovery")}"] -. "yerel araç; WORM/DR doğrulanmadı" .-> data`,
    "```",
    "",
    "| Katman | Durum | Bugünkü kanıt |",
    "|---|---|---|",
    ...report.architecture.map((item) => tableRow([item.layer, item.state, item.note])),
    "",
    "## Sınırlar",
    "",
    "- Uygulama bugün Next.js tabanlı, ağırlıklı olarak herkese açık ve salt-okunur içerik sunar; veritabanı, canlı IdP ve yönetim oturumu doğrulanmamıştır.",
    "- PR #71, #73 ve #74 açık kaldığı sürece bunların kodu, altyapısı veya test laboratuvarı entegre/aktif/üretim kanıtı değildir.",
    "- Bu diagram üretim dağıtımı veya ağ keşfi iddiası taşımaz.",
    "",
  ].join("\n");
}
